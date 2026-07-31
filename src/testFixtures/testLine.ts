import type { Line, Station } from '../data/types';

/**
 * A small synthetic 4-station line (A-B-C-D), roughly 1km between adjacent
 * stations, 100s average travel time per segment. Used by engine unit tests
 * so they don't depend on the real (approximate) Namma Metro dataset.
 */
export const testStations: Station[] = [
  { id: 'A', name: 'Station A', lineIds: ['test'], lat: 12.9, lng: 77.5, order: 0 },
  { id: 'B', name: 'Station B', lineIds: ['test'], lat: 12.9, lng: 77.5092, order: 1 },
  { id: 'C', name: 'Station C', lineIds: ['test'], lat: 12.9, lng: 77.5184, order: 2 },
  { id: 'D', name: 'Station D', lineIds: ['test'], lat: 12.9, lng: 77.5276, order: 3 },
];

export const testStationsById: Record<string, Station> = Object.fromEntries(
  testStations.map(s => [s.id, s]),
);

export const testLine: Line = {
  id: 'test',
  name: 'Test Line',
  color: '#000000',
  stationIdsInOrder: ['A', 'B', 'C', 'D'],
  segments: [
    { fromStationId: 'A', toStationId: 'B', distanceMeters: 1000, avgTravelTimeSeconds: 100 },
    { fromStationId: 'B', toStationId: 'C', distanceMeters: 1000, avgTravelTimeSeconds: 100 },
    { fromStationId: 'C', toStationId: 'D', distanceMeters: 1000, avgTravelTimeSeconds: 100 },
  ],
};
