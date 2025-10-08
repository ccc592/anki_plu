import { withStorage } from '@shared/storage';

export interface OperationEntry {
  captureId: string;
  sourceUrl: string;
  startedAt: number;
  completedAt: number;
  summary: {
    added: number;
    duplicates: number;
    failures: number;
  };
  errors: Array<{ cardId: string; message: string }>;
}

const STORAGE_KEY = 'ankiAssistantOperationLogs';
const MAX_ENTRIES = 10;

const readEntries = async (): Promise<OperationEntry[]> => {
  const storage = withStorage('local');
  const result = await storage.get(STORAGE_KEY);
  const entries = result?.[STORAGE_KEY];
  if (!entries) {
    return [];
  }
  return Array.isArray(entries) ? (entries as OperationEntry[]) : [];
};

const writeEntries = async (entries: OperationEntry[]) => {
  const storage = withStorage('local');
  await storage.set({ [STORAGE_KEY]: entries.slice(0, MAX_ENTRIES) });
};

export const appendOperationEntry = async (entry: OperationEntry) => {
  const entries = await readEntries();
  entries.unshift(entry);
  await writeEntries(entries);
};

export const listOperationEntries = async (): Promise<OperationEntry[]> => readEntries();

export const clearOperationEntries = async () => writeEntries([]);
