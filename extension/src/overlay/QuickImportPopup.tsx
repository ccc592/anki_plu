import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCardStore } from './state/useCardStore';
import { submitSelectedCards } from './actions/submitCards';
import { useDraggable } from './hooks/useDraggable';
import { showToast } from './utils/toastManager';
import { 
  getLastDeck, 
  getLastModel,
  getRecentDecks,
  getRecentModels,
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

// Smart search: prioritize exact > starts-with > contains
const smartFilter = (items: string[], query: string, recentItems: string[] = []) => {
  if (!query) {
    // No query: show recent items first, then alphabetically sorted rest
    const recentSet = new Set(recentItems);
    const recent = items.filter(item => recentSet.has(item));
    const others = items
      .filter(item => !recentSet.has(item))
      .sort((a, b) => a.localeCompare(b));
    return [...recent, ...others];
  }

  const lowerQuery = query.toLowerCase();
  
  const scored = items.map(item => {
    const lowerItem = item.toLowerCase();
    let score = 0;
    
    // Exact match (highest priority)
    if (lowerItem === lowerQuery) {
      score = 1000;
    }
    // Starts with query
    else if (lowerItem.startsWith(lowerQuery)) {
      score = 500;
    }
    // Contains query
    else if (lowerItem.includes(lowerQuery)) {
      score = 100;
    }
    // No match
    else {
      return null;
    }
    
    // Boost recent items
    if (recentItems.includes(item)) {
      score += 50;
    }
    
    // Prefer shorter strings (more specific)
    score -= item.length * 0.1;
    
    return { item, score };
  });

  return scored
    .filter((s): s is { item: string; score: number } => s !== null)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);
};

