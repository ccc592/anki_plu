const RECENT_DECKS_KEY = 'anki_assistant_recent_decks';
const RECENT_MODELS_KEY = 'anki_assistant_recent_models';
const RECENT_TAGS_KEY = 'anki_assistant_recent_tags';

const MAX_RECENT_DECKS = 5;
const MAX_RECENT_MODELS = 3;
const MAX_RECENT_TAGS = 5;

// Get recent choices from localStorage
export const getRecentDecks = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_DECKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const getRecentModels = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_MODELS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const getRecentTags = (): string[][] => {
  try {
    const stored = localStorage.getItem(RECENT_TAGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save recent choice
export const saveRecentDeck = (deck: string) => {
  if (!deck) return;
  
  try {
    const recent = getRecentDecks();
    const updated = [deck, ...recent.filter(d => d !== deck)].slice(0, MAX_RECENT_DECKS);
    localStorage.setItem(RECENT_DECKS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[recentChoices] Failed to save recent deck:', error);
  }
};

export const saveRecentModel = (model: string) => {
  if (!model) return;
  
  try {
    const recent = getRecentModels();
    const updated = [model, ...recent.filter(m => m !== model)].slice(0, MAX_RECENT_MODELS);
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[recentChoices] Failed to save recent model:', error);
  }
};

export const saveRecentTags = (tags: string[]) => {
  if (!tags.length) return;
  
  try {
    const recent = getRecentTags();
    // Compare tags arrays by content
    const tagsStr = tags.sort().join(',');
    const filtered = recent.filter(t => t.sort().join(',') !== tagsStr);
    const updated = [tags, ...filtered].slice(0, MAX_RECENT_TAGS);
    localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[recentChoices] Failed to save recent tags:', error);
  }
};

// Get last used choice (most recent)
export const getLastDeck = (): string | undefined => {
  return getRecentDecks()[0];
};

export const getLastModel = (): string | undefined => {
  return getRecentModels()[0];
};

export const getLastTags = (): string[] | undefined => {
  return getRecentTags()[0];
};
