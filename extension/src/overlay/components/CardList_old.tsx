import React, { useMemo, useCallback } from 'react';
import type { CandidateCard } from '@messaging/schemas';

type Props = {
  cards: CandidateCard[];
  activeCardId?: string;
  onSelect: (cardId: string) => void;
  onToggle: (cardId: string, selected: boolean) => void;
};

const contentPreview: React.CSSProperties = {
  marginTop: '0.5rem',
  padding: '0.75rem',
  background: 'rgba(15, 23, 42, 0.85)',
  borderRadius: '0.5rem',
  maxHeight: '10rem',
  overflow: 'auto',
  fontSize: '0.85rem'
};

const withLazyImages = (html: string) => html.replace(/<img(?![^>]*loading=)/gi, '<img loading="lazy"');

interface CardRowProps {
  card: CandidateCard;
  index: number;
  isActive: boolean;
  onSelect: (cardId: string) => void;
  onToggle: (cardId: string, selected: boolean) => void;
}

const CardRow: React.FC<CardRowProps> = React.memo(({ card, index, isActive, onSelect, onToggle }) => {
  const frontHtml = useMemo(() => withLazyImages(card.frontHtml), [card.frontHtml]);
  const backHtml = useMemo(() => withLazyImages(card.backHtml), [card.backHtml]);

  const handleToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onToggle(card.cardId, event.target.checked);
    },
    [card.cardId, onToggle]
  );

  return (
    <li
      style={{
        background: isActive
          ? 'rgba(59, 130, 246, 0.18)'
          : card.selected
          ? 'rgba(15, 23, 42, 0.75)'
          : 'rgba(15, 23, 42, 0.45)',
        border: isActive
          ? '1px solid rgba(59, 130, 246, 0.45)'
          : '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '0.75rem',
        padding: '1rem',
        cursor: 'pointer',
        transition: 'background 0.2s ease'
      }}
      onClick={() => onSelect(card.cardId)}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem'
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Card {index + 1}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={card.selected ?? true} onChange={handleToggle} />
          <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.8)' }}>Include</span>
        </label>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(148, 163, 184, 0.8)' }}>
            Front
          </strong>
          <div style={contentPreview} dangerouslySetInnerHTML={{ __html: frontHtml }} />
        </div>
        <div>
          <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(148, 163, 184, 0.8)' }}>
            Back
          </strong>
          <div style={contentPreview} dangerouslySetInnerHTML={{ __html: backHtml }} />
        </div>
      </div>
      <footer style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.7)' }}>
          Status: {card.status ?? 'draft'}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.7)' }}>
          Confidence: {Math.round((card.confidence ?? 0) * 100)}%
        </span>
      </footer>
    </li>
  );
}, (prev, next) => prev.card === next.card && prev.isActive === next.isActive);

export const CardList: React.FC<Props> = ({ cards, activeCardId, onSelect, onToggle }) => {
  if (!cards.length) {
    return (
      <div style={{ padding: '1.5rem', color: 'rgba(148, 163, 184, 0.8)' }}>
        Capture content to review candidate cards.
      </div>
    );
  }

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: '0.5rem',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      {cards.map((card, index) => (
        <CardRow
          key={card.cardId}
          card={card}
          index={index}
          isActive={card.cardId === activeCardId}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
};
