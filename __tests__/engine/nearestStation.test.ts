import { findNearestSegment } from '../../src/engine/nearestStation';
import { testLine, testStationsById } from '../../src/testFixtures/testLine';

describe('findNearestSegment', () => {
  it('matches a fix exactly at station A to segment 0, fraction 0', () => {
    const match = findNearestSegment(
      { lat: 12.9, lng: 77.5, accuracyMeters: 10, timestamp: 0 },
      testLine,
      testStationsById,
    );
    expect(match).not.toBeNull();
    expect(match!.segmentIndex).toBe(0);
    expect(match!.fraction).toBeCloseTo(0, 1);
    expect(match!.confidence).toBeGreaterThan(0.5);
  });

  it('matches a fix near station C to segment 1 (B-C), fraction ~1', () => {
    const match = findNearestSegment(
      { lat: 12.9, lng: 77.5184, accuracyMeters: 10, timestamp: 0 },
      testLine,
      testStationsById,
    );
    expect(match!.segmentIndex).toBe(1);
    expect(match!.fraction).toBeCloseTo(1, 1);
  });

  it('produces low confidence for a fix far off the line', () => {
    const match = findNearestSegment(
      { lat: 12.95, lng: 77.5046, accuracyMeters: 10, timestamp: 0 },
      testLine,
      testStationsById,
    );
    expect(match!.confidence).toBeLessThan(0.2);
  });

  it('produces low confidence for a fix with poor GPS accuracy even if positioned on the line', () => {
    const match = findNearestSegment(
      { lat: 12.9, lng: 77.5046, accuracyMeters: 150, timestamp: 0 },
      testLine,
      testStationsById,
    );
    expect(match!.confidence).toBeLessThan(0.3);
  });
});
