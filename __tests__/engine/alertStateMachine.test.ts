import { AlertStateMachine } from '../../src/engine/alertStateMachine';

describe('AlertStateMachine', () => {
  it('starts EN_ROUTE', () => {
    const m = new AlertStateMachine();
    expect(m.getState()).toBe('EN_ROUTE');
  });

  it('escalates through the full sequence as stopsRemaining drops', () => {
    const m = new AlertStateMachine();
    const seen: string[] = [];
    m.onTransition(e => seen.push(e.to));

    m.update(5, false, 0);
    m.update(3, false, 1);
    m.update(2, false, 2);
    m.update(1, false, 3);
    m.update(0, false, 4);
    m.update(0, true, 5);

    expect(seen).toEqual(['TWO_STOPS_OUT', 'ONE_STOP_OUT', 'ARRIVING', 'ARRIVED']);
    expect(m.getState()).toBe('ARRIVED');
  });

  it('fires each transition exactly once, ignoring repeated ticks at the same stopsRemaining', () => {
    const m = new AlertStateMachine();
    let count = 0;
    m.onTransition(() => count++);

    m.update(2, false, 0);
    m.update(2, false, 1);
    m.update(2, false, 2);

    expect(count).toBe(1);
  });

  it('never regresses to an earlier state on noisy stopsRemaining upticks', () => {
    const m = new AlertStateMachine();
    m.update(1, false, 0); // ONE_STOP_OUT
    m.update(3, false, 1); // noisy jump back up — should NOT undo escalation
    expect(m.getState()).toBe('ONE_STOP_OUT');
  });

  it('forceExitCorridor moves to a terminal EXITED_CORRIDOR state', () => {
    const m = new AlertStateMachine();
    m.update(3, false, 0);
    m.forceExitCorridor(1);
    expect(m.getState()).toBe('EXITED_CORRIDOR');
    // further updates should not move it anywhere else
    m.update(0, true, 2);
    expect(m.getState()).toBe('EXITED_CORRIDOR');
  });

  it('reset() returns to EN_ROUTE for a new journey', () => {
    const m = new AlertStateMachine();
    m.update(0, true, 0);
    expect(m.getState()).toBe('ARRIVED');
    m.reset();
    expect(m.getState()).toBe('EN_ROUTE');
  });
});
