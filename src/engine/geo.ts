const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return EARTH_RADIUS_METERS * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Projects `point` onto the great-circle segment from `segStart` to
 * `segEnd`, approximating the segment as flat (fine at metro-line scale).
 * Returns the fraction along the segment (clamped to [0, 1]) and the
 * perpendicular distance from the point to that projected location.
 */
export function projectPointOntoSegment(
  point: LatLng,
  segStart: LatLng,
  segEnd: LatLng,
): { fraction: number; perpendicularDistanceMeters: number } {
  // Convert to a local flat-earth approximation (meters) around segStart,
  // which is accurate enough over inter-station distances (a few km).
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(toRad(segStart.lat));

  const toXY = (p: LatLng) => ({
    x: (p.lng - segStart.lng) * metersPerDegLng,
    y: (p.lat - segStart.lat) * metersPerDegLat,
  });

  const p = toXY(point);
  const e = toXY(segEnd);

  const segLenSq = e.x * e.x + e.y * e.y;
  if (segLenSq === 0) {
    return { fraction: 0, perpendicularDistanceMeters: haversineMeters(point, segStart) };
  }

  const rawFraction = (p.x * e.x + p.y * e.y) / segLenSq;
  const fraction = Math.max(0, Math.min(1, rawFraction));

  const projX = fraction * e.x;
  const projY = fraction * e.y;
  const dx = p.x - projX;
  const dy = p.y - projY;
  const perpendicularDistanceMeters = Math.sqrt(dx * dx + dy * dy);

  return { fraction, perpendicularDistanceMeters };
}
