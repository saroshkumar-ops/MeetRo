import { haversineMeters, projectPointOntoSegment } from '../../src/engine/geo';

describe('geo', () => {
  it('haversineMeters returns ~0 for identical points', () => {
    expect(haversineMeters({ lat: 12.9, lng: 77.5 }, { lat: 12.9, lng: 77.5 })).toBeCloseTo(0, 3);
  });

  it('haversineMeters returns ~1000m for the test line A-B spacing', () => {
    const d = haversineMeters({ lat: 12.9, lng: 77.5 }, { lat: 12.9, lng: 77.5092 });
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });

  it('projectPointOntoSegment finds fraction 0.5 at the midpoint', () => {
    const start = { lat: 12.9, lng: 77.5 };
    const end = { lat: 12.9, lng: 77.5092 };
    const mid = { lat: 12.9, lng: 77.5046 };
    const { fraction, perpendicularDistanceMeters } = projectPointOntoSegment(mid, start, end);
    expect(fraction).toBeCloseTo(0.5, 1);
    expect(perpendicularDistanceMeters).toBeLessThan(5);
  });

  it('projectPointOntoSegment clamps fraction to [0,1] beyond the segment ends', () => {
    const start = { lat: 12.9, lng: 77.5 };
    const end = { lat: 12.9, lng: 77.5092 };
    const beyondEnd = { lat: 12.9, lng: 77.52 };
    const { fraction } = projectPointOntoSegment(beyondEnd, start, end);
    expect(fraction).toBe(1);
  });

  it('projectPointOntoSegment reports large perpendicular distance when off the line', () => {
    const start = { lat: 12.9, lng: 77.5 };
    const end = { lat: 12.9, lng: 77.5092 };
    const farOff = { lat: 12.905, lng: 77.5046 };
    const { perpendicularDistanceMeters } = projectPointOntoSegment(farOff, start, end);
    expect(perpendicularDistanceMeters).toBeGreaterThan(400);
  });
});
