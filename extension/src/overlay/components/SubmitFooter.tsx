import React, { useState } from 'react';
import { useCardStore } from '../state/useCardStore';
import { submitSelectedCards } from '../actions/submitCards';

const containerStyle: React.CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.25rem',
  background: 'rgba(15, 23, 42, 0.85)',
  borderRadius: '0.75rem',
  border: '1px solid rgba(148, 163, 184, 0.2)'
};

const primaryButton: React.CSSProperties = {
  border: 'none',
  background: 'rgba(59, 130, 246, 0.85)',
  color: '#f8fafc',
  padding: '0.7rem 1.25rem',
  borderRadius: '0.65rem',
  fontWeight: 600,
  cursor: 'pointer',
  minWidth: '8rem'
};

const statusStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'rgba(148, 163, 184, 0.85)'
};

export const SubmitFooter: React.FC = () => {
  const cards = useCardStore((state) => state.cards);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const selectedCount = cards.filter((card) => card.selected !== false).length;

  const handleSubmit = async () => {
    setStatusMessage('Queuing cards…');
    const result = await submitSelectedCards();
    if (result.ok) {
      setStatusMessage(`Queued ${selectedCount} cards for import.`);
    } else {
      setStatusMessage(result.reason ?? 'Failed to queue cards');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <strong style={{ color: '#e2e8f0' }}>Ready to add to Anki</strong>
        <span style={statusStyle}>{selectedCount} card(s) selected</span>
        {statusMessage && (
          <span style={{ ...statusStyle, color: '#93c5fd' }}>{statusMessage}</span>
        )}
      </div>
      <button
        type="button"
        style={primaryButton}
        onClick={handleSubmit}
        disabled={selectedCount === 0}
      >
        Add to Anki
      </button>
    </div>
  );
};
