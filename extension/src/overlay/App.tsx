import React, { useEffect } from 'react';
import type { CandidateCard, CaptureResponse, UserPreferencesSnapshot } from '@messaging/schemas';
import { useCardStore } from './state/useCardStore';
import { CardList } from './components/CardList';
import { CardEditor } from './components/CardEditor';
import { DeckControls } from './components/DeckControls';
import { SubmitFooter } from './components/SubmitFooter';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import { usePreferencesStore } from './state/usePreferences';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { submitSelectedCards } from './actions/submitCards';

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

export const App: React.FC = () => {
  const cards = useCardStore((state) => state.cards);
  useEffect(() => {
    void usePreferencesStore.getState().hydrate();
  }, []);
  const setCards = useCardStore((state) => state.setCards);
  const activeCardId = useCardStore((state) => state.activeCardId);
  const setActiveCard = useCardStore((state) => state.setActiveCard);
  const toggleCard = useCardStore((state) => state.toggleCard);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSubmit: () => {
      void submitSelectedCards();
    },
    onSelectNext: () => {
      const currentIndex = cards.findIndex(c => c.cardId === activeCardId);
      if (currentIndex < cards.length - 1) {
        setActiveCard(cards[currentIndex + 1].cardId);
      }
    },
    onSelectPrevious: () => {
      const currentIndex = cards.findIndex(c => c.cardId === activeCardId);
      if (currentIndex > 0) {
        setActiveCard(cards[currentIndex - 1].cardId);
      }
    },
    onToggleCurrent: () => {
      if (activeCardId) {
        const card = cards.find(c => c.cardId === activeCardId);
        if (card) {
          toggleCard(activeCardId, !card.selected);
        }
      }
    },
    onSelectAll: () => {
      const allSelected = cards.every(c => c.selected);
      cards.forEach(card => {
        toggleCard(card.cardId, !allSelected);
      });
    },
    onClose: handleClose
  });

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

        console.log('[App] Received capture:ready');
        console.log('[App] configSnapshot:', configSnapshot);
        console.log('[App] availableDecks:', configSnapshot?.availableDecks);
        console.log('[App] availableModels:', configSnapshot?.availableModels);

        if (configSnapshot) {
          usePreferencesStore.setState(configSnapshot);
        }

        const normalized = normalizeCards(payload.cards ?? []);
        
        // IMPORTANT: Pass configSnapshot to CardStore
        setCards(normalized, {
          config: configSnapshot,
          sourceHtml: payload.sourceHtml,
          captureId: payload.captureId
        });

        if (normalized.length > 0) {
          setActiveCard(normalized[0].cardId);
        }
      }
    };

    window.addEventListener('anki-assistant-message', listener);
    return () => {
      window.removeEventListener('anki-assistant-message', listener);
    };
  }, [setCards, setActiveCard]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
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
          top: '0.75rem',
          right: '0.75rem',
          zIndex: 1000,
          width: '1.75rem',
          height: '1.75rem',
          border: 'none',
          borderRadius: '0.375rem',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#fca5a5',
          cursor: 'pointer',
          fontSize: '1.1rem',
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
        title="关闭 (ESC)"
      >
        ✕
      </button>

      {/* Left: Card List */}
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
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
          }}
        >
          <h2 style={{ 
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '0.25rem'
          }}>
            卡片列表
          </h2>
          <p style={{
            fontSize: '0.7rem',
            color: 'rgba(148, 163, 184, 0.8)'
          }}>
            共 {cards.length} 张 · 已选 {cards.filter(c => c.selected).length} 张
          </p>
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 0.5rem' }}>
          <BulkActionsToolbar
            totalCount={cards.length}
            selectedCount={cards.filter(c => c.selected).length}
            onSelectAll={() => {
              cards.forEach(card => toggleCard(card.cardId, true));
            }}
            onDeselectAll={() => {
              cards.forEach(card => toggleCard(card.cardId, false));
            }}
            onDeleteSelected={() => {
              const remainingCards = cards.filter(c => !c.selected);
              setCards(remainingCards);
              if (remainingCards.length > 0 && !remainingCards.find(c => c.cardId === activeCardId)) {
                setActiveCard(remainingCards[0].cardId);
              }
            }}
          />
          <CardList
            cards={cards}
            activeCardId={activeCardId}
            onSelect={setActiveCard}
            onToggle={toggleCard}
          />
        </div>
      </aside>

      {/* Right: Editor & Controls */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Editor */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
          <CardEditor />
        </div>

        {/* Bottom Controls */}
        <div
          style={{
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '0.875rem 1.5rem'
          }}
        >
          <DeckControls />
          <SubmitFooter />
        </div>
      </main>
    </div>
  );
};
