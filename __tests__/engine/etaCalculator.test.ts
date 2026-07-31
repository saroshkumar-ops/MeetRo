import { computeJourneyMetrics, SpeedSmoother } from '../../src/engine/etaCalculator';
import { testLine } from '../../src/testFixtures/testLine';

describe('computeJourneyMetrics (forward travel, destination = D, order 3)', () => {
  it('reports 3 stops remaining right at boarding (station A, order 0)', () => {
    const m = computeJourneyMetrics(testLine, 0, 3, 'forward', 0);
    expect(m.stopsRemaining).toBe(3);
    expect(m.lastConfirmedStationOrder).toBe(0);
    expect(m.nextStationOrder).toBe(1);
  });

  it('reports 2 stops remaining once past station B (order 1)', () => {
    const m = computeJourneyMetrics(testLine, 1, 3, 'forward', 0);
    expect(m.stopsRemaining).toBe(2);
  });

  it('reports 0 stops remaining and zeroed distance/eta once at the destination', () => {
    const m = computeJourneyMetrics(testLine, 3, 3, 'forward', 0);
    expect(m.stopsRemaining).toBe(0);
    expect(m.distanceRemainingMeters).toBe(0);
    expect(m.etaSeconds).toBe(0);
  });

  it('distanceRemainingMeters decreases monotonically as position advances toward the destination', () => {
    const distances = [0, 0.5, 1, 1.5, 2, 2.5, 3].map(
      pos => computeJourneyMetrics(testLine, pos, 3, 'forward', 0).distanceRemainingMeters,
    );
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i - 1]);
    }
  });

  it('uses live speed for the immediate-segment ETA when speed is known', () => {
    // At position 0 (station A), 1000m to next station B at 36km/h (10 m/s) => 100s
    const m = computeJourneyMetrics(testLine, 0, 1, 'forward', 36);
    expect(m.etaToNextStationSeconds).toBeCloseTo(100, -1);
  });
});

describe('computeJourneyMetrics (backward travel, destination = A, order 0)', () => {
  it('reports stops remaining counting down from D toward A', () => {
    const m = computeJourneyMetrics(testLine, 3, 0, 'backward', 0);
    expect(m.stopsRemaining).toBe(3);
  });

  it('reaches 0 stops remaining at the destination', () => {
    const m = computeJourneyMetrics(testLine, 0, 0, 'backward', 0);
    expect(m.stopsRemaining).toBe(0);
  });
});

describe('SpeedSmoother', () => {
  it('uses platform-provided speed directly when available', () => {
    const s = new SpeedSmoother();
    const kmh = s.addFix({ lat: 12.9, lng: 77.5, timestamp: 0, speedMps: 10 });
    expect(kmh).toBeCloseTo(36, 0);
  });

  it('derives speed from displacement/time when no speedMps is provided', () => {
    const s = new SpeedSmoother();
    s.addFix({ lat: 12.9, lng: 77.5, timestamp: 0 });
    // ~1000m in 100s -> 36 km/h
    const kmh = s.addFix({ lat: 12.9, lng: 77.5092, timestamp: 100_000 });
    expect(kmh).toBeGreaterThan(25);
    expect(kmh).toBeLessThan(45);
  });

  it('returns 0 before any usable sample has been seen', () => {
    const s = new SpeedSmoother();
    expect(s.currentKmh()).toBe(0);
  });
});
