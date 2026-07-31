import type { Line } from '../data/types';
import type { Direction } from './types';

/** No trustworthy GPS fix for longer than this triggers the dead-reckoning fallback. */
export const GPS_STALE_MS = 9000;
/** A fix below this confidence (see nearestStation.ts) is not trusted even if fresh. */
export const MIN_TRUSTED_CONFIDENCE = 0.35;
/**
 * Dead reckoning can approach but never claim arrival at the next station —
 * only a real (or re-acquired) GPS fix, or the alert state machine's own
 * arrival-dwell check, may confirm a station has actually been reached.
 */
export const DEAD_RECKONING_MAX_FRACTION = 0.95;

export function isFixStaleOrUntrusted(
  lastTrustedFixTimestamp: number | null,
  now: number,
  latestConfidence: number,
): boolean {
  if (lastTrustedFixTimestamp === null) return true;
  const stale = now - lastTrustedFixTimestamp > GPS_STALE_MS;
  return stale || latestConfidence < MIN_TRUSTED_CONFIDENCE;
}

/**
 * Estimates progress (0-1) along a segment purely from elapsed time and
 * that segment's known average travel time — used while GPS is lost, e.g.
 * in underground stretches.
 */
export function estimateFraction(elapsedSeconds: number, avgTravelTimeSeconds: number): number {
  if (avgTravelTimeSeconds <= 0) return 0;
  const raw = elapsedSeconds / avgTravelTimeSeconds;
  return Math.max(0, Math.min(DEAD_RECKONING_MAX_FRACTION, raw));
}

export interface PositionAnchor {
  segmentIndex: number;
  /** 0-1, spatial: 0 = at stationIdsInOrder[segmentIndex], 1 = at stationIdsInOrder[segmentIndex+1]. */
  fraction: number;
  timestamp: number;
}

/**
 * Projects a trusted GPS anchor forward to `now` using only elapsed time and
 * each segment's known average travel time. Walks across as many segment
 * boundaries as the elapsed time implies (so a long GPS outage still keeps
 * the stop count advancing), but always caps the final in-progress segment
 * short of an unconfirmed "arrival" — only a real GPS re-fix (or the alert
 * state machine's own dwell check) may confirm a station has been reached.
 *
 * When `now` is very close to `anchor.timestamp` (i.e. this was just called
 * right after a trusted fix), this returns the anchor's own position
 * unchanged — so callers can run this unconditionally on every tick without
 * branching between "GPS mode" and "dead-reckoning mode".
 */
export function advanceDeadReckoning(
  anchor: PositionAnchor,
  now: number,
  line: Line,
  direction: Direction,
): { segmentIndex: number; fraction: number } {
  const forward = direction !== 'backward';
  let segmentIndex = anchor.segmentIndex;
  let fraction = anchor.fraction;
  const initialElapsedSeconds = Math.max(0, (now - anchor.timestamp) / 1000);
  let elapsedSeconds = initialElapsedSeconds;
  // True only if we ran off the end of the line while already sitting
  // exactly at that boundary (nothing left to extrapolate) — as opposed to
  // reaching it purely through time-based guessing, which stays capped.
  let atConfirmedAbsoluteTerminus = false;

  while (elapsedSeconds > 0) {
    const seg = line.segments[segmentIndex];
    if (!seg) break;

    const remainingFractionInSeg = forward ? 1 - fraction : fraction;
    const remainingSecondsInSeg = seg.avgTravelTimeSeconds * remainingFractionInSeg;

    if (remainingSecondsInSeg > 0 && elapsedSeconds < remainingSecondsInSeg) {
      const consumedFraction = elapsedSeconds / seg.avgTravelTimeSeconds;
      fraction = forward ? fraction + consumedFraction : fraction - consumedFraction;
      elapsedSeconds = 0;
      break;
    }

    elapsedSeconds -= remainingSecondsInSeg;
    const nextSegmentIndex = forward ? segmentIndex + 1 : segmentIndex - 1;

    if (nextSegmentIndex < 0 || nextSegmentIndex >= line.segments.length) {
      // Ran off the end of the line (dead reckoning past the terminus) — clamp.
      fraction = forward ? 1 : 0;
      atConfirmedAbsoluteTerminus = remainingSecondsInSeg === 0;
      break;
    }

    segmentIndex = nextSegmentIndex;
    fraction = forward ? 0 : 1;
  }

  // Only cap when time was actually extrapolated into genuine uncertainty.
  // With zero elapsed time, or when the anchor was already sitting exactly
  // at the line's absolute terminus, this echoes a real confirmed position
  // rather than a guess, so it must not be walked back below it.
  if (initialElapsedSeconds > 0 && !atConfirmedAbsoluteTerminus) {
    fraction = forward
      ? Math.min(fraction, DEAD_RECKONING_MAX_FRACTION)
      : Math.max(fraction, 1 - DEAD_RECKONING_MAX_FRACTION);
  }

  return { segmentIndex, fraction };
}
