import {
  advanceDeadReckoning,
  DEAD_RECKONING_MAX_FRACTION,
  estimateFraction,
  GPS_STALE_MS,
  isFixStaleOrUntrusted,
  MIN_TRUSTED_CONFIDENCE,
} from '../../src/engine/deadReckoning';
import { testLine } from '../../src/testFixtures/testLine';

describe('estimateFraction', () => {
  it('is 0 with no elapsed time', () => {
    expect(estimateFraction(0, 100)).toBe(0);
  });

  it('is proportional to elapsed/avgTravelTime', () => {
    expect(estimateFraction(50, 100)).toBeCloseTo(0.5);
  });

  it('caps at DEAD_RECKONING_MAX_FRACTION, never claiming arrival', () => {
    expect(estimateFraction(1000, 100)).toBe(DEAD_RECKONING_MAX_FRACTION);
  });
});

describe('isFixStaleOrUntrusted', () => {
  it('is stale-or-untrusted when there has never been a trusted fix', () => {
    expect(isFixStaleOrUntrusted(null, Date.now(), 0.9)).toBe(true);
  });

  it('is trusted when recent and confident', () => {
    const now = 100000;
    expect(isFixStaleOrUntrusted(now - 1000, now, 0.9)).toBe(false);
  });

  it('is untrusted once older than GPS_STALE_MS, even with high confidence recorded', () => {
    const now = 100000;
    expect(isFixStaleOrUntrusted(now - GPS_STALE_MS - 1, now, 0.9)).toBe(true);
  });

  it('is untrusted when confidence is below MIN_TRUSTED_CONFIDENCE, even if fresh', () => {
    const now = 100000;
    expect(isFixStaleOrUntrusted(now - 100, now, MIN_TRUSTED_CONFIDENCE - 0.01)).toBe(true);
  });
});

describe('advanceDeadReckoning', () => {
  it('returns the anchor unchanged when now === anchor.timestamp', () => {
    const anchor = { segmentIndex: 0, fraction: 0.2, timestamp: 1000 };
    const result = advanceDeadReckoning(anchor, 1000, testLine, 'forward');
    expect(result).toEqual({ segmentIndex: 0, fraction: 0.2 });
  });

  it('advances fraction within a single segment (forward)', () => {
    const anchor = { segmentIndex: 0, fraction: 0, timestamp: 0 };
    // segment 0 has avgTravelTimeSeconds = 100; 50s in should be fraction 0.5
    const result = advanceDeadReckoning(anchor, 50_000, testLine, 'forward');
    expect(result.segmentIndex).toBe(0);
    expect(result.fraction).toBeCloseTo(0.5, 1);
  });

  it('crosses a segment boundary when elapsed time exceeds one segment', () => {
    const anchor = { segmentIndex: 0, fraction: 0, timestamp: 0 };
    // 150s: 100s to cross segment 0 fully, 50s into segment 1 -> fraction 0.5
    const result = advanceDeadReckoning(anchor, 150_000, testLine, 'forward');
    expect(result.segmentIndex).toBe(1);
    expect(result.fraction).toBeCloseTo(0.5, 1);
  });

  it('never claims arrival at the very next boundary — caps the in-progress segment', () => {
    const anchor = { segmentIndex: 0, fraction: 0, timestamp: 0 };
    const result = advanceDeadReckoning(anchor, 99_999_000, testLine, 'forward');
    expect(result.segmentIndex).toBe(testLine.segments.length - 1);
    expect(result.fraction).toBeLessThanOrEqual(DEAD_RECKONING_MAX_FRACTION);
  });

  it('advances backward correctly', () => {
    const anchor = { segmentIndex: 2, fraction: 1, timestamp: 0 };
    const result = advanceDeadReckoning(anchor, 50_000, testLine, 'backward');
    expect(result.segmentIndex).toBe(2);
    expect(result.fraction).toBeCloseTo(0.5, 1);
  });
});
