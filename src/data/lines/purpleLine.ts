import type { Line, LineSegment, Station } from '../types';
import { haversineMeters } from '../../engine/geo';

/**
 * PLACEHOLDER DATA — Namma Metro Purple Line (Challaghatta ↔ Whitefield/Kadugodi Tree Park).
 *
 * Station order matches the real line, but lat/lng and travel times below are
 * best-effort approximations assembled from general knowledge, NOT surveyed
 * GPS fixes. Verify/replace before relying on this for a real commute — see
 * src/data/README.md for how to correct these using "record mode" or a map
 * service.
 */
const rawStations: Array<{ id: string; name: string; lat: number; lng: number }> = [
  { id: 'challaghatta', name: 'Challaghatta', lat: 12.9081, lng: 77.4855 },
  { id: 'kengeri', name: 'Kengeri', lat: 12.9101, lng: 77.4823 },
  { id: 'kengeri_bus_terminal', name: 'Kengeri Bus Terminal', lat: 12.9146, lng: 77.4869 },
  { id: 'pattanagere', name: 'Pattanagere', lat: 12.9195, lng: 77.4959 },
  { id: 'jnanabharathi', name: 'Jnanabharathi', lat: 12.9276, lng: 77.5045 },
  { id: 'rr_nagar', name: 'Rajarajeshwari Nagar', lat: 12.9291, lng: 77.5133 },
  { id: 'nayandahalli', name: 'Nayandahalli', lat: 12.9403, lng: 77.5222 },
  { id: 'mysuru_road', name: 'Mysuru Road', lat: 12.9498, lng: 77.5305 },
  { id: 'deepanjali_nagar', name: 'Deepanjali Nagar', lat: 12.9515, lng: 77.5382 },
  { id: 'attiguppe', name: 'Attiguppe', lat: 12.9538, lng: 77.5445 },
  { id: 'vijayanagar', name: 'Vijayanagar', lat: 12.9612, lng: 77.5388 },
  { id: 'hosahalli', name: 'Hosahalli', lat: 12.9651, lng: 77.5450 },
  { id: 'magadi_road', name: 'Magadi Road', lat: 12.9701, lng: 77.5556 },
  { id: 'majestic', name: 'Krantivira Sangolli Rayanna (Majestic)', lat: 12.9767, lng: 77.5713 },
  { id: 'central_college', name: 'Sir M. Visvesvaraya (Central College)', lat: 12.9752, lng: 77.5813 },
  { id: 'vidhana_soudha', name: 'Dr. BR Ambedkar (Vidhana Soudha)', lat: 12.9789, lng: 77.5901 },
  { id: 'cubbon_park', name: 'Cubbon Park', lat: 12.9764, lng: 77.5952 },
  { id: 'mg_road', name: 'MG Road', lat: 12.9754, lng: 77.6062 },
  { id: 'trinity', name: 'Trinity', lat: 12.9733, lng: 77.6155 },
  { id: 'halasuru', name: 'Halasuru', lat: 12.9791, lng: 77.6223 },
  { id: 'indiranagar', name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
  { id: 'swami_vivekananda_road', name: 'Swami Vivekananda Road', lat: 12.9779, lng: 77.6516 },
  { id: 'baiyappanahalli', name: 'Baiyappanahalli', lat: 12.9906, lng: 77.6534 },
  { id: 'benniganahalli', name: 'Benniganahalli', lat: 12.9928, lng: 77.6647 },
  { id: 'kr_puram', name: 'Krishnarajapuram (KR Puram)', lat: 12.9944, lng: 77.6820 },
  { id: 'hoodi', name: 'Hoodi', lat: 12.9903, lng: 77.7018 },
  { id: 'garudacharpalya', name: 'Garudacharpalya', lat: 12.9878, lng: 77.7128 },
  { id: 'singayyanapalya', name: 'Singayyanapalya', lat: 12.9855, lng: 77.7195 },
  { id: 'kundalahalli', name: 'Kundalahalli', lat: 12.9765, lng: 77.7183 },
  { id: 'nallurhalli', name: 'Nallurhalli', lat: 12.9718, lng: 77.7259 },
  { id: 'sathya_sai_hospital', name: 'Sri Sathya Sai Hospital', lat: 12.9689, lng: 77.7357 },
  { id: 'pattandur_agrahara', name: 'Pattandur Agrahara', lat: 12.9701, lng: 77.7434 },
  { id: 'kadugodi', name: 'Kadugodi Tree Park (Whitefield)', lat: 12.9931, lng: 77.7500 },
];

// Underground stretch (approx): Magadi Road → Swami Vivekananda Road, where
// GPS is expected to be unreliable/absent — used by MockLocationProvider to
// exercise the dead-reckoning fallback.
export const PURPLE_LINE_UNDERGROUND_SEGMENT_IDS = new Set([
  'magadi_road',
  'majestic',
  'central_college',
  'vidhana_soudha',
  'cubbon_park',
  'mg_road',
  'trinity',
  'halasuru',
  'indiranagar',
  'swami_vivekananda_road',
]);

const AVG_KMH = 34; // typical Namma Metro running speed including dwell time

function estimateSegment(a: (typeof rawStations)[number], b: (typeof rawStations)[number]): LineSegment {
  const distanceMeters = haversineMeters(a, b);
  const avgTravelTimeSeconds = Math.round((distanceMeters / 1000 / AVG_KMH) * 3600) + 25; // + dwell allowance
  return {
    fromStationId: a.id,
    toStationId: b.id,
    distanceMeters: Math.round(distanceMeters),
    avgTravelTimeSeconds,
  };
}

export const purpleLineStations: Station[] = rawStations.map((s, order) => ({
  id: s.id,
  name: s.name,
  lineIds: ['purple'],
  lat: s.lat,
  lng: s.lng,
  order,
}));

const segments: LineSegment[] = rawStations
  .slice(0, -1)
  .map((s, i) => estimateSegment(s, rawStations[i + 1]));

export const purpleLine: Line = {
  id: 'purple',
  name: 'Purple Line',
  color: '#7B2D8E',
  stationIdsInOrder: rawStations.map(s => s.id),
  segments,
};
