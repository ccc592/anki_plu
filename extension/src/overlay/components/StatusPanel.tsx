import React from 'react';
import { useCardStore } from '../state/useCardStore';

const panelStyle: React.CSSProperties = {
  padding: '1rem',
  borderRadius: '0.75rem',
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'added':
      return { label: 'Added', color: '#34d399' };
    case 'duplicate':
      return { label: 'Duplicate', color: '#fbbf24' };
    case 'failed:image':
      return { label: 'Image Failed', color: '#f87171' };
    case 'failed:anki':
      return { label: 'Anki Failed', color: '#f87171' };
    default:
      return { label: status, color: '#94a3b8' };
  }
};

const badgeStyle = (color: string): React.CSSProperties => ({
  background: color,
  color: '#0f172a',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.5rem',
  fontSize: '0.7rem',
  fontWeight: 600,
  textTransform: 'uppercase'
});

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(15, 23, 42, 0.8)',
  color: '#e2e8f0',
  padding: '0.45rem 0.65rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontSize: '0.75rem'
};

const exportErrors = (cards: ReturnType<typeof useCardStore.getState>['cards']) => {
  const failures = cards.filter((card) => card.status?.startsWith('failed'));
  const payload = failures.map((card) => ({
    cardId: card.cardId,
    status: card.status,
    error: card.errorDetails,
    frontHtml: card.frontHtml,
    backHtml: card.backHtml
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `anki-assistant-errors-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const retryCard = async (captureId: string | undefined, cardId: string) => {
  const state = useCardStore.getState();
  const card = state.cards.find((entry) => entry.cardId === cardId);
  if (!card) {
    return;
  }
  await chrome.runtime.sendMessage({
    type: 'submission:card-retry',
    payload: {
      captureId: captureId ?? state.captureId ?? crypto.randomUUID(),
      card
    }
  });
};

export const StatusPanel: React.FC = () => {
  const cards = useCardStore((state) => state.cards);
  const captureId = useCardStore((state) => state.captureId);

  const problemCards = cards.filter((card) => card.status && card.status !== 'added');

  if (!problemCards.length) {
    return null;
  }

  return (
    <section style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#e2e8f0' }}>Import Status</strong>
        <button type="button" style={buttonStyle} onClick={() => exportErrors(cards)}>
          Export Errors
        </button>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {problemCards.map((card) => {
          const badge = statusBadge(card.status ?? 'queued');
          return (
            <li
              key={card.cardId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                <span style={badgeStyle(badge.color)}>{badge.label}</span>
                {card.errorDetails && (
                  <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>{card.errorDetails}</span>
                )}
              </div>
              {card.status?.startsWith('failed') && (
                <button type="button" style={buttonStyle} onClick={() => retryCard(captureId, card.cardId)}>
                  Retry
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
