import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toast } from '../components/Toast';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

let toastRoot: ReactDOM.Root | null = null;
let toastContainer: HTMLDivElement | null = null;

const ensureToastContainer = (): HTMLDivElement => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'anki-assistant-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    `;
    document.body.appendChild(toastContainer);
    toastRoot = ReactDOM.createRoot(toastContainer);
  }
  return toastContainer;
};

export const showToast = (options: ToastOptions): void => {
  ensureToastContainer();
  
  const handleClose = () => {
    if (toastRoot) {
      toastRoot.unmount();
      toastRoot = null;
    }
    if (toastContainer) {
      toastContainer.remove();
      toastContainer = null;
    }
  };

  if (toastRoot) {
    toastRoot.render(
      <Toast
        message={options.message}
        type={options.type}
        duration={options.duration}
        onClose={handleClose}
      />
    );
  }
};
