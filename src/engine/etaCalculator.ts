import type { Line } from '../data/types';
import type { Direction } from './types';
import { haversineMeters } from './geo';

export interface JourneyMetrics {
  lastConfirmedStationOrder: number;
  nextStationOrder: number | null;
  stopsRemaining: number;
  distanceRemainingMeters: number;
  etaSeconds: number;
  /** ETA to just the next station (not the full destination) — used to drive adaptive GPS polling. */
  etaToNextStationSeconds: number;
}

/**
 * Computes remaining stops/distance/ETA between a continuous position along
 * the line (segmentIndex + fraction, always spatial: 0 = at
 * stationIdsInOrder[segmentIndex], 1 = at stationIdsInOrder[segmentIndex+1])
 * and a destination station's order index, given the journey's fixed
 * travel direction (set once at journey start from boarding→destination).
 */
export function computeJourneyMetrics(
  line: Line,
  currentPosition: number,
  destinationOrder: number,
  travelDirection: Direction,
  currentSpeedKmh: number,
): JourneyMetrics {
  const segIndex = Math.min(Math.floor(currentPosition), line.segments.length - 1);
  const fraction = currentPosition - segIndex;
  const seg = line.segments[segIndex];

  const forward = travelDirection !== 'backward';
  // fraction is purely spatial (0 = at stationIdsInOrder[segIndex], 1 = at
  // stationIdsInOrder[segIndex+1]) regardless of direction, so "last
  // confirmed" only advances to segIndex+1 once fraction actually reaches
  // that far — otherwise the train has only confirmed segIndex so far.
  const lastConfirmedStationOrder = forward
    ? segIndex + (fraction >= 1 ? 1 : 0)
    : segIndex + (fraction <= 0 ? 0 : 1);
  const nextStationOrder = forward
    ? Math.min(segIndex + 1, line.stationIdsInOrder.length - 1)
    : Math.max(segIndex, 0);

  const stopsRemaining = Math.max(
    0,
    forward ? destinationOrder - lastConfirmedStationOrder : lastConfirmedStationOrder - destinationOrder,
  );

  const immediateRemainingFraction = forward ? 1 - fraction : fraction;
  let distanceRemainingMeters = seg.distanceMeters * immediateRemainingFraction;

  const speedMps = currentSpeedKmh > 3 ? (currentSpeedKmh * 1000) / 3600 : null;
  const etaToNextStationSeconds = speedMps
    ? distanceRemainingMeters / speedMps
    : seg.avgTravelTimeSeconds * immediateRemainingFraction;
  let etaSeconds = etaToNextStationSeconds;

  if (forward) {
    for (let idx = segIndex + 1; idx < destinationOrder; idx++) {
      const s = line.segments[idx];
      distanceRemainingMeters += s.distanceMeters;
      etaSeconds += s.avgTravelTimeSeconds;
    }
  } else {
    for (let idx = segIndex - 1; idx >= destinationOrder; idx--) {
      const s = line.segments[idx];
      distanceRemainingMeters += s.distanceMeters;
      etaSeconds += s.avgTravelTimeSeconds;
    }
  }

  let etaToNextStationSecondsFinal = etaToNextStationSeconds;
  if (stopsRemaining === 0) {
    distanceRemainingMeters = 0;
    etaSeconds = 0;
    etaToNextStationSecondsFinal = 0;
  }

  return {
    lastConfirmedStationOrder,
    nextStationOrder,
    stopsRemaining,
    distanceRemainingMeters: Math.max(0, Math.round(distanceRemainingMeters)),
    etaSeconds: Math.max(0, Math.round(etaSeconds)),
    etaToNextStationSeconds: Math.max(0, Math.round(etaToNextStationSecondsFinal)),
  };
}

const SPEED_WINDOW_SIZE = 5;

/**
 * Smooths instantaneous speed into a short moving average, using the
 * platform-provided speed when available and falling back to
 * displacement/time between fixes otherwise.
 */
export class SpeedSmoother {
  private samplesKmh: number[] = [];
  private lastFix: { lat: number; lng: number; timestamp: number } | null = null;

  addFix(fix: { lat: number; lng: number; timestamp: number; speedMps?: number }): number {
    let instantKmh: number | null = null;

    if (typeof fix.speedMps === 'number' && fix.speedMps >= 0) {
      instantKmh = fix.speedMps * 3.6;
    } else if (this.lastFix) {
      const dtSeconds = (fix.timestamp - this.lastFix.timestamp) / 1000;
      if (dtSeconds > 0) {
        const distanceMeters = haversineMeters(this.lastFix, fix);
        instantKmh = (distanceMeters / dtSeconds) * 3.6;
      }
    }

    this.lastFix = { lat: fix.lat, lng: fix.lng, timestamp: fix.timestamp };

    if (instantKmh !== null) {
      this.samplesKmh.push(instantKmh);
      if (this.samplesKmh.length > SPEED_WINDOW_SIZE) this.samplesKmh.shift();
    }

    return this.currentKmh();
  }

  currentKmh(): number {
    if (this.samplesKmh.length === 0) return 0;
    return this.samplesKmh.reduce((a, b) => a + b, 0) / this.samplesKmh.length;
  }

  reset(): void {
    this.samplesKmh = [];
    this.lastFix = null;
  }
}
