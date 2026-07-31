import { lines, stationsById, getStationById } from '../../src/data/stations';
import { haversineMeters } from '../../src/engine/geo';

describe('Namma Metro dataset integrity', () => {
  for (const line of lines) {
    describe(line.name, () => {
      it('has no duplicate station ids in its order', () => {
        const unique = new Set(line.stationIdsInOrder);
        expect(unique.size).toBe(line.stationIdsInOrder.length);
      });

      it('has a segment for every adjacent station pair, in order', () => {
        expect(line.segments.length).toBe(line.stationIdsInOrder.length - 1);
        line.segments.forEach((seg, i) => {
          expect(seg.fromStationId).toBe(line.stationIdsInOrder[i]);
          expect(seg.toStationId).toBe(line.stationIdsInOrder[i + 1]);
        });
      });

      it('every referenced station exists in the merged lookup', () => {
        for (const id of line.stationIdsInOrder) {
          expect(getStationById(id)).toBeDefined();
        }
      });

      it('has positive segment distances and travel times', () => {
        for (const seg of line.segments) {
          expect(seg.distanceMeters).toBeGreaterThan(0);
          expect(seg.avgTravelTimeSeconds).toBeGreaterThan(0);
        }
      });

      it('segment distances are within a sane bound of haversine distance between stations', () => {
        for (const seg of line.segments) {
          const from = stationsById[seg.fromStationId];
          const to = stationsById[seg.toStationId];
          const straightLine = haversineMeters(from, to);
          // Segment distance should never be shorter than the straight line,
          // and shouldn't be wildly longer either (sanity bound, not exact).
          expect(seg.distanceMeters).toBeGreaterThanOrEqual(straightLine - 1);
          expect(seg.distanceMeters).toBeLessThan(straightLine * 3 + 500);
        }
      });
    });
  }

  it('shares the Majestic interchange station between Purple and Green lines', () => {
    const majestic = getStationById('majestic');
    expect(majestic?.lineIds.sort()).toEqual(['green', 'purple']);
  });
});
