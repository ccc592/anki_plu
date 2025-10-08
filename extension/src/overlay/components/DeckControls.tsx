import React, { useEffect, useMemo, useState } from 'react';
import { useCardStore } from '../state/useCardStore';
import { usePreferences } from '../state/usePreferences';
import type { UserPreferencesSnapshot } from '@messaging/schemas';
import { 
  getRecentDecks, 
  getRecentModels, 
  getLastDeck, 
  getLastModel,
  saveRecentDeck,
  saveRecentModel,
  saveRecentTags
} from '../utils/recentChoices';

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
  background: 'rgba(15, 23, 42, 0.85)',
  borderRadius: '0.75rem',
  padding: '1rem',
  border: '1px solid rgba(148, 163, 184, 0.2)'
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  fontSize: '0.85rem',
  color: '#e2e8f0'
};

const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  background: 'rgba(15, 23, 42, 0.9)',
  color: '#e2e8f0',
  fontSize: '0.9rem'
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(59, 130, 246, 0.45)',
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#bfdbfe',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  cursor: 'pointer',
  fontSize: '0.85rem'
};

const toTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const expandTemplate = (template: string, snapshot?: UserPreferencesSnapshot) => {
  const now = new Date();
  const domain = (() => {
    try {
      return new URL(window.location.href).hostname;
    } catch {
      return 'local';
    }
  })();

  const replacements: Record<string, string> = {
    '{domain}': domain,
    '{title}': document.title || 'Untitled',
    '{YYYY-MM-DD}': now.toISOString().split('T')[0],
    '{HH:mm}': now.toTimeString().slice(0, 5)
  };

  let result = template;
  Object.entries(replacements).forEach(([token, value]) => {
    result = result.replaceAll(token, value);
  });

  // include hashed tag for dedup if available
  if (snapshot?.availableDecks?.length) {
    result = result.replace('{defaultDeck}', snapshot.availableDecks[0] ?? 'default');
  }

  return result;
};

const useInitialPreferences = (snapshot?: UserPreferencesSnapshot) => {
  const prefs = usePreferences(state => state);

  return useMemo(
    () => ({
      deck: getLastDeck() ?? snapshot?.defaultDeck ?? prefs.defaultDeck ?? '',
      model: getLastModel() ?? snapshot?.defaultModel ?? prefs.defaultModel ?? 'Basic',
      tags: '' // Default empty, user inputs manually
    }),
    [snapshot, prefs]
  );
};

