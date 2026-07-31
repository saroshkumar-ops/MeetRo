import type { Direction } from './types';

interface Sample {
  /** Continuous position along the line: segmentIndex + fraction. */
  position: number;
  timestamp: number;
}

const HISTORY_WINDOW_SIZE = 6;
const MIN_SAMPLES_FOR_DIRECTION = 3;
/** Minimum net movement (in segment-position units) to call a direction, filters GPS jitter. */
const MIN_NET_MOVEMENT = 0.05;

/**
 * Infers direction of travel along a line from a rolling window of matched
 * positions, and flags sustained movement away from the destination.
 */
export class DirectionTracker {
  private history: Sample[] = [];
  private awayFromDestinationStreak = 0;

  addSample(position: number, timestamp: number): void {
    this.history.push({ position, timestamp });
    if (this.history.length > HISTORY_WINDOW_SIZE) {
      this.history.shift();
    }
  }

  getDirection(): Direction {
    if (this.history.length < MIN_SAMPLES_FOR_DIRECTION) return 'unknown';
    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const net = last.position - first.position;
    if (Math.abs(net) < MIN_NET_MOVEMENT) return 'unknown';
    return net > 0 ? 'forward' : 'backward';
  }

  /**
   * Call once per tick with the current direction and whether that
   * direction moves toward or away from the destination. Returns true once
   * "away" has been sustained long enough to be worth warning about (not a
   * single noisy sample).
   */
  trackDestinationProgress(movingAwayFromDestination: boolean): boolean {
    this.awayFromDestinationStreak = movingAwayFromDestination
      ? this.awayFromDestinationStreak + 1
      : 0;
    return this.awayFromDestinationStreak >= 3;
  }

  reset(): void {
    this.history = [];
    this.awayFromDestinationStreak = 0;
  }
}
