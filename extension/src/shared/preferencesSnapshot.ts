import type { UserPreferences, UserPreferencesSnapshot } from '@messaging/schemas';
import { UserPreferencesSnapshotSchema } from '@messaging/schemas';

export interface SnapshotContext {
  decks?: string[];
  models?: string[];
}

export const createPreferencesSnapshot = (
  preferences: UserPreferences,
  context: SnapshotContext = {}
): UserPreferencesSnapshot =>
  UserPreferencesSnapshotSchema.parse({
    ...preferences,
    availableDecks: context.decks ?? [],
    availableModels: context.models ?? []
  });

export const applySnapshotDefaults = (
  snapshot: UserPreferencesSnapshot,
  incoming: Partial<UserPreferences>
): UserPreferences => ({
  defaultDeck: incoming.defaultDeck ?? snapshot.defaultDeck ?? undefined,
  defaultModel: incoming.defaultModel ?? snapshot.defaultModel,
  tagTemplate: incoming.tagTemplate ?? snapshot.tagTemplate,
  heuristics: incoming.heuristics ?? snapshot.heuristics,
  htmlAllowlist: incoming.htmlAllowlist ?? snapshot.htmlAllowlist,
  mediaPolicy: incoming.mediaPolicy ?? snapshot.mediaPolicy,
  shortcut: incoming.shortcut ?? snapshot.shortcut,
  clipboardEnabled: incoming.clipboardEnabled ?? snapshot.clipboardEnabled,
  siteAllowlist: incoming.siteAllowlist ?? snapshot.siteAllowlist,
  siteBlocklist: incoming.siteBlocklist ?? snapshot.siteBlocklist
});
