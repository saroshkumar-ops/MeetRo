import type { Line, Station } from '../data/types';
import type { Direction, EngineState, LocationFix, LocationProvider } from './types';
import { findNearestSegment } from './nearestStation';
import { DirectionTracker } from './directionDetection';
import {
  advanceDeadReckoning,
  isFixStaleOrUntrusted,
  MIN_TRUSTED_CONFIDENCE,
  type PositionAnchor,
} from './deadReckoning';
import { computeJourneyMetrics, SpeedSmoother } from './etaCalculator';
import { AlertStateMachine, type AlertTransitionEvent } from './alertStateMachine';
import { desiredIntervalMs, WIDE_INTERVAL_MS } from './pollingPolicy';

/** Perpendicular distance from the line beyond which a fix counts toward "exited corridor". */
const CORRIDOR_EXIT_METERS = 400;
/** Consecutive trusted fixes that far off the line before we conclude the journey ended. */
const CORRIDOR_EXIT_STREAK_THRESHOLD = 5;
/** How often the internal ticker re-evaluates state even with no new GPS fix. */
const TICK_INTERVAL_MS = 1000;

function clampIndex(order: number, line: Line): number {
  return Math.max(0, Math.min(line.stationIdsInOrder.length - 1, order));
}

export class JourneyEngine {
  private readonly destinationOrder: number;

  private anchor: PositionAnchor | null = null;
  private boardingOrder: number | null = null;
  private travelDirection: Direction = 'unknown';
  private lastTrustedFixTimestamp: number | null = null;
  private lastConfidence = 0;
  private lastPerpendicularDistanceMeters = 0;
  private corridorExitStreak = 0;

  private readonly directionTracker = new DirectionTracker();
  private readonly speedSmoother = new SpeedSmoother();
  private readonly alertMachine = new AlertStateMachine();

  private listeners: Array<(state: EngineState) => void> = [];
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private latestState: EngineState | null = null;

  constructor(
    private readonly line: Line,
    private readonly stationsById: Record<string, Station>,
    private readonly destinationStationId: string,
    private readonly locationProvider: LocationProvider,
    private readonly clock: () => number = Date.now,
  ) {
    const order = line.stationIdsInOrder.indexOf(destinationStationId);
    if (order === -1) {
      throw new Error(`Destination "${destinationStationId}" is not on line "${line.id}"`);
    }
    this.destinationOrder = order;
  }

  start(): void {
    this.locationProvider.start(fix => this.handleFix(fix));
    this.tickHandle = setInterval(() => this.runTick(this.clock()), TICK_INTERVAL_MS);
  }

  stop(): void {
    this.locationProvider.stop();
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  onUpdate(listener: (state: EngineState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onAlertTransition(listener: (event: AlertTransitionEvent) => void): () => void {
    return this.alertMachine.onTransition(listener);
  }

  getState(): EngineState | null {
    return this.latestState;
  }

  /** Station-order index the journey started from, once the first GPS fix has bootstrapped it. */
  getBoardingOrder(): number | null {
    return this.boardingOrder;
  }

  getDestinationOrder(): number {
    return this.destinationOrder;
  }

  private handleFix(fix: LocationFix): void {
    const match = findNearestSegment(fix, this.line, this.stationsById);
    if (!match) return;

    const now = fix.timestamp;
    this.lastConfidence = match.confidence;
    this.lastPerpendicularDistanceMeters = match.perpendicularDistanceMeters;

    if (this.anchor === null) {
      const boardingOrder = clampIndex(Math.round(match.segmentIndex + match.fraction), this.line);
      this.boardingOrder = boardingOrder;
      this.travelDirection = this.destinationOrder < boardingOrder ? 'backward' : 'forward';
      this.anchor = { segmentIndex: match.segmentIndex, fraction: match.fraction, timestamp: now };
      this.lastTrustedFixTimestamp = now;
      this.speedSmoother.addFix(fix);
      this.locationProvider.setDesiredIntervalMs(WIDE_INTERVAL_MS);
      this.runTick(now);
      return;
    }

    if (match.confidence >= MIN_TRUSTED_CONFIDENCE) {
      this.anchor = { segmentIndex: match.segmentIndex, fraction: match.fraction, timestamp: now };
      this.lastTrustedFixTimestamp = now;
      this.speedSmoother.addFix(fix);

      this.corridorExitStreak =
        match.perpendicularDistanceMeters > CORRIDOR_EXIT_METERS ? this.corridorExitStreak + 1 : 0;
    }

    this.runTick(now);
  }

  private runTick(now: number): void {
    if (this.anchor === null || this.boardingOrder === null) return;

    const dr = advanceDeadReckoning(this.anchor, now, this.line, this.travelDirection);
    const currentPosition = dr.segmentIndex + dr.fraction;

    const source = isFixStaleOrUntrusted(this.lastTrustedFixTimestamp, now, this.lastConfidence)
      ? 'dead-reckoning'
      : 'gps';

    this.directionTracker.addSample(currentPosition, now);
    const liveDirection = this.directionTracker.getDirection();
    const movingAway =
      liveDirection !== 'unknown' && this.travelDirection !== 'unknown' && liveDirection !== this.travelDirection;
    const wrongDirectionWarning = this.directionTracker.trackDestinationProgress(movingAway);

    const speedKmh = this.speedSmoother.currentKmh();
    const metrics = computeJourneyMetrics(
      this.line,
      currentPosition,
      this.destinationOrder,
      this.travelDirection,
      speedKmh,
    );

    const arrivalConfirmed = source === 'gps' && metrics.stopsRemaining === 0;

    if (this.corridorExitStreak >= CORRIDOR_EXIT_STREAK_THRESHOLD) {
      this.alertMachine.forceExitCorridor(now);
    } else {
      this.alertMachine.update(metrics.stopsRemaining, arrivalConfirmed, now);
    }

    this.locationProvider.setDesiredIntervalMs(desiredIntervalMs(metrics.etaToNextStationSeconds));

    const state: EngineState = {
      direction: this.travelDirection,
      match: {
        segmentIndex: dr.segmentIndex,
        fraction: dr.fraction,
        confidence: this.lastConfidence,
        perpendicularDistanceMeters: this.lastPerpendicularDistanceMeters,
        source,
      },
      lastConfirmedStationId: this.line.stationIdsInOrder[clampIndex(metrics.lastConfirmedStationOrder, this.line)],
      nextStationId:
        metrics.nextStationOrder !== null
          ? this.line.stationIdsInOrder[clampIndex(metrics.nextStationOrder, this.line)]
          : null,
      stopsRemaining: metrics.stopsRemaining,
      distanceRemainingMeters: metrics.distanceRemainingMeters,
      currentSpeedKmh: Math.round(speedKmh * 10) / 10,
      etaSeconds: metrics.etaSeconds,
      alertState: this.alertMachine.getState(),
      wrongDirectionWarning,
      timestamp: now,
    };

    this.latestState = state;
    for (const listener of this.listeners) listener(state);
  }
}
