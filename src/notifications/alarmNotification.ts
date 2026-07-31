import notifee, { AndroidCategory, AndroidImportance } from '@notifee/react-native';
import { JOURNEY_ALARM_CHANNEL_ID } from './notificationChannels';

export const ARRIVAL_ALARM_NOTIFICATION_ID = 'arrival-alarm-notification';

/**
 * The high-priority "get up now" notification fired on confirmed arrival.
 * Uses a max-importance, DND-bypassing channel plus a full-screen intent —
 * the same mechanism alarm-clock apps use to interrupt a locked, silent
 * phone — aimed specifically at the "user fell asleep" scenario.
 */
export async function showArrivalAlarm(destinationName: string): Promise<void> {
  await notifee.displayNotification({
    id: ARRIVAL_ALARM_NOTIFICATION_ID,
    title: `Wake up — you've arrived at ${destinationName}`,
    body: 'Time to get off. Tap to dismiss.',
    android: {
      channelId: JOURNEY_ALARM_CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      autoCancel: false,
      ongoing: true,
      loopSound: true,
      vibrationPattern: [300, 500, 300, 500, 300, 500],
      pressAction: { id: 'dismiss-alarm' },
      fullScreenAction: { id: 'arrival-full-screen' },
      smallIcon: 'ic_launcher',
    },
  });
}

export async function dismissArrivalAlarm(): Promise<void> {
  await notifee.cancelNotification(ARRIVAL_ALARM_NOTIFICATION_ID);
}
