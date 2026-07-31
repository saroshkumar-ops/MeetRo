import type { LocationProvider } from '../engine/types';
import { MockLocationProvider, type MockLocationProviderOptions } from './MockLocationProvider';
import { RealLocationProvider } from './RealLocationProvider';

export type LocationProviderMode = 'real' | 'mock';

export function createLocationProvider(
  mode: LocationProviderMode,
  mockOptions?: MockLocationProviderOptions,
): LocationProvider {
  if (mode === 'mock') {
    if (!mockOptions) throw new Error('mockOptions is required when mode is "mock"');
    return new MockLocationProvider(mockOptions);
  }
  return new RealLocationProvider();
}