export const DeckControls: React.FC = () => {
  const configSnapshot = useCardStore((state) => state.configSnapshot);
  const applyDeck = useCardStore((state) => state.applyDeck);
  const applyModel = useCardStore((state) => state.applyModel);
  const applyTags = useCardStore((state) => state.applyTags);

  const defaults = useInitialPreferences(configSnapshot);

  const [deck, setDeck] = useState(defaults.deck);
  const [model, setModel] = useState(defaults.model);
  const [tags, setTags] = useState(defaults.tags);

  useEffect(() => {
    setDeck(defaults.deck);
    setModel(defaults.model);
    setTags(defaults.tags);
  }, [defaults.deck, defaults.model, defaults.tags]);

  useEffect(() => {
    if (deck) {
      applyDeck(deck);
      saveRecentDeck(deck); // Save to recent
    }
  }, [deck, applyDeck]);

  useEffect(() => {
    if (model) {
      applyModel(model);
      saveRecentModel(model); // Save to recent
    }
  }, [model, applyModel]);

  useEffect(() => {
    const tagArray = toTags(tags);
    applyTags(tagArray);
    if (tagArray.length > 0) {
      saveRecentTags(tagArray); // Save to recent
    }
  }, [tags, applyTags]);

  const decks = configSnapshot?.availableDecks ?? [];
  const models = configSnapshot?.availableModels ?? ['Basic'];

  const [showCustomDeck, setShowCustomDeck] = useState(false);
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [deckSearchQuery, setDeckSearchQuery] = useState('');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  
  // Get recent choices
  const recentDecks = useMemo(() => getRecentDecks(), []);
  const recentModels = useMemo(() => getRecentModels(), []);

  // Sort decks: selected on top, then recent, then alphabetically
  const sortedDecks = useMemo(() => {
    const selected = deck && decks.includes(deck) ? [deck] : [];
    const recent = recentDecks.filter(d => decks.includes(d) && d !== deck);
    const others = decks
      .filter(d => d !== deck && !recentDecks.includes(d))
      .sort((a, b) => a.localeCompare(b));
    
    return [...selected, ...recent, ...others];
  }, [decks, deck, recentDecks]);

  // Sort models: selected on top, then recent, then alphabetically
  const sortedModels = useMemo(() => {
    const selected = model && models.includes(model) ? [model] : [];
    const recent = recentModels.filter(m => models.includes(m) && m !== model);
    const others = models
      .filter(m => m !== model && !recentModels.includes(m))
      .sort((a, b) => a.localeCompare(b));
    
    return [...selected, ...recent, ...others];
  }, [models, model, recentModels]);

  // Filter decks based on search query
  const filteredDecks = useMemo(() => {
    if (!deckSearchQuery) return sortedDecks;
    const query = deckSearchQuery.toLowerCase();
    return sortedDecks.filter(d => d.toLowerCase().includes(query));
  }, [sortedDecks, deckSearchQuery]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!modelSearchQuery) return sortedModels;
    const query = modelSearchQuery.toLowerCase();
    return sortedModels.filter(m => m.toLowerCase().includes(query));
  }, [sortedModels, modelSearchQuery]);

  // Debug: Log available decks
  useEffect(() => {
    console.log('[DeckControls] Available decks:', decks);
    console.log('[DeckControls] Available models:', models);
  }, [decks, models]);

  return (
    <section style={containerStyle}>
      <label style={labelStyle}>
        <span>
          Deck 
          {decks.length > 0 ? (
            <small style={{ color: '#94a3b8' }}> ({decks.length} available)</small>
          ) : (
            <small style={{ color: '#ef4444' }}> (⚠️ Anki未连接)</small>
          )}
        </span>
        {!showCustomDeck && decks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Search input */}
            <input
              type="text"
              value={deckSearchQuery}
              onChange={(e) => setDeckSearchQuery(e.target.value)}
              placeholder="🔍 Search decks..."
              style={{ ...inputStyle, fontSize: '0.85rem' }}
            />
            {/* Deck selector */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={deck}
                onChange={(event) => {
                  const selectedDeck = event.target.value;
                  setDeck(selectedDeck);
                  setDeckSearchQuery(''); // Clear search after selection
                  
                  // Visual feedback: scroll to top to show selected item
                  if (selectedDeck) {
                    setTimeout(() => {
                      const selectElement = event.target as HTMLSelectElement;
                      selectElement.scrollTop = 0;
                    }, 0);
                  }
                }}
                style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
                size={Math.min(filteredDecks.length + 1, 8)}
              >
                <option value="">-- Select a deck --</option>
                {filteredDecks.map((option) => (
                  <option 
                    key={option} 
                    value={option}
                    style={option === deck ? { 
                      fontWeight: 'bold', 
                      background: 'rgba(59, 130, 246, 0.2)' 
                    } : {}}
                  >
                    {option === deck ? `✓ ${option}` : option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={{ ...buttonStyle, padding: '0.6rem', alignSelf: 'flex-start' }}
                onClick={() => {
                  setShowCustomDeck(true);
                  setDeckSearchQuery('');
                }}
                title="Enter custom deck name"
              >
                ✏️
              </button>
            </div>
            {filteredDecks.length === 0 && deckSearchQuery && (
              <small style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                No decks match "{deckSearchQuery}"
              </small>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={deck}
              onChange={(event) => setDeck(event.target.value)}
              placeholder={decks.length > 0 ? "Type deck name or create new" : "Type deck name (Anki not connected)"}
              style={{ ...inputStyle, flex: 1 }}
            />
            {decks.length > 0 && (
              <button
                type="button"
                style={{ ...buttonStyle, padding: '0.6rem' }}
                onClick={() => setShowCustomDeck(false)}
                title="Select from existing decks"
              >
                📋
              </button>
            )}
          </div>
        )}
      </label>
      <label style={labelStyle}>
        <span>
          Model 
          {models.length > 0 ? (
            <small style={{ color: '#94a3b8' }}> ({models.length} available)</small>
          ) : (
            <small style={{ color: '#ef4444' }}> (⚠️ Anki未连接)</small>
          )}
        </span>
        {!showCustomModel && models.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Search input */}
            <input
              type="text"
              value={modelSearchQuery}
              onChange={(e) => setModelSearchQuery(e.target.value)}
              placeholder="🔍 Search models..."
              style={{ ...inputStyle, fontSize: '0.85rem' }}
            />
            {/* Model selector */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                value={model}
                onChange={(event) => {
                  const selectedModel = event.target.value;
                  setModel(selectedModel);
                  setModelSearchQuery(''); // Clear search after selection
                  
                  // Visual feedback: scroll to top to show selected item
                  if (selectedModel) {
                    setTimeout(() => {
                      const selectElement = event.target as HTMLSelectElement;
                      selectElement.scrollTop = 0;
                    }, 0);
                  }
                }}
                style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
                size={Math.min(filteredModels.length + 1, 6)}
              >
                <option value="">-- Select a model --</option>
                {filteredModels.map((option) => (
                  <option 
                    key={option} 
                    value={option}
                    style={option === model ? { 
                      fontWeight: 'bold', 
                      background: 'rgba(59, 130, 246, 0.2)' 
                    } : {}}
                  >
                    {option === model ? `✓ ${option}` : option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={{ ...buttonStyle, padding: '0.6rem', alignSelf: 'flex-start' }}
                onClick={() => {
                  setShowCustomModel(true);
                  setModelSearchQuery('');
                }}
                title="Enter custom model name"
              >
                ✏️
              </button>
            </div>
            {filteredModels.length === 0 && modelSearchQuery && (
              <small style={{ color: '#fbbf24', fontSize: '0.75rem' }}>
                No models match "{modelSearchQuery}"
              </small>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={models.length > 0 ? "Type model name or create new" : "Type model name (Anki not connected)"}
              style={{ ...inputStyle, flex: 1 }}
            />
            {models.length > 0 && (
              <button
                type="button"
                style={{ ...buttonStyle, padding: '0.6rem' }}
                onClick={() => setShowCustomModel(false)}
                title="Select from existing models"
              >
                📋
              </button>
            )}
          </div>
        )}
      </label>
      <label style={labelStyle}>
        <span>Tags</span>
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="e.g., from-web, javascript, important"
          style={inputStyle}
        />
      </label>
    </section>
  );
};
