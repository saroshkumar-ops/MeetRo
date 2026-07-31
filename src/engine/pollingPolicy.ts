/** Wide GPS interval used mid-segment, far from the next station — saves battery. */
export const WIDE_INTERVAL_MS = 9000;
/** Tight interval used as the train is expected to be approaching a station. */
export const TIGHT_INTERVAL_MS = 2500;
/** Below this estimated time-to-next-station, switch to the tight interval. */
export const TIGHTEN_THRESHOLD_SECONDS = 45;

/**
 * Battery-conscious adaptive GPS polling interval: wide when there's plenty
 * of time before the next station, tight when arrival is imminent (which is
 * also when precise timing matters most for the escalating alerts).
 */
export function desiredIntervalMs(etaToNextStationSeconds: number | null): number {
  if (etaToNextStationSeconds === null) return WIDE_INTERVAL_MS;
  return etaToNextStationSeconds <= TIGHTEN_THRESHOLD_SECONDS ? TIGHT_INTERVAL_MS : WIDE_INTERVAL_MS;
}
