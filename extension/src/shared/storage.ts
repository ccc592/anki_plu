import { z } from 'zod';
import {
  SelectionCaptureSchema,
  UserPreferencesSchema
} from '@messaging/schemas';

const SYNC_KEY_PREFERENCES = 'userPreferences';
const LOCAL_KEY_CAPTURES = 'recentCaptures';

const ensureStorageArea = (area: 'sync' | 'local'): chrome.storage.StorageArea => {
  const storage = globalThis.chrome?.storage?.[area];
  if (!storage) {
    throw new Error(`chrome.storage.${area} unavailable`);
  }
  return storage;
};

export type StoredPreferences = z.output<typeof UserPreferencesSchema>;
export type StoredCapture = z.output<typeof SelectionCaptureSchema>;

export const loadUserPreferences = async (): Promise<StoredPreferences | undefined> => {
  const storage = ensureStorageArea('sync');
  const items = await storage.get(SYNC_KEY_PREFERENCES);
  const raw = items?.[SYNC_KEY_PREFERENCES];
  if (raw === undefined) {
    return undefined;
  }
  return UserPreferencesSchema.parse(raw);
};

export const saveUserPreferences = async (preferences: StoredPreferences): Promise<void> => {
  const storage = ensureStorageArea('sync');
  await storage.set({ [SYNC_KEY_PREFERENCES]: preferences });
};

export const loadRecentCaptures = async (): Promise<StoredCapture[]> => {
  const storage = ensureStorageArea('local');
  const items = await storage.get(LOCAL_KEY_CAPTURES);
  const raw = items?.[LOCAL_KEY_CAPTURES];
  if (!raw) {
    return [];
  }
  return z.array(SelectionCaptureSchema).parse(raw);
};

export const saveRecentCaptures = async (captures: StoredCapture[]): Promise<void> => {
  const storage = ensureStorageArea('local');
  await storage.set({ [LOCAL_KEY_CAPTURES]: captures });
};

export const clearStorageKeys = async (area: 'sync' | 'local', keys: string[]): Promise<void> => {
  const storageArea = ensureStorageArea(area);
  await storageArea.remove(keys);
};

export const withStorage = (area: 'sync' | 'local'): chrome.storage.StorageArea => ensureStorageArea(area);
