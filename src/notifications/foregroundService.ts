import notifee from '@notifee/react-native';
import { Vibration } from 'react-native';
import { JourneyEngine } from '../engine/journeyEngine';
import type { AlertState } from '../engine/types';
import { createLocationProvider } from '../location/LocationProviderFactory';
import { getLineById, stationsById } from '../data/stations';
import { PURPLE_LINE_UNDERGROUND_SEGMENT_IDS } from '../data/lines/purpleLine';
import { GREEN_LINE_UNDERGROUND_SEGMENT_IDS } from '../data/lines/greenLine';
import { useJourneyStore } from '../store/journeyStore';
import { ensureNotificationChannels, JOURNEY_PROGRESS_CHANNEL_ID } from './notificationChannels';
import { dismissJourneyNotification, JOURNEY_NOTIFICATION_ID, showOrUpdateJourneyNotification } from './journeyNotification';
import { dismissArrivalAlarm, showArrivalAlarm } from './alarmNotification';
import { speakAnnouncement } from '../tts/ttsService';

const UNDERGROUND_SEGMENT_IDS_BY_LINE: Record<string, Set<string>> = {
  purple: PURPLE_LINE_UNDERGROUND_SEGMENT_IDS,
  green: GREEN_LINE_UNDERGROUND_SEGMENT_IDS,
};

let currentEngine: JourneyEngine | null = null;
let unsubscribeEngine: (() => void) | null = null;
let unsubscribeAlerts: (() => void) | null = null;
let resolveServiceStop: (() => void) | null = null;

/**
 * Registers the long-running task notifee runs for as long as the
 * foreground-service notification is displayed. The task itself does no
 * work — JourneyEngine ticks independently on its own timers — it just
 * keeps the service alive until stopJourneyForegroundService() resolves it.
 * Call this once at app startup (see App.tsx).
 */
export function registerJourneyForegroundService(): void {
  notifee.registerForegroundService(
    () =>
      new Promise<void>(resolve => {
        resolveServiceStop = resolve;
      }),
  );
}

export interface StartJourneyParams {
  lineId: string;
  destinationStationId: string;
}

export async function startJourneyForegroundService({ lineId, destinationStationId }: StartJourneyParams): Promise<void> {
  const line = getLineById(lineId);
  if (!line) throw new Error(`Unknown line "${lineId}"`);

  const destinationName = stationsById[destinationStationId]?.name ?? 'your stop';
  await ensureNotificationChannels();

  await notifee.displayNotification({
    id: JOURNEY_NOTIFICATION_ID,
    title: `Heading to ${destinationName}`,
    body: 'Waiting for GPS…',
    android: {
      channelId: JOURNEY_PROGRESS_CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      smallIcon: 'ic_launcher',
    },
  });

  const { settings } = useJourneyStore.getState();
  const provider = settings.simulateMode
    ? createLocationProvider('mock', {
        line,
        stationsById,
        playbackSpeedMultiplier: settings.simulatePlaybackSpeed,
        deadZoneStationIds: UNDERGROUND_SEGMENT_IDS_BY_LINE[line.id],
      })
    : createLocationProvider('real');

  const engine = new JourneyEngine(line, stationsById, destinationStationId, provider);
  currentEngine = engine;
  useJourneyStore.getState().startJourney(lineId, destinationStationId);

  unsubscribeEngine = engine.onUpdate(state => {
    useJourneyStore.getState().updateEngineState(state);
    const boardingOrder = engine.getBoardingOrder();
    const totalStops = boardingOrder !== null ? Math.abs(engine.getDestinationOrder() - boardingOrder) : null;
    showOrUpdateJourneyNotification(state, stationsById, { destinationName, totalStops }).catch(err =>
      console.warn('Failed to update journey notification', err),
    );
  });

  unsubscribeAlerts = engine.onAlertTransition(event => {
    handleAlertTransition(event.to, destinationName);
  });

  engine.start();
}

function handleAlertTransition(alertState: AlertState, destinationName: string): void {
  switch (alertState) {
    case 'TWO_STOPS_OUT':
      Vibration.vibrate(200);
      speakAnnouncement(`2 stops to ${destinationName}`).catch(() => undefined);
      break;
    case 'ONE_STOP_OUT':
      Vibration.vibrate([0, 200, 100, 200]);
      speakAnnouncement(`Next stop is ${destinationName}`).catch(() => undefined);
      break;
    case 'ARRIVING':
      Vibration.vibrate([0, 300, 150, 300, 150, 300]);
      break;
    case 'ARRIVED':
      showArrivalAlarm(destinationName).catch(err => console.warn('Failed to show arrival alarm', err));
      speakAnnouncement(`Arrived at ${destinationName}. Time to get off.`).catch(() => undefined);
      break;
    case 'EXITED_CORRIDOR':
      stopJourneyForegroundService().catch(err => console.warn('Failed to stop journey after corridor exit', err));
      break;
    default:
      break;
  }
}

export async function stopJourneyForegroundService(): Promise<void> {
  currentEngine?.stop();
  currentEngine = null;
  unsubscribeEngine?.();
  unsubscribeEngine = null;
  unsubscribeAlerts?.();
  unsubscribeAlerts = null;

  await dismissJourneyNotification();
  await dismissArrivalAlarm();
  useJourneyStore.getState().resetJourney();

  if (resolveServiceStop) {
    resolveServiceStop();
    resolveServiceStop = null;
  }
}

export function getCurrentJourneyEngine(): JourneyEngine | null {
  return currentEngine;
}
