/** A single position reading, from real GPS or a simulated provider. */
export interface LocationFix {
  lat: number;
  lng: number;
  /** Meters, per the platform GPS API. Larger = less trustworthy. */
  accuracyMeters: number;
  /** Ground speed in m/s if the platform provides it, else undefined. */
  speedMps?: number;
  timestamp: number;
}

export type Direction = 'forward' | 'backward' | 'unknown';

export type AlertState =
  | 'EN_ROUTE'
  | 'TWO_STOPS_OUT'
  | 'ONE_STOP_OUT'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'EXITED_CORRIDOR';

export interface MatchResult {
  /** Index into line.segments of the segment the fix best matches. */
  segmentIndex: number;
  /** 0-1 progress from segment start station to end station. */
  fraction: number;
  /** 0-1, derived from GPS accuracy and perpendicular distance to the line. */
  confidence: number;
  perpendicularDistanceMeters: number;
  source: 'gps' | 'dead-reckoning';
}

export interface EngineState {
  direction: Direction;
  match: MatchResult;
  /** Station id of the last station the train is confirmed to have passed/be at. */
  lastConfirmedStationId: string;
  /** Station id of the next station ahead, in the travel direction. */
  nextStationId: string | null;
  stopsRemaining: number;
  distanceRemainingMeters: number;
  currentSpeedKmh: number;
  etaSeconds: number | null;
  alertState: AlertState;
  /** True once progress has trended away from the destination for a sustained period. */
  wrongDirectionWarning: boolean;
  timestamp: number;
}

export interface LocationProvider {
  start(onFix: (fix: LocationFix) => void): void;
  stop(): void;
  /** Adjust polling cadence; providers that can't vary interval may no-op. */
  setDesiredIntervalMs(ms: number): void;
}
