import React, { useEffect } from 'react';
import type { CandidateCard, CaptureResponse, UserPreferencesSnapshot } from '@messaging/schemas';
import { useCardStore } from './state/useCardStore';
import { CardList } from './components/CardList';
import { CardEditor } from './components/CardEditor';
import { DeckControls } from './components/DeckControls';
import { SubmitFooter } from './components/SubmitFooter';
import { StatusPanel } from './components/StatusPanel';
import { usePreferencesStore } from './state/usePreferences';

const normalizeCards = (cards: CandidateCard[]): CandidateCard[] =>
  cards.map((card) => ({
    ...card,
    selected: card.selected ?? true,
    status: card.status ?? 'draft'
  }));

const handleClose = () => {
  // Call the unmount function exposed by content script
  if (typeof window !== 'undefined' && '__ankiAssistantUnmount' in window) {
    (window as { __ankiAssistantUnmount?: () => void }).__ankiAssistantUnmount?.();
  }
};

export const App: React.FC = () => {
  const cards = useCardStore((state) => state.cards);
  useEffect(() => {
    void usePreferencesStore.getState().hydrate();
  }, []);
  const sourceHtml = useCardStore((state) => state.sourceHtml);
  const activeCardId = useCardStore((state) => state.activeCardId);
  const setCards = useCardStore((state) => state.setCards);
  const toggleCard = useCardStore((state) => state.toggleCard);
  const setActiveCard = useCardStore((state) => state.setActiveCard);

  // Listen to custom events from shadow DOM instead of chrome.runtime messages
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
        const preview = payload.sourceHtml ?? '';
        setCards(normalizeCards(payload.cards), {
          config: configSnapshot,
          sourceHtml: preview,
          captureId: payload.captureId
        });
      }

      if (type === 'submission:card-status') {
        const payload = message as {
          payload: { captureId: string; cardId: string; status: CandidateCard['status']; errorDetails?: string | null };
        };
        useCardStore.getState().updateCard(payload.payload.cardId, {
          status: payload.payload.status,
          errorDetails: payload.payload.errorDetails ?? undefined
        });
      }
    };

    // Listen on shadow root or document
    const target = document.getRootNode() as ShadowRoot | Document;
    target.addEventListener('anki-assistant-message', listener);
    
    return () => {
      target.removeEventListener('anki-assistant-message', listener);
    };
  }, [setCards]);

  // Handle ESC key to close overlay
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr',
        height: '100%',
        background: 'rgba(16, 24, 32, 0.95)',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative'
      }}
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          width: '2rem',
          height: '2rem',
          border: 'none',
          borderRadius: '0.5rem',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#fca5a5',
          cursor: 'pointer',
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          padding: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          e.currentTarget.style.color = '#fca5a5';
        }}
        title="Close (ESC)"
      >
        ✕
      </button>

      {/* Left Column: Card List */}
      <aside
        style={{
          borderRight: '1px solid rgba(148, 163, 184, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <header
          style={{
            padding: '1rem 1rem 0.75rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h2 style={{ 
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#e2e8f0',
              marginBottom: '0.25rem'
            }}>
              卡片候选列表
            </h2>
            <p style={{
              fontSize: '0.7rem',
              color: 'rgba(148, 163, 184, 0.8)'
            }}>
              共 {cards.length} 张 · 已选 {cards.filter(c => c.selected).length} 张
            </p>
          </div>
        </header>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CardList
            cards={cards}
            activeCardId={activeCardId}
            onSelect={setActiveCard}
            onToggle={toggleCard}
          />
        </div>
      </aside>

      {/* Right Column: Editor & Preview */}
      <section
        style={{
          padding: '1.5rem',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {/* Status Panel at Top */}
        <StatusPanel />
        
        {/* Deck/Model/Tags Controls */}
        <DeckControls />
        
        {/* Active Card Editor */}
        <CardEditor />
        
        {/* Original Content Preview */}
        <div>
          <h2 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>
            原文预览
          </h2>
          <div
            id="anki-assistant-source-preview"
            style={{
              background: '#0f172a',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              minHeight: '20vh',
              maxHeight: '40vh',
              overflow: 'auto',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: sourceHtml }}
          />
        </div>
        
        {/* Submit Footer */}
        <SubmitFooter />
      </section>
    </div>
  );
};
