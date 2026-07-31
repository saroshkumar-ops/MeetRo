import { Linking, PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests the permissions needed just to start tracking: fine location and
 * (Android 13+) posting notifications. Background location is requested
 * separately (see requestBackgroundLocationPermission) since Android
 * requires foreground location to be granted first, and Play policy
 * expects a distinct rationale for "always allow".
 */
export async function requestCorePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const permissions: Array<Parameters<typeof PermissionsAndroid.request>[0]> = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];
  if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(results).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 29) return true;
  const permission = PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;
  if (!permission) return true;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Opens the app's system settings page so the user can manually grant "ignore battery optimizations" / full-screen intent — both require a manual toggle and can't be silently granted. */
export function openAppSettings(): void {
  Linking.openSettings();
}
