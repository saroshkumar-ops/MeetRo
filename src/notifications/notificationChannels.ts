import notifee, { AndroidImportance } from '@notifee/react-native';

export const JOURNEY_PROGRESS_CHANNEL_ID = 'journey-progress';
export const JOURNEY_ALARM_CHANNEL_ID = 'journey-alarm';

/** Creates both notification channels. Safe to call repeatedly (channel ids are idempotent on Android). */
export async function ensureNotificationChannels(): Promise<void> {
  await notifee.createChannel({
    id: JOURNEY_PROGRESS_CHANNEL_ID,
    name: 'Journey progress',
    description: 'Ongoing stops-remaining / ETA updates while a journey is active',
    importance: AndroidImportance.DEFAULT,
    vibration: true,
  });

  await notifee.createChannel({
    id: JOURNEY_ALARM_CHANNEL_ID,
    name: 'Arrival alarm',
    description: 'High-priority alert when your stop is arriving — can interrupt Do Not Disturb',
    importance: AndroidImportance.HIGH,
    vibration: true,
    bypassDnd: true,
  });
}
