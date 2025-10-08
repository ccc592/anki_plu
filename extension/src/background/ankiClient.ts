interface AnkiRequest<TParams> {
  action: string;
  version: number;
  params: TParams;
}

interface AnkiResponse<TResult> {
  result: TResult | null;
  error: string | null;
}

export interface AnkiClientOptions {
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  backoffBaseMs?: number;
}

const DEFAULT_OPTIONS: Required<AnkiClientOptions> = {
  endpoint: 'http://127.0.0.1:8765',
  timeoutMs: 3000,
  maxRetries: 3,
  backoffBaseMs: 500
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type FindNotesParams = {
  query: string;
};

export type AddNoteParams = {
  note: Record<string, unknown>;
};

export type StoreMediaParams = {
  filename: string;
  data: string;
  overwrite?: boolean;
};

export class AnkiClient {
  private readonly options: Required<AnkiClientOptions>;

  constructor(options: AnkiClientOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static isWhitelistError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /please add this origin/i.test(message) || /not in whitelist/i.test(message);
  }

  async invoke<TParams extends Record<string, unknown>, TResult>(
    action: string,
    params: TParams,
    attempt = 0
  ): Promise<TResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildRequest(action, params)),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AnkiResponse<TResult>;
      if (payload.error) {
        throw new Error(payload.error);
      }

      return payload.result as TResult;
    } catch (error) {
      if (attempt >= this.options.maxRetries) {
        throw error;
      }
      const backoff = this.options.backoffBaseMs * 2 ** attempt;
      await delay(backoff);
      return this.invoke(action, params, attempt + 1);
    } finally {
      clearTimeout(timeout);
    }
  }

  deckNames(): Promise<string[]> {
    return this.invoke('deckNames', {});
  }

  modelNames(): Promise<string[]> {
    return this.invoke('modelNames', {});
  }

  modelFieldNames(modelName: string): Promise<string[]> {
    return this.invoke('modelFieldNames', { modelName });
  }

  createDeck(deckName: string): Promise<number> {
    return this.invoke('createDeck', { deck: deckName });
  }

  storeMediaFile(params: StoreMediaParams): Promise<boolean> {
    return this.invoke('storeMediaFile', params);
  }

  addNote(params: AddNoteParams): Promise<number> {
    return this.invoke('addNote', params);
  }

  addNotes(notes: Record<string, unknown>[]): Promise<number[]> {
    return this.invoke('addNotes', { notes });
  }

  findNotes(query: string): Promise<number[]> {
    return this.invoke('findNotes', { query });
  }

  version(): Promise<number> {
    return this.invoke('version', {});
  }

  private buildRequest<TParams extends Record<string, unknown>>(action: string, params: TParams): AnkiRequest<TParams> {
    return {
      action,
      version: 6,
      params
    };
  }
}
