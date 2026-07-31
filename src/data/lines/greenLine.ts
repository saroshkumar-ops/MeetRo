import type { Line, LineSegment, Station } from '../types';
import { haversineMeters } from '../../engine/geo';

/**
 * PLACEHOLDER DATA — Namma Metro Green Line (Nagasandra ↔ Silk Institute).
 *
 * Same caveat as purpleLine.ts: station order is real, lat/lng and travel
 * times are best-effort approximations to be verified before real use.
 */
const rawStations: Array<{ id: string; name: string; lat: number; lng: number }> = [
  { id: 'nagasandra', name: 'Nagasandra', lat: 13.0453, lng: 77.5060 },
  { id: 'dasarahalli', name: 'Dasarahalli', lat: 13.0387, lng: 77.5137 },
  { id: 'jalahalli', name: 'Jalahalli', lat: 13.0339, lng: 77.5347 },
  { id: 'peenya_industry', name: 'Peenya Industry', lat: 13.0290, lng: 77.5205 },
  { id: 'peenya', name: 'Peenya', lat: 13.0224, lng: 77.5203 },
  { id: 'goraguntepalya', name: 'Goraguntepalya', lat: 13.0158, lng: 77.5327 },
  { id: 'yeshwanthpur', name: 'Yeshwanthpur', lat: 13.0233, lng: 77.5540 },
  { id: 'sandal_soap_factory', name: 'Sandal Soap Factory', lat: 13.0116, lng: 77.5561 },
  { id: 'mahalakshmi', name: 'Mahalakshmi', lat: 13.0052, lng: 77.5459 },
  { id: 'rajajinagar', name: 'Rajajinagar', lat: 12.9944, lng: 77.5533 },
  { id: 'kuvempu_road', name: 'Mahakavi Kuvempu Road', lat: 12.9902, lng: 77.5595 },
  { id: 'srirampura', name: 'Srirampura', lat: 12.9860, lng: 77.5651 },
  { id: 'sampige_road', name: 'Sampige Road', lat: 12.9856, lng: 77.5701 },
  { id: 'majestic', name: 'Krantivira Sangolli Rayanna (Majestic)', lat: 12.9767, lng: 77.5713 },
  { id: 'national_college', name: 'National College', lat: 12.9563, lng: 77.5726 },
  { id: 'lalbagh', name: 'Lalbagh', lat: 12.9482, lng: 77.5814 },
  { id: 'south_end_circle', name: 'South End Circle', lat: 12.9410, lng: 77.5768 },
  { id: 'jayanagar', name: 'Jayanagar', lat: 12.9308, lng: 77.5828 },
  { id: 'rv_road', name: 'Rashtreeya Vidyalaya Road', lat: 12.9227, lng: 77.5760 },
  { id: 'banashankari', name: 'Banashankari', lat: 12.9166, lng: 77.5731 },
  { id: 'jp_nagar', name: 'Jayaprakash Nagar', lat: 12.9078, lng: 77.5842 },
  { id: 'yelachenahalli', name: 'Yelachenahalli', lat: 12.8988, lng: 77.5717 },
  { id: 'konanakunte_cross', name: 'Konanakunte Cross', lat: 12.8871, lng: 77.5648 },
  { id: 'doddakallasandra', name: 'Doddakallasandra', lat: 12.8776, lng: 77.5606 },
  { id: 'vajarahalli', name: 'Vajarahalli', lat: 12.8703, lng: 77.5573 },
  { id: 'thalaghattapura', name: 'Thalaghattapura', lat: 12.8637, lng: 77.5533 },
  { id: 'silk_institute', name: 'Silk Institute', lat: 12.8571, lng: 77.5496 },
];

// Approximate underground stretch near the central Majestic interchange,
// used by MockLocationProvider to exercise the dead-reckoning fallback.
export const GREEN_LINE_UNDERGROUND_SEGMENT_IDS = new Set([
  'srirampura',
  'sampige_road',
  'majestic',
  'national_college',
]);

const AVG_KMH = 34;

function estimateSegment(a: (typeof rawStations)[number], b: (typeof rawStations)[number]): LineSegment {
  const distanceMeters = haversineMeters(a, b);
  const avgTravelTimeSeconds = Math.round((distanceMeters / 1000 / AVG_KMH) * 3600) + 25;
  return {
    fromStationId: a.id,
    toStationId: b.id,
    distanceMeters: Math.round(distanceMeters),
    avgTravelTimeSeconds,
  };
}

// Green Line shares the Majestic interchange station with Purple Line.
export const greenLineStations: Station[] = rawStations.map((s, order) => ({
  id: s.id,
  name: s.name,
  lineIds: s.id === 'majestic' ? ['purple', 'green'] : ['green'],
  lat: s.lat,
  lng: s.lng,
  order,
}));

const segments: LineSegment[] = rawStations
  .slice(0, -1)
  .map((s, i) => estimateSegment(s, rawStations[i + 1]));

export const greenLine: Line = {
  id: 'green',
  name: 'Green Line',
  color: '#2E8B57',
  stationIdsInOrder: rawStations.map(s => s.id),
  segments,
};
