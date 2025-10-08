import type {
  CaptureResponse,
  CandidateCard
} from '@messaging/schemas';
import type { RuntimeMessage } from '@messaging/messages';
import { parseRuntimeMessage } from '@messaging/messages';
import { submissionQueue } from './queue';
import { registerCommandListener, registerContextMenus } from './contextMenus';
import { prepareCardsForQueue, prepareCardForQueue } from './dedupe';
import { queueProcessor } from './processor';
import { AnkiClient } from './ankiClient';
import './context';
import { initializeCommandSync } from './commands';

type SendResponse = (response?: unknown) => void;

type CaptureStartMessage = Extract<RuntimeMessage, { type: 'capture:start' }>;

const log = (...args: unknown[]) => console.log('[background]', ...args);
const warn = (...args: unknown[]) => console.warn('[background]', ...args);
const error = (...args: unknown[]) => console.error('[background]', ...args);

const handleCaptureStart = async (
  message: CaptureStartMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
) => {
  try {
    const { payload } = message;
    
    // Cards are now created in content script (has DOM access)
    const cards = payload.cards ?? [];
    
    log(`Received ${cards.length} candidate cards from content script`);

    // Fetch available decks and models from Anki
    log('Attempting to connect to Anki...');
    const ankiClient = new AnkiClient();
    let availableDecks: string[] = [];
    let availableModels: string[] = [];
    
    try {
      log('Calling ankiClient.deckNames()...');
      availableDecks = await ankiClient.deckNames();
      log('deckNames response:', availableDecks);
      
      log('Calling ankiClient.modelNames()...');
      availableModels = await ankiClient.modelNames();
      log('modelNames response:', availableModels);
      
      log(`✅ Successfully fetched ${availableDecks.length} decks and ${availableModels.length} models from Anki`);
      log('Decks:', JSON.stringify(availableDecks));
      log('Models:', JSON.stringify(availableModels));
    } catch (ankiError) {
      error('❌ Failed to fetch decks/models from Anki:', ankiError);
      error('Error details:', ankiError instanceof Error ? ankiError.message : String(ankiError));
      error('Error stack:', ankiError instanceof Error ? ankiError.stack : 'No stack trace');
      // Continue with empty lists
    }

    // Enrich config snapshot with Anki data
    const enrichedSnapshot = {
      ...payload.configSnapshot,
      availableDecks,
      availableModels
    };

    log('Enriched snapshot created:');
    log('  - availableDecks:', enrichedSnapshot.availableDecks);
    log('  - availableModels:', enrichedSnapshot.availableModels);
    log('  - availableDecks length:', enrichedSnapshot.availableDecks?.length);
    log('  - availableModels length:', enrichedSnapshot.availableModels?.length);

    const response: CaptureResponse = {
      captureId: crypto.randomUUID(),
      cards,
      media: [],
      configSnapshot: enrichedSnapshot,
      sourceHtml: payload.htmlFragment
    };

    log('Response object created, configSnapshot.availableDecks:', response.configSnapshot.availableDecks?.length);
    log('Response object created, configSnapshot.availableModels:', response.configSnapshot.availableModels?.length);

    const tabId = sender.tab?.id;
    if (typeof tabId === 'number') {
      log(`Sending capture:ready message to tab ${tabId}...`);
      await chrome.tabs.sendMessage(tabId, {
        type: 'capture:ready',
        payload: response
      });
      log('✅ Message sent successfully');
    } else {
      warn('⚠️ No valid tab ID, cannot send message');
    }

    sendResponse({ ok: true });
  } catch (err) {
    error('Capture processing failed', err);
    const reason = err instanceof Error ? err.message : String(err);
    sendResponse({ ok: false, reason });
  }
};

const handleRetrySubmission = async (
  message: Extract<RuntimeMessage, { type: 'submission:card-retry' }>,
  sendResponse: SendResponse
) => {
  const prepared = await prepareCardForQueue(message.payload.card);
  submissionQueue.enqueue({
    captureId: message.payload.captureId,
    cards: [prepared],
    request: {
      selectedCardIds: [prepared.cardId],
      dedupeStrategy: 'respect'
    },
    enqueuedAt: Date.now(),
    attempts: 0
  });
  sendResponse({ ok: true, queued: submissionQueue.size() });
};

const handleQueueSubmission = async (
  message: Extract<RuntimeMessage, { type: 'submission:queue' }>,
  sendResponse: SendResponse
) => {
  const preparedCards = await prepareCardsForQueue(message.payload.cards);
  submissionQueue.enqueue({
    captureId: message.payload.captureId,
    cards: preparedCards,
    request: message.payload.request,
    enqueuedAt: Date.now(),
    attempts: 0
  });
  sendResponse({ ok: true, queued: submissionQueue.size() });
};

chrome.runtime.onInstalled.addListener(() => {
  log('Service worker installed');
  registerContextMenus();
});

registerCommandListener();
registerContextMenus();
void initializeCommandSync();
queueProcessor.start();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const runtimeMessage = parseRuntimeMessage(message);
    switch (runtimeMessage.type) {
      case 'capture:start':
        handleCaptureStart(runtimeMessage, sender, sendResponse).catch((err) => {
          error('Failed to handle capture message', err);
          sendResponse({ ok: false, reason: err instanceof Error ? err.message : String(err) });
        });
        break;
      case 'submission:queue':
        handleQueueSubmission(runtimeMessage, sendResponse).catch((err) => {
          error('Failed to queue submission', err);
          sendResponse({ ok: false, reason: err instanceof Error ? err.message : String(err) });
        });
        break;
      case 'submission:card-retry':
        handleRetrySubmission(runtimeMessage, sendResponse).catch((err) => {
          error('Failed to retry card', err);
          sendResponse({ ok: false, reason: err instanceof Error ? err.message : String(err) });
        });
        break;
      default:
        warn('Unhandled message type', runtimeMessage.type);
        sendResponse({ ok: false, reason: `Unhandled message ${runtimeMessage.type}` });
    }
  } catch (err) {
    error('Failed to process runtime message', err);
    const reason = err instanceof Error ? err.message : 'Unknown error';
    sendResponse({ ok: false, reason });
  }

  return true;
});
