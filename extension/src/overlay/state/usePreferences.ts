import { create } from 'zustand';
import type { UserPreferences } from '@messaging/schemas';
import { getDefaultPreferences, loadPreferences } from '@shared/preferences';

interface PreferencesState {
  preferences: UserPreferences;
  ready: boolean;
  setPreferences: (prefs: UserPreferences) => void;
  hydrate: () => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: getDefaultPreferences(),
  ready: false,
  setPreferences: (prefs) => set({ preferences: prefs, ready: true }),
  hydrate: async () => {
    const prefs = await loadPreferences();
    set({ preferences: prefs, ready: true });
  }
}));

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') {
    return;
  }
  if (message.type === 'preferences:updated') {
    usePreferencesStore.getState().setPreferences(message.payload as UserPreferences);
  }
});

export const usePreferences = () => usePreferencesStore((state) => state.preferences);
