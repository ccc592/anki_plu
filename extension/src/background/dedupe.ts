import type { CandidateCard } from '@messaging/schemas';
import { computeFrontHash } from '@shared/normalizer';

export interface PreparedCard extends CandidateCard {
  normalizedFront?: string;
}

export const prepareCardForQueue = async (card: CandidateCard): Promise<PreparedCard> => {
  if (card.hash) {
    return {
      ...card
      // No longer add hash tag automatically - user will input tags manually
    };
  }

  const { normalized, hash } = await computeFrontHash(card.frontHtml);
  return {
    ...card,
    hash,
    normalizedFront: normalized
    // No longer add hash tag automatically - user will input tags manually
  };
};

export const prepareCardsForQueue = async (cards: CandidateCard[]): Promise<PreparedCard[]> =>
  Promise.all(cards.map((card) => prepareCardForQueue(card)));
