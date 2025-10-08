import { loadPreferences, persistPreferences } from '@shared/preferences';
import type { UserPreferences } from '@messaging/schemas';

let cachedPreferences: UserPreferences | null = null;

export const initBackgroundContext = async () => {
  cachedPreferences = await loadPreferences();
};

export const getCachedPreferences = async (): Promise<UserPreferences> => {
  if (!cachedPreferences) {
    cachedPreferences = await loadPreferences();
  }
  return cachedPreferences;
};

export const updateCachedPreferences = async (preferences: UserPreferences) => {
  cachedPreferences = preferences;
  await persistPreferences(preferences);
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return;
  }
  switch (message.type) {
    case 'preferences:get':
      getCachedPreferences()
        .then((prefs) => sendResponse({ ok: true, preferences: prefs }))
        .catch((error) => sendResponse({ ok: false, reason: error instanceof Error ? error.message : String(error) }));
      return true;
    case 'preferences:set':
      updateCachedPreferences(message.payload as UserPreferences)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, reason: error instanceof Error ? error.message : String(error) }));
      return true;
    default:
      break;
  }
  return undefined;
});

void initBackgroundContext();
