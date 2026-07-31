import type { Station, Line } from '../data/types';
import type { LocationFix, MatchResult } from './types';
import { projectPointOntoSegment } from './geo';

/** Beyond this combined (perpendicular distance + GPS accuracy), treat the fix as untrustworthy. */
const MAX_TRUST_DISTANCE_METERS = 150;
/** GPS accuracy worse than this alone caps confidence, regardless of position. */
const MAX_TRUST_ACCURACY_METERS = 100;

/**
 * Projects a GPS fix onto every segment of `line` and returns the
 * best (lowest perpendicular-distance) match, with a confidence score
 * derived from that distance and the fix's own accuracy.
 */
export function findNearestSegment(
  fix: LocationFix,
  line: Line,
  stationsById: Record<string, Station>,
): MatchResult | null {
  let best: { segmentIndex: number; fraction: number; perpendicularDistanceMeters: number } | null = null;

  for (let segmentIndex = 0; segmentIndex < line.segments.length; segmentIndex++) {
    const seg = line.segments[segmentIndex];
    const from = stationsById[seg.fromStationId];
    const to = stationsById[seg.toStationId];
    if (!from || !to) continue;

    const { fraction, perpendicularDistanceMeters } = projectPointOntoSegment(
      { lat: fix.lat, lng: fix.lng },
      { lat: from.lat, lng: from.lng },
      { lat: to.lat, lng: to.lng },
    );

    if (!best || perpendicularDistanceMeters < best.perpendicularDistanceMeters) {
      best = { segmentIndex, fraction, perpendicularDistanceMeters };
    }
  }

  if (!best) return null;

  const accuracyPenalty = Math.min(1, fix.accuracyMeters / MAX_TRUST_ACCURACY_METERS);
  const distancePenalty = Math.min(
    1,
    (best.perpendicularDistanceMeters + fix.accuracyMeters) / MAX_TRUST_DISTANCE_METERS,
  );
  const confidence = Math.max(0, 1 - Math.max(accuracyPenalty, distancePenalty));

  return {
    segmentIndex: best.segmentIndex,
    fraction: best.fraction,
    perpendicularDistanceMeters: best.perpendicularDistanceMeters,
    confidence,
    source: 'gps',
  };
}
