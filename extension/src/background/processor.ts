import type { PreparedCard } from './dedupe';
import { submissionQueue, type QueueItem } from './queue';
import { MediaDownloader } from './mediaDownloader';
import { AnkiClient } from './ankiClient';
import { appendOperationEntry } from './operationLog';
import type { MediaPolicy } from '@messaging/schemas';
import { getSyntaxHighlightCss } from '@shared/htmlCleaner';

interface ProcessOutcome {
  card: PreparedCard;
  status: PreparedCard['status'];
  errorDetails?: string;
}

const FRONT_FIELD = 'Front';
const BACK_FIELD = 'Back';

const hashTag = (hash: string) => `hash:${hash}`;

export class QueueProcessor {
  private processing = false;

  private readonly downloader = new MediaDownloader();

  private readonly anki = new AnkiClient();

  private knownDecks = new Set<string>();

  start() {
    submissionQueue.on('enqueue', () => {
      void this.processNext();
    });
    void this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    const item = submissionQueue.peek();
    if (!item) {
      return;
    }

    this.processing = true;
    submissionQueue.dequeue();

    try {
      const outcomes = await this.processItem(item);
      chrome.runtime.sendMessage({
        type: 'submission:result',
        payload: {
          captureId: item.captureId,
          queuedCardIds: outcomes.map((outcome) => outcome.card.cardId),
          summary: {
            queued: outcomes.filter((outcome) => outcome.status === 'added').length,
            duplicates: outcomes.filter((outcome) => outcome.status === 'duplicate').length,
            failures: outcomes.filter((outcome) => outcome.status?.startsWith('failed')).length
          }
        }
      });
    } catch (error) {
      console.error('[processor] Failed to process queue item', error);
    } finally {
      this.processing = false;
      if (submissionQueue.size() > 0) {
        void this.processNext();
      }
    }
  }

  private async ensureDeck(deckName: string) {
    if (this.knownDecks.has(deckName)) {
      return;
    }
    try {
      const decks = await this.anki.deckNames();
      decks.forEach((deck) => this.knownDecks.add(deck));
      if (!this.knownDecks.has(deckName)) {
        await this.anki.createDeck(deckName);
        this.knownDecks.add(deckName);
      }
    } catch (error) {
      console.warn('[processor] Unable to ensure deck', deckName, error);
    }
  }

  private async processItem(item: QueueItem): Promise<ProcessOutcome[]> {
    const policy = item.request.mediaPolicy as MediaPolicy | undefined;
    const outcomes: ProcessOutcome[] = [];
    const startedAt = Date.now();

    for (const card of item.cards) {
      const outcome = await this.processCard(card, item.captureId, policy, item.request.dedupeStrategy !== 'bypass');
      outcomes.push(outcome);
    }

    const completedAt = Date.now();
    const summary = {
      added: outcomes.filter((outcome) => outcome.status === 'added').length,
      duplicates: outcomes.filter((outcome) => outcome.status === 'duplicate').length,
      failures: outcomes.filter((outcome) => outcome.status?.startsWith('failed')).length
    };

    const errors = outcomes
      .filter((outcome) => outcome.status?.startsWith('failed') && outcome.errorDetails)
      .map((outcome) => ({ cardId: outcome.card.cardId, message: outcome.errorDetails ?? 'Unknown error' }));

    await appendOperationEntry({
      captureId: item.captureId,
      sourceUrl: item.cards[0]?.tags?.find((tag) => tag.startsWith('source:')) ?? 'unknown',
      startedAt,
      completedAt,
      summary,
      errors
    });

    return outcomes;
  }

  private async processCard(
    card: PreparedCard,
    captureId: string,
    policy?: MediaPolicy,
    respectDedupe = true
  ): Promise<ProcessOutcome> {
    try {
      const download = await this.downloader.processCard(card, policy);
      const processedCard = download.card;

      for (const asset of download.assets) {
        if (asset.status !== 'stored' || !asset.data) {
          continue;
        }
        await this.anki.storeMediaFile({
          filename: asset.filename,
          data: asset.data,
          overwrite: true
        });
      }

      if (respectDedupe && processedCard.hash) {
        const duplicates = await this.anki.findNotes(`tag:"${hashTag(processedCard.hash)}"`);
        if (duplicates.length > 0) {
          this.emitStatus(captureId, processedCard.cardId, 'duplicate');
          return { card: processedCard, status: 'duplicate' };
        }
      }

      const deckName = processedCard.deckId ?? 'Default';
      await this.ensureDeck(deckName);

      const note = {
        deckName,
        modelName: processedCard.modelId ?? 'Basic',
        fields: {
          [FRONT_FIELD]: processedCard.frontHtml,
          [BACK_FIELD]: processedCard.backHtml + getSyntaxHighlightCss()
        },
        options: {
          allowDuplicate: false,
          duplicateScope: 'deck'
        },
        tags: processedCard.tags ?? []
      };

      const noteId = await this.anki.addNote({ note });
      this.emitStatus(captureId, processedCard.cardId, 'added');
      return { card: processedCard, status: noteId ? 'added' : 'failed:anki' };
    } catch (error) {
      console.error('[processor] Card failed', card.cardId, error);
      const reason = error instanceof Error ? error.message : 'Unknown error';
      const status: ProcessOutcome['status'] = AnkiClient.isWhitelistError(error)
        ? 'failed:anki'
        : 'failed:anki';
      this.emitStatus(captureId, card.cardId, status, reason);
      return { card, status, errorDetails: reason };
    }
  }

  private emitStatus(
    captureId: string,
    cardId: string,
    status: ProcessOutcome['status'],
    errorDetails?: string
  ) {
    chrome.runtime.sendMessage({
      type: 'submission:card-status',
      payload: {
        captureId,
        cardId,
        status,
        errorDetails
      }
    });
  }
}

export const queueProcessor = new QueueProcessor();
