import notifee, { AndroidVisibility } from '@notifee/react-native';
import type { Station } from '../data/types';
import type { EngineState } from '../engine/types';
import { formatDistance, formatDuration, formatSpeed, formatStopsRemaining } from '../utils/formatters';
import { JOURNEY_PROGRESS_CHANNEL_ID } from './notificationChannels';

export const JOURNEY_NOTIFICATION_ID = 'journey-progress-notification';

export interface JourneyNotificationContext {
  destinationName: string;
  /** Total stops from boarding to destination, once known — drives the progress bar. */
  totalStops: number | null;
}

/**
 * Displays or updates the single ongoing "journey in progress" notification.
 * Safe to call repeatedly with the same JOURNEY_NOTIFICATION_ID — notifee
 * updates the existing notification in place rather than stacking new ones.
 */
export async function showOrUpdateJourneyNotification(
  state: EngineState,
  stationsById: Record<string, Station>,
  ctx: JourneyNotificationContext,
): Promise<void> {
  const nextStation = state.nextStationId ? stationsById[state.nextStationId] : undefined;

  const title = `${formatStopsRemaining(state.stopsRemaining)} · ${ctx.destinationName}`;
  const bodyParts = [
    formatDistance(state.distanceRemainingMeters),
    formatSpeed(state.currentSpeedKmh),
    state.etaSeconds !== null ? `ETA ${formatDuration(state.etaSeconds)}` : null,
  ].filter(Boolean);
  const body =
    (nextStation ? `Next: ${nextStation.name} · ` : '') +
    bodyParts.join(' · ') +
    (state.match.source === 'dead-reckoning' ? ' (estimated — GPS signal lost)' : '');

  const progress =
    ctx.totalStops !== null && ctx.totalStops > 0
      ? { max: ctx.totalStops, current: Math.max(0, ctx.totalStops - state.stopsRemaining) }
      : undefined;

  await notifee.displayNotification({
    id: JOURNEY_NOTIFICATION_ID,
    title,
    body,
    android: {
      channelId: JOURNEY_PROGRESS_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      visibility: AndroidVisibility.PUBLIC,
      progress,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

export async function dismissJourneyNotification(): Promise<void> {
  await notifee.stopForegroundService();
  await notifee.cancelNotification(JOURNEY_NOTIFICATION_ID);
}
