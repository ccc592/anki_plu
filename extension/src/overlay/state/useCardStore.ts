import { create } from 'zustand';
import type { CandidateCard, UserPreferencesSnapshot } from '@messaging/schemas';

export interface CardStoreState {
  cards: CandidateCard[];
  sourceHtml: string;
  configSnapshot?: UserPreferencesSnapshot;
  captureId?: string;
  activeCardId?: string;
  setCards: (cards: CandidateCard[], options?: { config?: UserPreferencesSnapshot; sourceHtml?: string; captureId?: string }) => void;
  updateCard: (cardId: string, updates: Partial<CandidateCard>) => void;
  toggleCard: (cardId: string, selected: boolean) => void;
  setActiveCard: (cardId: string) => void;
  mergeWithNext: (cardId: string) => void;
  splitCard: (cardId: string) => void;
  applyDeck: (deckId: string) => void;
  applyModel: (modelId: string) => void;
  applyTags: (tags: string[]) => void;
}

const createCardId = () => crypto.randomUUID();

const mergeRanges = (current: CandidateCard, next: CandidateCard): CandidateCard => ({
  ...current,
  frontHtml: `${current.frontHtml}<hr/>${next.frontHtml}`,
  backHtml: `${current.backHtml}<hr/>${next.backHtml}`,
  confidence: Math.max(current.confidence ?? 0, next.confidence ?? 0)
});

const splitByHr = (html: string): string[] => html.split(/<hr\s*\/?>(?:\s*)/i).filter(Boolean);

const mapCards = (cards: CandidateCard[], predicate: (card: CandidateCard) => CandidateCard) =>
  cards.map(predicate);

export const useCardStore = create<CardStoreState>((set, get) => ({
  cards: [],
  sourceHtml: '',
  configSnapshot: undefined,
  captureId: undefined,
  setCards: (cards, options) =>
    set({
      cards,
      configSnapshot: options?.config ?? get().configSnapshot,
      sourceHtml: options?.sourceHtml ?? get().sourceHtml,
      captureId: options?.captureId ?? get().captureId,
      activeCardId: cards[0]?.cardId
    }),
  updateCard: (cardId, updates) =>
    set((state) => ({
      cards: mapCards(state.cards, (card) => {
        if (card.cardId !== cardId) {
          return card;
        }
        const next = { ...card, ...updates };
        return JSON.stringify(next) === JSON.stringify(card) ? card : next;
      })
    })),
  toggleCard: (cardId, selected) =>
    set((state) => ({
      cards: mapCards(state.cards, (card) =>
        card.cardId === cardId ? { ...card, selected } : card
      )
    })),
  setActiveCard: (cardId) => set({ activeCardId: cardId }),
  mergeWithNext: (cardId) =>
    set((state) => {
      const index = state.cards.findIndex((card) => card.cardId === cardId);
      if (index === -1 || index === state.cards.length - 1) {
        return state;
      }
      const merged = mergeRanges(state.cards[index], state.cards[index + 1]);
      const updated = [...state.cards];
      updated.splice(index, 2, merged);
      return {
        cards: updated,
        activeCardId: merged.cardId
      };
    }),
  splitCard: (cardId) =>
    set((state) => {
      const index = state.cards.findIndex((card) => card.cardId === cardId);
      if (index === -1) {
        return state;
      }

      const card = state.cards[index];
      const frontSegments = splitByHr(card.frontHtml);
      const backSegments = splitByHr(card.backHtml);

      if (frontSegments.length <= 1 && backSegments.length <= 1) {
        return state;
      }

      const segmentCount = Math.max(frontSegments.length, backSegments.length);
      const newCards: CandidateCard[] = [];
      for (let i = 0; i < segmentCount; i += 1) {
        newCards.push({
          ...card,
          cardId: i === 0 ? card.cardId : createCardId(),
          frontHtml: frontSegments[i] ?? frontSegments[frontSegments.length - 1] ?? card.frontHtml,
          backHtml: backSegments[i] ?? backSegments[backSegments.length - 1] ?? card.backHtml,
          selected: true,
          status: 'draft'
        });
      }

      const updated = [...state.cards];
      updated.splice(index, 1, ...newCards);

      return {
        cards: updated,
        activeCardId: newCards[0].cardId
      };
    }),
  applyDeck: (deckId) =>
    set((state) => ({
      cards: mapCards(state.cards, (card) => ({ ...card, deckId }))
    })),
  applyModel: (modelId) =>
    set((state) => ({
      cards: mapCards(state.cards, (card) => ({ ...card, modelId }))
    })),
  applyTags: (tags) =>
    set((state) => ({
      cards: mapCards(state.cards, (card) => ({ ...card, tags }))
    }))
}));
