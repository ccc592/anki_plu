import DOMPurify from 'dompurify';
import type { HeuristicToggles, CaptureRequest, UserPreferencesSnapshot, UserPreferences, CandidateCard } from '@messaging/schemas';
import { loadPreferences } from '@shared/preferences';
import { detectQuestionAnswerPairs } from '@shared/qaDetection';
import { computeFrontHash } from '@shared/normalizer';
import { cleanHtml } from '@shared/htmlCleaner';

interface BuildCaptureOptions {
  heuristics: HeuristicToggles;
  configSnapshot: UserPreferencesSnapshot;
}

const FALLBACK_HEURISTICS: HeuristicToggles = {
  explicitMarkers: true,
  structureHints: true,
  questionMarks: true,
  listTable: false
};

const allowedForDomain = (preferences: UserPreferences, url: URL): boolean => {
  const domain = url.hostname;
  if (preferences.siteBlocklist.includes(domain)) {
    return false;
  }
  if (preferences.siteAllowlist.length === 0) {
    return true;
  }
  return preferences.siteAllowlist.includes(domain);
};

const snapshotFromPreferences = (preferences: UserPreferences): UserPreferencesSnapshot => ({
  ...preferences,
  defaultDeck: preferences.defaultDeck ?? undefined,
  availableDecks: [],
  availableModels: []
});

const getActiveSelectionHtml = (): string | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    console.warn('[selection] No selection found');
    return null;
  }

  const container = document.createElement('div');
  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    container.appendChild(range.cloneContents());
  }

  const originalHtml = container.innerHTML;
  console.log('[selection] Original HTML length:', originalHtml.length);
  console.log('[selection] Original HTML preview:', originalHtml.substring(0, 300));
  
  // Clean ChatGPT HTML (remove buttons, toolbars, etc.)
  const cleanedHtml = cleanHtml(originalHtml);
  console.log('[selection] Cleaned HTML length:', cleanedHtml.length);
  console.log('[selection] Cleaned HTML preview:', cleanedHtml.substring(0, 300));
  
  return cleanedHtml.trim();
};

const sanitizeHtml = (html: string): string => {
  const purify = DOMPurify(window);
  return purify.sanitize(html, {
    ALLOW_UNKNOWN_PROTOCOLS: false,
    RETURN_DOM: false
  });
};

const fallbackSnapshot = (): UserPreferencesSnapshot => ({
  defaultDeck: undefined,
  defaultModel: 'Basic',
  tagTemplate: 'from-clip, source:{domain}, date:{YYYY-MM-DD}',
  heuristics: FALLBACK_HEURISTICS,
  htmlAllowlist: { tags: [], styles: [] },
  mediaPolicy: {
    downloadExternal: true,
    convertWebP: false,
    concurrency: 3,
    retryLimit: 3,
    maxSizeMB: 5
  },
  shortcut: 'Alt+A',
  clipboardEnabled: false,
  siteAllowlist: [],
  siteBlocklist: [],
  availableDecks: [],
  availableModels: []
});

const readClipboardFragment = async (): Promise<string | null> => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      return null;
    }
    return `<p>${text.replace(/\n/g, '<br/>')}</p>`;
  } catch {
    return null;
  }
};

const createCandidateCard = async (
  frontHtml: string,
  backHtml: string,
  confidence: number,
  snapshot: UserPreferencesSnapshot
): Promise<CandidateCard> => {
  const { hash } = await computeFrontHash(frontHtml);
  return {
    cardId: crypto.randomUUID(),
    frontHtml,
    backHtml,
    confidence,
    status: 'draft',
    selected: confidence >= 0.5,
    deckId: snapshot.defaultDeck,
    modelId: snapshot.defaultModel ?? 'Basic',
    tags: [],
    hash,
    errorDetails: undefined
  };
};

const buildCandidateCards = async (
  htmlFragment: string,
  snapshot: UserPreferencesSnapshot
): Promise<CandidateCard[]> => {
  console.log('[selection] Building candidate cards from HTML fragment:', htmlFragment.substring(0, 200));
  
  const pairs = detectQuestionAnswerPairs(htmlFragment, {
    heuristics: snapshot.heuristics
  });

  if (pairs.length === 0) {
    console.warn('[selection] No Q/A pairs detected, creating fallback card');
    return [
      await createCandidateCard(htmlFragment, '<p></p>', 0, snapshot)
    ];
  }

  console.log(`[selection] Successfully detected ${pairs.length} Q/A pairs`);
  const cards = await Promise.all(
    pairs.map((pair) =>
      createCandidateCard(pair.frontHtml, pair.backHtml, pair.confidence, snapshot)
    )
  );

  return cards;
};

export const buildCaptureRequest = async (
  options?: Partial<BuildCaptureOptions>
): Promise<CaptureRequest | null> => {
  const preferences = await loadPreferences();
  const snapshot = options?.configSnapshot ?? snapshotFromPreferences(preferences);
  const heuristics = options?.heuristics ?? preferences.heuristics ?? FALLBACK_HEURISTICS;

  const pageUrl = new URL(window.location.href);
  if (!allowedForDomain(preferences, pageUrl)) {
    console.warn('[content] Domain blocked by allowlist/denylist preferences');
    return null;
  }

  let fragment = getActiveSelectionHtml();
  if (!fragment && preferences.clipboardEnabled) {
    fragment = await readClipboardFragment();
  }

  if (!fragment) {
    return null;
  }

  const sanitized = sanitizeHtml(fragment);

  const configSnapshot: UserPreferencesSnapshot = {
    ...fallbackSnapshot(),
    ...snapshot,
    heuristics,
    shortcut: preferences.shortcut,
    clipboardEnabled: preferences.clipboardEnabled,
    siteAllowlist: preferences.siteAllowlist,
    siteBlocklist: preferences.siteBlocklist,
    mediaPolicy: preferences.mediaPolicy
  };

  // Perform Q/A detection in content script (has DOM access)
  const cards = await buildCandidateCards(sanitized, configSnapshot);

  return {
    sourceUrl: window.location.href,
    pageTitle: document.title,
    htmlFragment: sanitized,
    cards,
    heuristics,
    configSnapshot
  };
};
