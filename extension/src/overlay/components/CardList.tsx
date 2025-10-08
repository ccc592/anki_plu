import React from 'react';
import type { CandidateCard } from '@messaging/schemas';

type Props = {
  cards: CandidateCard[];
  activeCardId?: string;
  onSelect: (cardId: string) => void;
  onToggle: (cardId: string, selected: boolean) => void;
};

export const CardList: React.FC<Props> = ({ cards, activeCardId, onSelect, onToggle }) => {
  if (!cards.length) {
    return (
      <div
        style={{
          padding: '2rem 1rem',
          textAlign: 'center',
          color: 'rgba(148, 163, 184, 0.6)',
          fontSize: '0.85rem'
        }}
      >
        <p>未识别出卡片</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.5rem' }}>
      {cards.map((card, index) => {
        const isActive = card.cardId === activeCardId;
        const previewDoc = new DOMParser().parseFromString(card.frontHtml, 'text/html');
        const preview = previewDoc.body.textContent || '';

        return (
          <div
            key={card.cardId}
            onClick={() => onSelect(card.cardId)}
            style={{
              padding: '0.625rem 0.75rem',
              marginBottom: '0.375rem',
              borderRadius: '0.375rem',
              background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: isActive
                ? '1px solid rgba(59, 130, 246, 0.4)'
                : '1px solid rgba(148, 163, 184, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
              }
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              <input
                type="checkbox"
                checked={card.selected ?? true}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggle(card.cardId, e.target.checked);
                }}
                style={{
                  marginTop: '0.125rem',
                  width: '0.875rem',
                  height: '0.875rem',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'rgba(148, 163, 184, 0.7)',
                    marginBottom: '0.125rem'
                  }}
                >
                  Card {index + 1}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: isActive ? '#93c5fd' : '#e2e8f0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.3'
                  }}
                >
                  {preview || '(空卡片)'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
