import React, { useState, useEffect } from 'react';
import { useCardStore } from './state/useCardStore';
import { submitSelectedCards } from './actions/submitCards';
import { useDraggable } from './hooks/useDraggable';
import { showToast } from './utils/toastManager';
import { 
  getLastDeck, 
  getLastModel,
  saveRecentDeck,
  saveRecentModel,
  saveRecentTags
} from './utils/recentChoices';

interface QuickImportPopupProps {
  cardCount: number;
  onSwitchToFullEditor: () => void;
  onClose: () => void;
}

const basePopupStyle: React.CSSProperties = {
  width: '350px',
  maxHeight: '500px',
  background: 'rgba(16, 24, 32, 0.98)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  color: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  zIndex: 10,
  animation: 'slideInUp 0.2s ease-out',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '1rem 1.25rem',
  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(15, 23, 42, 0.5)',
  cursor: 'grab'
};

const bodyStyle: React.CSSProperties = {
  padding: '1.25rem',
  flex: 1,
  overflow: 'auto'
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginBottom: '1rem'
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '0.5rem',
  padding: '0.6rem 0.75rem',
  color: '#f8fafc',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'all 0.15s'
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '0.5rem',
  padding: '0.7rem 1rem',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s'
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(59, 130, 246, 0.9)',
  color: '#f8fafc',
  flex: 1
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(100, 116, 139, 0.3)',
  color: '#cbd5e1',
  flex: 1
};

const toTags = (raw: string): string[] =>
  raw
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);

export const QuickImportPopup: React.FC<QuickImportPopupProps> = ({
  cardCount,
  onSwitchToFullEditor,
  onClose
}) => {
  const configSnapshot = useCardStore((state) => state.configSnapshot);
  const applyDeck = useCardStore((state) => state.applyDeck);
  const applyModel = useCardStore((state) => state.applyModel);
  const applyTags = useCardStore((state) => state.applyTags);

  const decks = configSnapshot?.availableDecks ?? [];
  const models = configSnapshot?.availableModels ?? ['Basic'];

  const [deck, setDeck] = useState('');
  const [model, setModel] = useState('');
  const [tags, setTags] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const draggable = useDraggable({
    initialPosition: { 
      x: window.innerWidth - 370,
      y: window.innerHeight - 520
    },
    storageKey: 'quick-import'
  });

  useEffect(() => {
    if (configSnapshot && !deck && !model) {
      const initialDeck = getLastDeck() ?? configSnapshot.defaultDeck ?? '';
      const initialModel = getLastModel() ?? configSnapshot.defaultModel ?? 'Basic';
      setDeck(initialDeck);
      setModel(initialModel);
    }
  }, [configSnapshot, deck, model]);

  useEffect(() => {
    if (deck) {
      applyDeck(deck);
      saveRecentDeck(deck);
    }
  }, [deck, applyDeck]);

  useEffect(() => {
    if (model) {
      applyModel(model);
      saveRecentModel(model);
    }
  }, [model, applyModel]);

  useEffect(() => {
    const tagArray = toTags(tags);
    applyTags(tagArray);
    if (tagArray.length > 0) {
      saveRecentTags(tagArray);
    }
  }, [tags, applyTags]);

  const handleImport = async () => {
    setIsImporting(true);
    setStatusMessage('Importing...');
    
    try {
      const result = await submitSelectedCards();
      if (result.ok) {
        setStatusMessage('✓ Success!');
        showToast({
          message: `Successfully imported ${cardCount} card${cardCount !== 1 ? 's' : ''}!`,
          type: 'success',
          duration: 2000
        });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        const errorMsg = result.reason || 'Unknown error';
        setStatusMessage(`Error: ${errorMsg}`);
        showToast({
          message: `Import failed: ${errorMsg}`,
          type: 'error',
          duration: 4000
        });
        setIsImporting(false);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(`Error: ${errorMsg}`);
      showToast({
        message: `Import failed: ${errorMsg}`,
        type: 'error',
        duration: 4000
      });
      setIsImporting(false);
    }
  };

  // Ctrl+Enter to import
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleImport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deck, model, tags]);

  return (
    <div 
      ref={draggable.ref}
      style={{
        ...basePopupStyle,
        ...draggable.style
      }}
    >
      {/* Header - Draggable */}
      <div 
        style={{
          ...headerStyle,
          cursor: draggable.isDragging ? 'grabbing' : 'grab'
        }}
        data-draggable-handle
      >
        <div>
          <strong style={{ fontSize: '1rem' }}>✓ Anki Quick Import</strong>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            📦 {cardCount} card{cardCount !== 1 ? 's' : ''} detected
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fca5a5',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0.25rem',
            lineHeight: 1
          }}
          title="Close (ESC)"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        {/* Deck Selector */}
        <label style={labelStyle}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}>
            Deck {decks.length > 0 && <span style={{ color: '#94a3b8' }}>({decks.length} available)</span>}
          </span>
          {decks.length > 0 ? (
            <select
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a deck --</option>
              {decks.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <input
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              placeholder="Type deck name"
              style={inputStyle}
            />
          )}
        </label>

        {/* Model Selector */}
        <label style={labelStyle}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}>
            Model {models.length > 0 && <span style={{ color: '#94a3b8' }}>({models.length} available)</span>}
          </span>
          {models.length > 0 ? (
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                ...inputStyle,
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a model --</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Type model name"
              style={inputStyle}
            />
          )}
        </label>

        {/* Tags Input */}
        <label style={labelStyle}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}>
            Tags <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
          </span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., from-web, javascript"
            style={inputStyle}
          />
        </label>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: '0.6rem',
              borderRadius: '0.5rem',
              background: statusMessage.includes('Error') 
                ? 'rgba(239, 68, 68, 0.15)' 
                : 'rgba(34, 197, 94, 0.15)',
              color: statusMessage.includes('Error') ? '#fca5a5' : '#86efac',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onSwitchToFullEditor}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 116, 139, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(100, 116, 139, 0.3)';
            }}
          >
            📝 Preview
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !deck || !model || cardCount === 0}
            style={{
              ...primaryButtonStyle,
              opacity: (isImporting || !deck || !model || cardCount === 0) ? 0.5 : 1,
              cursor: (isImporting || !deck || !model || cardCount === 0) ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isImporting && deck && model && cardCount > 0) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.9)';
            }}
          >
            ✓ Import ({cardCount})
          </button>
        </div>

        <div style={{ 
          marginTop: '0.75rem', 
          fontSize: '0.75rem', 
          color: '#64748b', 
          textAlign: 'center' 
        }}>
          Press Ctrl+Enter to import quickly
        </div>
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