// Highlight matching text
const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return <>{text}</>;
  
  return (
    <>
      {text.slice(0, index)}
      <span style={{ 
        background: 'rgba(251, 191, 36, 0.3)', 
        color: '#fbbf24',
        fontWeight: 600 
      }}>
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
};

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
  const [showDeckDropdown, setShowDeckDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [deckInputValue, setDeckInputValue] = useState('');
  const [modelInputValue, setModelInputValue] = useState('');
  const [deckSelectedIndex, setDeckSelectedIndex] = useState(-1);
  const [modelSelectedIndex, setModelSelectedIndex] = useState(-1);
  
  const deckDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const draggable = useDraggable({
    initialPosition: { 
      x: window.innerWidth - 370,
      y: window.innerHeight - 520
    },
    storageKey: 'quick-import'
  });

  // Get recent items
  const [recentDecks, setRecentDecks] = useState<string[]>(() => getRecentDecks());
  const [recentModels, setRecentModels] = useState<string[]>(() => getRecentModels());

  // Filter decks with smart search
  const filteredDecks = useMemo(() => {
    return smartFilter(decks, deckInputValue, recentDecks);
  }, [decks, deckInputValue, recentDecks]);

  // Filter models with smart search
  const filteredModels = useMemo(() => {
    return smartFilter(models, modelInputValue, recentModels);
  }, [models, modelInputValue, recentModels]);

  useEffect(() => {
    if (configSnapshot && !deck && !model) {
      const initialDeck = getLastDeck() ?? configSnapshot.defaultDeck ?? '';
      const initialModel = getLastModel() ?? configSnapshot.defaultModel ?? 'Basic';
      setDeck(initialDeck);
      setDeckInputValue(initialDeck);
      setModel(initialModel);
      setModelInputValue(initialModel);
    }
  }, [configSnapshot, deck, model]);

  // Sync input values with selected values
  useEffect(() => {
    if (deck && deck !== deckInputValue) {
      setDeckInputValue(deck);
    }
  }, [deck]);

  useEffect(() => {
    if (model && model !== modelInputValue) {
      setModelInputValue(model);
    }
  }, [model]);

  // Auto-scroll to selected item in dropdown
  useEffect(() => {
    if (showDeckDropdown && deckSelectedIndex >= 0 && deckDropdownRef.current) {
      const selectedElement = deckDropdownRef.current.children[deckSelectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [deckSelectedIndex, showDeckDropdown]);

  useEffect(() => {
    if (showModelDropdown && modelSelectedIndex >= 0 && modelDropdownRef.current) {
      const selectedElement = modelDropdownRef.current.children[modelSelectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [modelSelectedIndex, showModelDropdown]);

  useEffect(() => {
    if (deck) {
      applyDeck(deck);
      saveRecentDeck(deck);
      setRecentDecks(getRecentDecks());
    }
  }, [deck, applyDeck]);

  useEffect(() => {
    if (model) {
      applyModel(model);
      saveRecentModel(model);
      setRecentModels(getRecentModels());
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
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={deckInputValue}
              onChange={(e) => {
                setDeckInputValue(e.target.value);
                setShowDeckDropdown(true);
                setDeckSelectedIndex(-1);
              }}
              onFocus={(event) => {
                event.target.select();
                if (decks.length > 0) {
                  setShowDeckDropdown(true);
                  setDeckSelectedIndex(-1);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowDeckDropdown(false), 200);
                // Accept custom value if user typed something
                if (deckInputValue && deckInputValue !== deck) {
                  setDeck(deckInputValue);
                }
              }}
              onKeyDown={(e) => {
                if (!showDeckDropdown) {
                  if (e.key === 'Enter' && deckInputValue) {
                    setDeck(deckInputValue);
                  }
                  return;
                }

                switch (e.key) {
                  case 'ArrowDown':
                    if (filteredDecks.length > 0) {
                      e.preventDefault();
                      setDeckSelectedIndex(prev => 
                        prev < filteredDecks.length - 1 ? prev + 1 : prev
                      );
                    }
                    break;
                  case 'ArrowUp':
                    if (filteredDecks.length > 0) {
                      e.preventDefault();
                      setDeckSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                    }
                    break;
                  case 'Enter':
                    e.preventDefault();
                    if (deckSelectedIndex >= 0 && filteredDecks.length > 0) {
                      const selected = filteredDecks[deckSelectedIndex];
                      setDeck(selected);
                      setDeckInputValue(selected);
                    } else if (deckInputValue) {
                      setDeck(deckInputValue);
                    }
                    setShowDeckDropdown(false);
                    setDeckSelectedIndex(-1);
                    break;
                  case 'Tab':
                    if (filteredDecks.length > 0) {
                      e.preventDefault();
                      const selected = deckSelectedIndex >= 0 
                        ? filteredDecks[deckSelectedIndex]
                        : filteredDecks[0];
                      setDeck(selected);
                      setDeckInputValue(selected);
                      setShowDeckDropdown(false);
                      setDeckSelectedIndex(-1);
                    }
                    break;
                  case 'Escape':
                    setShowDeckDropdown(false);
                    setDeckSelectedIndex(-1);
                    break;
                }
              }}
              placeholder={decks.length > 0 ? "Type to search or select..." : "Type deck name"}
              style={inputStyle}
            />
            {showDeckDropdown && decks.length > 0 && (
              <div 
                ref={deckDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '0.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
              >
                {filteredDecks.length === 0 ? (
                  <div style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.85rem'
                  }}>
                    No decks match "{deckInputValue}"
                  </div>
                ) : (
                  filteredDecks.map((d, index) => {
                  const isSelected = d === deck;
                  const isHighlighted = index === deckSelectedIndex;
                  const isRecent = recentDecks.includes(d);
                  
                  return (
                    <div
                      key={d}
                      onMouseDown={() => {
                        setDeck(d);
                        setDeckInputValue(d);
                        setShowDeckDropdown(false);
                        setDeckSelectedIndex(-1);
                      }}
                      onMouseEnter={() => setDeckSelectedIndex(index)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        cursor: 'pointer',
                        background: isSelected 
                          ? 'rgba(59, 130, 246, 0.3)' 
                          : isHighlighted 
                            ? 'rgba(100, 116, 139, 0.3)' 
                            : 'transparent',
                        transition: 'background 0.1s',
                        fontSize: '0.9rem',
                        color: '#e2e8f0',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>
                        {isSelected && '✓ '}
                        <HighlightMatch text={d} query={deckInputValue} />
                      </span>
                      {isRecent && !deckInputValue && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          color: '#94a3b8',
                          fontStyle: 'italic'
                        }}>
                          recent
                        </span>
                      )}
                    </div>
                  );
                })
                )}
              </div>
            )}
          </div>
        </label>

        {/* Model Selector */}
        <label style={labelStyle}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}>
            Model {models.length > 0 && <span style={{ color: '#94a3b8' }}>({models.length} available)</span>}
          </span>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={modelInputValue}
              onChange={(e) => {
                setModelInputValue(e.target.value);
                setShowModelDropdown(true);
                setModelSelectedIndex(-1);
              }}
              onFocus={(event) => {
                event.target.select();
                if (models.length > 0) {
                  setShowModelDropdown(true);
                  setModelSelectedIndex(-1);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowModelDropdown(false), 200);
                // Accept custom value if user typed something
                if (modelInputValue && modelInputValue !== model) {
                  setModel(modelInputValue);
                }
              }}
              onKeyDown={(e) => {
                if (!showModelDropdown) {
                  if (e.key === 'Enter' && modelInputValue) {
                    setModel(modelInputValue);
                  }
                  return;
                }

                switch (e.key) {
                  case 'ArrowDown':
                    if (filteredModels.length > 0) {
                      e.preventDefault();
                      setModelSelectedIndex(prev => 
                        prev < filteredModels.length - 1 ? prev + 1 : prev
                      );
                    }
                    break;
                  case 'ArrowUp':
                    if (filteredModels.length > 0) {
                      e.preventDefault();
                      setModelSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                    }
                    break;
                  case 'Enter':
                    e.preventDefault();
                    if (modelSelectedIndex >= 0 && filteredModels.length > 0) {
                      const selected = filteredModels[modelSelectedIndex];
                      setModel(selected);
                      setModelInputValue(selected);
                    } else if (modelInputValue) {
                      setModel(modelInputValue);
                    }
                    setShowModelDropdown(false);
                    setModelSelectedIndex(-1);
                    break;
                  case 'Tab':
                    if (filteredModels.length > 0) {
                      e.preventDefault();
                      const selected = modelSelectedIndex >= 0 
                        ? filteredModels[modelSelectedIndex]
                        : filteredModels[0];
                      setModel(selected);
                      setModelInputValue(selected);
                      setShowModelDropdown(false);
                      setModelSelectedIndex(-1);
                    }
                    break;
                  case 'Escape':
                    setShowModelDropdown(false);
                    setModelSelectedIndex(-1);
                    break;
                }
              }}
              placeholder={models.length > 0 ? "Type to search or select..." : "Type model name"}
              style={inputStyle}
            />
            {showModelDropdown && models.length > 0 && (
              <div 
                ref={modelDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '0.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
              >
                {filteredModels.length === 0 ? (
                  <div style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.85rem'
                  }}>
                    No models match "{modelInputValue}"
                  </div>
                ) : (
                  filteredModels.map((m, index) => {
                  const isSelected = m === model;
                  const isHighlighted = index === modelSelectedIndex;
                  const isRecent = recentModels.includes(m);
                  
                  return (
                    <div
                      key={m}
                      onMouseDown={() => {
                        setModel(m);
                        setModelInputValue(m);
                        setShowModelDropdown(false);
                        setModelSelectedIndex(-1);
                      }}
                      onMouseEnter={() => setModelSelectedIndex(index)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        cursor: 'pointer',
                        background: isSelected 
                          ? 'rgba(59, 130, 246, 0.3)' 
                          : isHighlighted 
                            ? 'rgba(100, 116, 139, 0.3)' 
                            : 'transparent',
                        transition: 'background 0.1s',
                        fontSize: '0.9rem',
                        color: '#e2e8f0',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>
                        {isSelected && '✓ '}
                        <HighlightMatch text={m} query={modelInputValue} />
                      </span>
                      {isRecent && !modelInputValue && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          color: '#94a3b8',
                          fontStyle: 'italic'
                        }}>
                          recent
                        </span>
                      )}
                    </div>
                  );
                })
                )}
              </div>
            )}
          </div>
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
