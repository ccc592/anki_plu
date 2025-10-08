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

export interface AnkiDiagnosticResult {
  reachable: boolean;
  version?: number;
  corsError?: boolean;
  timeoutError?: boolean;
  networkError?: boolean;
  error?: string;
  suggestion?: string;
}

export class AnkiClient {
  private readonly options: Required<AnkiClientOptions>;

  constructor(options: AnkiClientOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  static isWhitelistError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (
      /please add this origin/i.test(message) ||
      /not in whitelist/i.test(message) ||
      /cors/i.test(message) ||
      /access-control-allow-origin/i.test(message)
    );
  }

  static isCorsError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (
      /cors/i.test(message) ||
      /access-control/i.test(message) ||
      /cross-origin/i.test(message)
    );
  }

  static isNetworkError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (
      /failed to fetch/i.test(message) ||
      /network/i.test(message) ||
      /err_connection/i.test(message)
    );
  }

  static isTimeoutError(error: unknown): boolean {
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }
    const message = error instanceof Error ? error.message : String(error ?? '');
    return /timeout/i.test(message) || /timed out/i.test(message);
  }

  /**
   * 诊断AnkiConnect连接状态
   * 返回详细的诊断信息和建议
   */
  async diagnose(): Promise<AnkiDiagnosticResult> {
    try {
      const version = await this.version();
      return {
        reachable: true,
        version,
        corsError: false,
        timeoutError: false,
        networkError: false
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? '');
      const isCors = AnkiClient.isCorsError(error);
      const isNetwork = AnkiClient.isNetworkError(error);
      const isTimeout = AnkiClient.isTimeoutError(error);

      let suggestion = '';
      if (isCors) {
        suggestion =
          '请在AnkiConnect配置中添加Chrome扩展到白名单：\n' +
          '1. 打开Anki → 工具 → 插件 → AnkiConnect → 配置\n' +
          '2. 在webCorsOriginList中添加：chrome-extension://YOUR_EXTENSION_ID\n' +
          '3. 重启Anki';
      } else if (isTimeout) {
        suggestion =
          '连接超时，请检查：\n' +
          '1. Anki是否已启动\n' +
          '2. AnkiConnect是否运行在端口8765\n' +
          '3. 防火墙是否阻止了连接';
      } else if (isNetwork) {
        suggestion =
          '无法连接到AnkiConnect，请确认：\n' +
          '1. Anki桌面程序已启动\n' +
          '2. AnkiConnect插件已安装（插件代码：2055492159）\n' +
          '3. AnkiConnect服务正在运行';
      } else {
        suggestion = '未知错误，请查看错误详情';
      }

      return {
        reachable: false,
        corsError: isCors,
        timeoutError: isTimeout,
        networkError: isNetwork,
        error: message,
        suggestion
      };
    }
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
