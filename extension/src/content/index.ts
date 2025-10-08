import { buildCaptureRequest } from './selection';
import { mountOverlay, unmountOverlay, sendMessageToOverlay } from './overlay';

const TRIGGER_MESSAGE = 'capture:trigger';

const log = (...args: unknown[]) => console.log('[content]', ...args);
const warn = (...args: unknown[]) => console.warn('[content]', ...args);

const notifyNoSelection = () => {
  warn('No selection detected for capture.');
};

const triggerCapture = async () => {
  const request = await buildCaptureRequest();
  if (!request) {
    notifyNoSelection();
    return;
  }

  try {
    log('Sending capture request to background...');
    await chrome.runtime.sendMessage({
      type: 'capture:start',
      payload: request
    });
  } catch (error) {
    console.error('[content] Failed to dispatch capture request', error);
  }
};

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object') {
    return;
  }

  const { type } = message as { type?: string };

  if (type === TRIGGER_MESSAGE) {
    void triggerCapture();
    return;
  }

  // When background sends capture:ready, mount overlay and forward the data
  if (type === 'capture:ready') {
    log('Received capture:ready, mounting overlay...');
    mountOverlay();
    // Forward the message to the overlay
    sendMessageToOverlay(message);
    return;
  }

  // Forward all other messages to overlay if it's mounted
  if (type?.startsWith('submission:')) {
    sendMessageToOverlay(message);
  }
});

// Export unmount function for overlay to call when closing
if (typeof window !== 'undefined') {
  // @ts-expect-error expose for overlay to call
  window.__ankiAssistantUnmount = unmountOverlay;
}

// Support manual invocation in development via window hook.
if (import.meta.env.MODE === 'development') {
  // @ts-expect-error expose helper for debugging
  window.__ankiAssistantTrigger = triggerCapture;
}
