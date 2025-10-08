import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@overlay/App';

const OVERLAY_ID = 'anki-assistant-overlay-root';
const SHADOW_HOST_ID = 'anki-assistant-shadow-host';

let shadowRoot: ShadowRoot | null = null;
let reactRoot: ReactDOM.Root | null = null;
let messageListeners: ((message: unknown) => void)[] = [];
let isReady = false;
let pendingMessages: unknown[] = [];

const log = (...args: unknown[]) => console.log('[overlay]', ...args);

/**
 * Creates and injects overlay UI into the page using Shadow DOM for isolation
 */
export const mountOverlay = (): void => {
  // If already mounted, just show it
  const existing = document.getElementById(SHADOW_HOST_ID);
  if (existing && shadowRoot) {
    existing.style.display = 'block';
    log('Overlay already mounted, showing it');
    return;
  }

  try {
    // Create shadow host
    const shadowHost = document.createElement('div');
    shadowHost.id = SHADOW_HOST_ID;
    shadowHost.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      display: block;
    `;
    
    // Attach shadow DOM for style isolation
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    
    // Create container inside shadow DOM
    const container = document.createElement('div');
    container.id = OVERLAY_ID;
    container.style.cssText = `
      width: 100%;
      height: 100%;
      display: grid;
    `;
    
    // Inject minimal CSS reset for shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      #${OVERLAY_ID} {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
    `;
    
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(container);
    document.body.appendChild(shadowHost);
    
    // Mount React app
    reactRoot = ReactDOM.createRoot(container);
    
    // Import AppContainer instead of App for mode switching
    import('@overlay/AppContainer').then(({ AppContainer }) => {
      if (reactRoot) {
        reactRoot.render(
          React.createElement(React.StrictMode, null,
            React.createElement(AppContainer)
          )
        );
        
        // Mark as ready and flush pending messages after a short delay to ensure React has rendered
        setTimeout(() => {
          isReady = true;
          log('Overlay ready, flushing', pendingMessages.length, 'pending messages');
          pendingMessages.forEach((msg) => {
            sendMessageToOverlay(msg);
          });
          pendingMessages = [];
        }, 50);
      }
    }).catch((error) => {
      console.error('[overlay] Failed to load AppContainer', error);
      // Fallback to App
      reactRoot?.render(
        React.createElement(React.StrictMode, null,
          React.createElement(App)
        )
      );
      setTimeout(() => {
        isReady = true;
        pendingMessages.forEach((msg) => sendMessageToOverlay(msg));
        pendingMessages = [];
      }, 50);
    });
    
    log('Overlay mounted successfully');
  } catch (error) {
    console.error('[overlay] Failed to mount overlay', error);
  }
};

/**
 * Removes overlay from the page
 */
export const unmountOverlay = (): void => {
  const shadowHost = document.getElementById(SHADOW_HOST_ID);
  
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  
  if (shadowHost) {
    shadowHost.remove();
  }
  
  shadowRoot = null;
  messageListeners = [];
  isReady = false;
  pendingMessages = [];
  
  log('Overlay unmounted');
};

/**
 * Hides overlay without unmounting (for potential reuse)
 */
export const hideOverlay = (): void => {
  const shadowHost = document.getElementById(SHADOW_HOST_ID);
  if (shadowHost) {
    shadowHost.style.display = 'none';
    log('Overlay hidden');
  }
};

/**
 * Shows previously hidden overlay
 */
export const showOverlay = (): void => {
  const shadowHost = document.getElementById(SHADOW_HOST_ID);
  if (shadowHost) {
    shadowHost.style.display = 'block';
    log('Overlay shown');
  }
};

/**
 * Forwards messages to the overlay's React app
 * Since the app is in shadow DOM, we dispatch custom events
 */
export const sendMessageToOverlay = (message: unknown): void => {
  if (!shadowRoot) {
    log('Cannot send message - overlay not mounted');
    return;
  }
  
  // If overlay is not ready yet, queue the message
  if (!isReady) {
    log('Overlay not ready yet, queuing message');
    pendingMessages.push(message);
    return;
  }
  
  // Dispatch custom event that React components can listen to
  const event = new CustomEvent('anki-assistant-message', {
    detail: message,
    bubbles: true,
    composed: true // Allow event to cross shadow DOM boundary
  });
  
  shadowRoot.dispatchEvent(event);
};

/**
 * Register a listener for messages from background/content scripts
 */
export const onOverlayMessage = (callback: (message: unknown) => void): (() => void) => {
  messageListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    messageListeners = messageListeners.filter((listener) => listener !== callback);
  };
};
