import Geolocation from 'react-native-geolocation-service';
import type { LocationFix, LocationProvider } from '../engine/types';

/**
 * Wraps react-native-geolocation-service's watchPosition behind the same
 * LocationProvider interface MockLocationProvider implements, so
 * JourneyEngine, the foreground service, and the UI never need to know
 * which one is feeding them.
 */
export class RealLocationProvider implements LocationProvider {
  private watchId: number | null = null;
  private onFixCb: ((fix: LocationFix) => void) | null = null;
  private intervalMs = 5000;

  start(onFix: (fix: LocationFix) => void): void {
    this.onFixCb = onFix;
    this.watchId = Geolocation.watchPosition(
      position => {
        this.onFixCb?.({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? 50,
          speedMps:
            typeof position.coords.speed === 'number' && position.coords.speed >= 0
              ? position.coords.speed
              : undefined,
          timestamp: position.timestamp,
        });
      },
      error => {
        // Swallowed deliberately: the engine's dead-reckoning fallback takes
        // over automatically once fixes stop arriving (see deadReckoning.ts).
        console.warn('RealLocationProvider watchPosition error', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: this.intervalMs,
        fastestInterval: Math.max(1000, Math.floor(this.intervalMs / 2)),
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.onFixCb = null;
  }

  setDesiredIntervalMs(ms: number): void {
    this.intervalMs = ms;
    // The underlying native watch doesn't support changing interval live;
    // restart it so adaptive polling (pollingPolicy.ts) actually takes effect.
    if (this.watchId !== null && this.onFixCb) {
      const cb = this.onFixCb;
      this.stop();
      this.start(cb);
    }
  }
}
