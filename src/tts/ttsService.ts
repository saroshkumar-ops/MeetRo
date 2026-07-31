import Tts from 'react-native-tts';
import { useJourneyStore } from '../store/journeyStore';

let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await Tts.getInitStatus().catch(() => Tts.requestInstallEngine());
      await Tts.setDefaultRate(0.45);
      // Duck (lower, don't stop) whatever the user is already playing —
      // this is the earphone-friendly behavior the "essence" spec asked for,
      // so an announcement doesn't yank music/podcast audio away entirely.
      await Tts.setDucking(true).catch(() => undefined);
    })();
  }
  return initPromise;
}

/** Speaks `text` if the user has TTS announcements enabled in settings. */
export async function speakAnnouncement(text: string): Promise<void> {
  const { settings } = useJourneyStore.getState();
  if (!settings.ttsEnabled) return;
  await ensureInitialized();
  Tts.stop();
  Tts.speak(text);
}

export async function stopSpeaking(): Promise<void> {
  await Tts.stop();
}
