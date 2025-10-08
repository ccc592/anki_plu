import type { UserPreferences } from '@messaging/schemas';
import { subscribePreferences, loadPreferences } from '@shared/preferences';

const COMMAND_ID = 'trigger-capture';

type CommandUpdater = (details: { name: string; shortcut: string }) => Promise<void> | void;

export const applyShortcut = async (shortcut: string) => {
  const updater = (chrome.commands as unknown as { update?: CommandUpdater }).update;
  if (typeof updater !== 'function') {
    console.warn('[commands] chrome.commands.update is unavailable in this runtime');
    return;
  }

  try {
    await updater({ name: COMMAND_ID, shortcut });
  } catch (error) {
    console.warn('[commands] Failed to update shortcut', error);
  }
};

const handlePreferenceUpdate = (preferences: UserPreferences) => {
  if (preferences.shortcut) {
    void applyShortcut(preferences.shortcut);
  }
};

export const initializeCommandSync = async () => {
  const current = await loadPreferences();
  handlePreferenceUpdate(current);
  subscribePreferences(handlePreferenceUpdate);
};
