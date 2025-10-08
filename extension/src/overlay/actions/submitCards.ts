import type { CandidateCard, SubmissionRequest } from '@messaging/schemas';
import { useCardStore } from '../state/useCardStore';

interface SubmissionResult {
  ok: boolean;
  queued?: number;
  reason?: string;
}

const ensureDeckAndModel = (cards: CandidateCard[]) =>
  cards.map((card) => ({
    ...card,
    deckId: card.deckId ?? 'Default',
    modelId: card.modelId ?? 'Basic',
    tags: card.tags ?? []
  }));

export const submitSelectedCards = async (): Promise<SubmissionResult> => {
  const { cards, captureId, configSnapshot } = useCardStore.getState();
  const selected = ensureDeckAndModel(cards.filter((card) => card.selected !== false));

  if (selected.length === 0) {
    return { ok: false, reason: 'No cards selected' };
  }

  const request: SubmissionRequest = {
    selectedCardIds: selected.map((card) => card.cardId),
    dedupeStrategy: 'respect',
    mediaPolicy: configSnapshot?.mediaPolicy
  };

  const payload = {
    captureId: captureId ?? crypto.randomUUID(),
    cards: selected,
    request
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'submission:queue',
      payload
    });

    useCardStore.setState((state) => ({
      cards: state.cards.map((card) =>
        payload.request.selectedCardIds.includes(card.cardId)
          ? { ...card, status: 'queued' }
          : card
      )
    }));

    return (response as SubmissionResult) ?? { ok: true };
  } catch (error) {
    console.error('[overlay] Failed to enqueue submission', error);
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown error' };
  }
};
