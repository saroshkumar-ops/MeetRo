import type { Line, Station } from '../data/types';
import type { Direction, LocationFix, LocationProvider } from '../engine/types';

export interface MockLocationProviderOptions {
  line: Line;
  stationsById: Record<string, Station>;
  /** Station to start the simulated ride from. Defaults to the line's first terminus. */
  startStationId?: string;
  direction?: Direction;
  /** Simulated train speed, used both for realism and to derive travel pacing alongside each segment's avgTravelTimeSeconds. */
  trainSpeedKmh?: number;
  /** 1 = real-time, 10 = ten minutes of travel compressed into one minute, etc. */
  playbackSpeedMultiplier?: number;
  /** Station ids whose adjoining segments should have fixes suppressed, simulating a GPS-dead underground stretch. */
  deadZoneStationIds?: Set<string>;
  accuracyMeters?: number;
}

/**
 * Simulates a train travelling along a bundled line's real station sequence
 * at a configurable pace, optionally suppressing fixes near "dead zone"
 * stations to exercise the engine's dead-reckoning fallback. Implements the
 * same LocationProvider interface RealLocationProvider does, so the engine,
 * notification layer, and UI are unaware they're not reading real GPS.
 */
export class MockLocationProvider implements LocationProvider {
  private readonly line: Line;
  private readonly stationsById: Record<string, Station>;
  private readonly direction: Direction;
  private readonly trainSpeedKmh: number;
  private readonly playbackSpeedMultiplier: number;
  private readonly deadZoneStationIds: Set<string>;
  private readonly accuracyMeters: number;

  private startSegmentIndex: number;
  private startFraction: number;

  private onFixCb: ((fix: LocationFix) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private intervalMs = 3000;
  private playbackStartWallClockMs = 0;
  private finished = false;

  constructor(options: MockLocationProviderOptions) {
    this.line = options.line;
    this.stationsById = options.stationsById;
    this.direction = options.direction ?? 'forward';
    this.trainSpeedKmh = options.trainSpeedKmh ?? 34;
    this.playbackSpeedMultiplier = options.playbackSpeedMultiplier ?? 1;
    this.deadZoneStationIds = options.deadZoneStationIds ?? new Set();
    this.accuracyMeters = options.accuracyMeters ?? 8;

    const startId = options.startStationId ?? this.line.stationIdsInOrder[0];
    const startIndex = this.line.stationIdsInOrder.indexOf(startId);
    if (startIndex === -1) {
      throw new Error(`startStationId "${startId}" is not on line "${this.line.id}"`);
    }
    this.startSegmentIndex = this.direction === 'backward' ? Math.max(0, startIndex - 1) : Math.min(startIndex, this.line.segments.length - 1);
    this.startFraction = this.direction === 'backward' ? 1 : 0;
  }

  start(onFix: (fix: LocationFix) => void): void {
    this.onFixCb = onFix;
    this.playbackStartWallClockMs = Date.now();
    this.finished = false;
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onFixCb = null;
  }

  setDesiredIntervalMs(ms: number): void {
    this.intervalMs = ms;
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      this.emit();
      if (!this.finished) this.scheduleNext();
    }, this.intervalMs);
  }

  private emit(): void {
    if (!this.onFixCb || this.finished) return;

    const now = Date.now();
    const wallElapsedSeconds = (now - this.playbackStartWallClockMs) / 1000;
    const simulatedElapsedSeconds = wallElapsedSeconds * this.playbackSpeedMultiplier;

    const walked = this.walk(simulatedElapsedSeconds);
    if (walked === 'arrived-terminus') {
      this.finished = true;
      const terminusStationId =
        this.direction === 'backward' ? this.line.stationIdsInOrder[0] : this.line.stationIdsInOrder[this.line.stationIdsInOrder.length - 1];
      const station = this.stationsById[terminusStationId];
      if (station) {
        this.onFixCb({
          lat: station.lat,
          lng: station.lng,
          accuracyMeters: this.accuracyMeters,
          speedMps: 0,
          timestamp: now,
        });
      }
      return;
    }

    const { segmentIndex, fraction } = walked;
    if (this.inDeadZone(segmentIndex)) return; // simulate lost GPS signal, emit nothing this tick

    const from = this.stationsById[this.line.stationIdsInOrder[segmentIndex]];
    const to = this.stationsById[this.line.stationIdsInOrder[segmentIndex + 1]];
    if (!from || !to) return;

    this.onFixCb({
      lat: from.lat + (to.lat - from.lat) * fraction,
      lng: from.lng + (to.lng - from.lng) * fraction,
      accuracyMeters: this.accuracyMeters,
      speedMps: (this.trainSpeedKmh * 1000) / 3600,
      timestamp: now,
    });
  }

  /** A segment counts as "dead zone" only when BOTH its endpoints are underground stations — so the transition segments at the tunnel's mouth still see GPS, matching real behavior. */
  private inDeadZone(segmentIndex: number): boolean {
    if (this.deadZoneStationIds.size === 0) return false;
    const seg = this.line.segments[segmentIndex];
    return this.deadZoneStationIds.has(seg.fromStationId) && this.deadZoneStationIds.has(seg.toStationId);
  }

  /**
   * Walks forward/backward from the start position by `elapsedSeconds`,
   * consuming each segment's avgTravelTimeSeconds in full — unlike the
   * engine's dead-reckoning fallback, this represents ground truth for the
   * simulation and is allowed to reach an exact station (fraction 0 or 1),
   * including the line's terminus.
   */
  private walk(elapsedSeconds: number): { segmentIndex: number; fraction: number } | 'arrived-terminus' {
    const forward = this.direction !== 'backward';
    let segmentIndex = this.startSegmentIndex;
    let fraction = this.startFraction;
    let remaining = elapsedSeconds;

    while (remaining > 0) {
      const seg = this.line.segments[segmentIndex];
      if (!seg) return 'arrived-terminus';

      const remainingFractionInSeg = forward ? 1 - fraction : fraction;
      const remainingSecondsInSeg = seg.avgTravelTimeSeconds * remainingFractionInSeg;

      if (remaining < remainingSecondsInSeg) {
        const consumedFraction = remaining / seg.avgTravelTimeSeconds;
        fraction = forward ? fraction + consumedFraction : fraction - consumedFraction;
        remaining = 0;
        break;
      }

      remaining -= remainingSecondsInSeg;
      const nextSegmentIndex = forward ? segmentIndex + 1 : segmentIndex - 1;
      if (nextSegmentIndex < 0 || nextSegmentIndex >= this.line.segments.length) {
        return 'arrived-terminus';
      }
      segmentIndex = nextSegmentIndex;
      fraction = forward ? 0 : 1;
    }

    return { segmentIndex, fraction };
  }
}
