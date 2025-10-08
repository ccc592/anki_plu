import React, { useState, useEffect } from 'react';
import type { CandidateCard, CaptureResponse, UserPreferencesSnapshot } from '@messaging/schemas';
import { App as FullEditorApp } from './App';
import { QuickImportPopup } from './QuickImportPopup';
import { useCardStore } from './state/useCardStore';
import { usePreferencesStore } from './state/usePreferences';

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(2px)',
  zIndex: 1
};

const normalizeCards = (cards: CandidateCard[]): CandidateCard[] =>
  cards.map((card) => ({
    ...card,
    selected: card.selected ?? true,
    status: card.status ?? 'draft'
  }));

const handleClose = () => {
  if (typeof window !== 'undefined' && '__ankiAssistantUnmount' in window) {
    (window as { __ankiAssistantUnmount?: () => void }).__ankiAssistantUnmount?.();
  }
};

export const AppContainer: React.FC = () => {
  const cards = useCardStore((state) => state.cards);
  const setCards = useCardStore((state) => state.setCards);
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  // Hydrate preferences on mount
  useEffect(() => {
    void usePreferencesStore.getState().hydrate();
  }, []);

  // Listen to capture:ready event and set cards with configSnapshot
  useEffect(() => {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail;

      if (!message || typeof message !== 'object') {
        return;
      }

      const { type } = message as { type?: string };
      if (type === 'capture:ready') {
        const payload = (message as { payload: CaptureResponse }).payload;
        const configSnapshot: UserPreferencesSnapshot | undefined = payload.configSnapshot;

        console.log('[AppContainer] Received capture:ready');
        console.log('[AppContainer] configSnapshot:', configSnapshot);
        console.log('[AppContainer] availableDecks:', configSnapshot?.availableDecks);
        console.log('[AppContainer] availableModels:', configSnapshot?.availableModels);

        const normalized = normalizeCards(payload.cards ?? []);
        
        // IMPORTANT: Pass configSnapshot to CardStore
        setCards(normalized, {
          config: configSnapshot,
          sourceHtml: payload.sourceHtml,
          captureId: payload.captureId
        });

        console.log('[AppContainer] Cards set with config');
      }
    };

    window.addEventListener('anki-assistant-message', listener);
    return () => {
      window.removeEventListener('anki-assistant-message', listener);
    };
  }, [setCards]);

  const cardCount = cards.filter(c => c.selected !== false).length;

  const switchToFullEditor = () => {
    setMode('full');
  };

  if (mode === 'full') {
    // Full screen editor mode
    return <FullEditorApp />;
  }

  // Quick import mode with backdrop
  return (
    <>
      {/* Backdrop */}
      <div 
        style={backdropStyle} 
        onClick={handleClose}
      />
      
      {/* Quick Import Popup */}
      <QuickImportPopup
        cardCount={cardCount}
        onSwitchToFullEditor={switchToFullEditor}
        onClose={handleClose}
      />
    </>
  );
};
