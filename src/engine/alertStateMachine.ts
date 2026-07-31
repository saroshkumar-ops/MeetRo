import type { AlertState } from './types';

export interface AlertTransitionEvent {
  from: AlertState;
  to: AlertState;
  timestamp: number;
}

type Listener = (event: AlertTransitionEvent) => void;

/** Escalation order — transitions only ever move forward, never regress on GPS jitter. */
const STATE_RANK: Record<AlertState, number> = {
  EN_ROUTE: 0,
  TWO_STOPS_OUT: 1,
  ONE_STOP_OUT: 2,
  ARRIVING: 3,
  ARRIVED: 4,
  EXITED_CORRIDOR: 5,
};

/**
 * Pure state machine over stopsRemaining: EN_ROUTE → TWO_STOPS_OUT →
 * ONE_STOP_OUT → ARRIVING → ARRIVED. Each transition fires its listener
 * exactly once. EXITED_CORRIDOR is a separate terminal state triggered
 * externally when the tracked position leaves the line's corridor.
 */
export class AlertStateMachine {
  private state: AlertState = 'EN_ROUTE';
  private listeners: Listener[] = [];

  getState(): AlertState {
    return this.state;
  }

  onTransition(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Call once per engine tick with the latest stops-remaining estimate.
   * When stopsRemaining hits 0 and arrivalConfirmed is true in the very same
   * tick (the common case — dead reckoning is never allowed to confirm
   * arrival, only a real GPS fix is), this still transitions through
   * ARRIVING before ARRIVED as two separate events, so listeners (the
   * escalating notification) always see the "arriving now" rung fire ahead
   * of the arrival alarm rather than jumping straight to it.
   */
  update(stopsRemaining: number, arrivalConfirmed: boolean, timestamp: number): AlertState {
    let candidate: AlertState = this.state;
    if (stopsRemaining <= 0) {
      candidate = 'ARRIVING';
    } else if (stopsRemaining === 1) {
      candidate = 'ONE_STOP_OUT';
    } else if (stopsRemaining === 2) {
      candidate = 'TWO_STOPS_OUT';
    }
    this.transitionTo(candidate, timestamp);

    if (arrivalConfirmed) {
      this.transitionTo('ARRIVED', timestamp);
    }
    return this.state;
  }

  /** Terminal override used when the tracked position leaves the line's corridor. */
  forceExitCorridor(timestamp: number): void {
    this.transitionTo('EXITED_CORRIDOR', timestamp);
  }

  reset(): void {
    this.state = 'EN_ROUTE';
  }

  private transitionTo(candidate: AlertState, timestamp: number): void {
    if (STATE_RANK[candidate] <= STATE_RANK[this.state]) return;
    const from = this.state;
    this.state = candidate;
    for (const listener of this.listeners) {
      listener({ from, to: candidate, timestamp });
    }
  }
}
