import { JourneyEngine } from '../../src/engine/journeyEngine';
import { MockLocationProvider } from '../../src/location/MockLocationProvider';
import type { EngineState, AlertState } from '../../src/engine/types';
import { testLine, testStationsById } from '../../src/testFixtures/testLine';

describe('JourneyEngine + MockLocationProvider (headless integration)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs a full A→D journey and reaches ARRIVED with a clean alert-state sequence', () => {
    const provider = new MockLocationProvider({
      line: testLine,
      stationsById: testStationsById,
      startStationId: 'A',
      direction: 'forward',
      trainSpeedKmh: 36,
      playbackSpeedMultiplier: 1,
    });
    const engine = new JourneyEngine(testLine, testStationsById, 'D', provider);

    const states: EngineState[] = [];
    const alertSequence: AlertState[] = [];
    engine.onUpdate(s => states.push(s));
    engine.onAlertTransition(e => alertSequence.push(e.to));

    engine.start();
    // 3 segments * 100s avgTravelTimeSeconds = 300s total journey, give it margin.
    jest.advanceTimersByTime(340_000);
    engine.stop();

    expect(states.length).toBeGreaterThan(0);
    const finalState = states[states.length - 1];
    expect(finalState.stopsRemaining).toBe(0);
    expect(finalState.alertState).toBe('ARRIVED');

    // Escalation must be strictly forward, no regressions, no duplicate firings.
    expect(alertSequence).toEqual(['TWO_STOPS_OUT', 'ONE_STOP_OUT', 'ARRIVING', 'ARRIVED']);

    // stopsRemaining should never increase over the course of the journey.
    for (let i = 1; i < states.length; i++) {
      expect(states[i].stopsRemaining).toBeLessThanOrEqual(states[i - 1].stopsRemaining);
    }
  });

  it('bridges a GPS dead zone via dead reckoning and re-syncs once signal returns', () => {
    const provider = new MockLocationProvider({
      line: testLine,
      stationsById: testStationsById,
      startStationId: 'A',
      direction: 'forward',
      trainSpeedKmh: 36,
      playbackSpeedMultiplier: 1,
      // Suppress fixes on the B→C segment, simulating a tunnel.
      deadZoneStationIds: new Set(['B', 'C']),
    });
    const engine = new JourneyEngine(testLine, testStationsById, 'D', provider);

    const states: EngineState[] = [];
    engine.onUpdate(s => states.push(s));

    engine.start();
    // Advance partway into the dead zone (segment B→C spans roughly 100-200s in).
    jest.advanceTimersByTime(150_000);

    const duringDeadZone = states[states.length - 1];
    expect(duringDeadZone.match.source).toBe('dead-reckoning');
    // Position should still be advancing (not frozen) despite no GPS fixes.
    expect(duringDeadZone.stopsRemaining).toBeLessThanOrEqual(2);

    // Advance past the dead zone into segment C→D, where GPS resumes.
    jest.advanceTimersByTime(150_000);
    engine.stop();

    const afterResync = states[states.length - 1];
    expect(afterResync.match.source).toBe('gps');
    expect(afterResync.stopsRemaining).toBeLessThanOrEqual(1);
  });

  it('never lets stopsRemaining increase, even while dead-reckoning', () => {
    const provider = new MockLocationProvider({
      line: testLine,
      stationsById: testStationsById,
      startStationId: 'A',
      direction: 'forward',
      trainSpeedKmh: 36,
      playbackSpeedMultiplier: 1,
      deadZoneStationIds: new Set(['B', 'C']),
    });
    const engine = new JourneyEngine(testLine, testStationsById, 'D', provider);
    const states: EngineState[] = [];
    engine.onUpdate(s => states.push(s));

    engine.start();
    jest.advanceTimersByTime(340_000);
    engine.stop();

    for (let i = 1; i < states.length; i++) {
      expect(states[i].stopsRemaining).toBeLessThanOrEqual(states[i - 1].stopsRemaining);
    }
  });
});
