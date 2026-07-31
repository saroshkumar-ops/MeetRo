import { create } from 'zustand';
import type { EngineState } from '../engine/types';

export type JourneyPhase = 'idle' | 'active' | 'ended';

export interface Settings {
  ttsEnabled: boolean;
  alertStyle: 'default' | 'vibrationOnly' | 'silent';
  /** Dev-only: drive the journey from MockLocationProvider instead of real GPS. */
  simulateMode: boolean;
  /** 1 = real-time, 10 = 10x fast-forward, etc. Only used when simulateMode is on. */
  simulatePlaybackSpeed: number;
}

interface JourneyStoreState {
  phase: JourneyPhase;
  lineId: string | null;
  destinationStationId: string | null;
  engineState: EngineState | null;
  settings: Settings;

  startJourney: (lineId: string, destinationStationId: string) => void;
  updateEngineState: (state: EngineState) => void;
  endJourney: () => void;
  resetJourney: () => void;
  updateSettings: (partial: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  ttsEnabled: true,
  alertStyle: 'default',
  simulateMode: false,
  simulatePlaybackSpeed: 1,
};

export const useJourneyStore = create<JourneyStoreState>((set) => ({
  phase: 'idle',
  lineId: null,
  destinationStationId: null,
  engineState: null,
  settings: defaultSettings,

  startJourney: (lineId, destinationStationId) =>
    set({ phase: 'active', lineId, destinationStationId, engineState: null }),

  updateEngineState: (state) => set({ engineState: state }),

  endJourney: () => set({ phase: 'ended' }),

  resetJourney: () => set({ phase: 'idle', lineId: null, destinationStationId: null, engineState: null }),

  updateSettings: (partial) => set(s => ({ settings: { ...s.settings, ...partial } })),
}));
