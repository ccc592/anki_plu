import { loadUserPreferences, saveUserPreferences } from './storage';
import type { UserPreferences, UserPreferencesSnapshot } from '@messaging/schemas';
import { createPreferencesSnapshot } from './preferencesSnapshot';

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultDeck: undefined,
  defaultModel: 'Basic',
  tagTemplate: 'from-clip, source:{domain}, date:{YYYY-MM-DD}',
  heuristics: {
    explicitMarkers: true,
    structureHints: true,
    questionMarks: true,
    listTable: false
  },
  htmlAllowlist: {
    tags: ['p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'img'],
    styles: ['font-weight', 'font-style', 'text-align']
  },
  mediaPolicy: {
    downloadExternal: true,
    convertWebP: false,
    concurrency: 3,
    retryLimit: 3,
    maxSizeMB: 5
  },
  shortcut: 'Alt+A',
  clipboardEnabled: false,
  siteAllowlist: [],
  siteBlocklist: [],
  defaultImportMode: 'quick',
  quickImportPosition: 'bottom-right'
};

export const getDefaultPreferences = (): UserPreferences => ({ ...DEFAULT_PREFERENCES });

export const loadPreferences = async (): Promise<UserPreferences> => {
  const stored = await loadUserPreferences();
  if (!stored) {
    return getDefaultPreferences();
  }
  return { ...getDefaultPreferences(), ...stored };
};

export const persistPreferences = async (preferences: UserPreferences): Promise<void> => {
  await saveUserPreferences(preferences);
  await notifyPreferenceChange(preferences);
};

const listeners = new Set<(preferences: UserPreferences) => void>();

export const subscribePreferences = (listener: (preferences: UserPreferences) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyPreferenceChange = async (preferences?: UserPreferences) => {
  const next = preferences ?? (await loadPreferences());
  listeners.forEach((listener) => listener(next));
  chrome.runtime.sendMessage({
    type: 'preferences:updated',
    payload: next
  }).catch(() => {});
};

export const currentSnapshot = async (): Promise<UserPreferencesSnapshot> => {
  const preferences = await loadPreferences();
  return createPreferencesSnapshot(preferences);
};
