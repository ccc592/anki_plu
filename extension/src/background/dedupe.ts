import type { CandidateCard } from '@messaging/schemas';
import { computeFrontHash } from '@shared/normalizer';

const HASH_PREFIX = 'hash:';

export interface PreparedCard extends CandidateCard {
  normalizedFront?: string;
}

const ensureTag = (tags: string[] = [], hash: string): string[] => {
  const next = new Set(tags);
  next.add(`${HASH_PREFIX}${hash}`);
  return Array.from(next);
};

export const prepareCardForQueue = async (card: CandidateCard): Promise<PreparedCard> => {
  if (card.hash) {
    return {
      ...card,
      tags: ensureTag(card.tags, card.hash)
    };
  }

  const { normalized, hash } = await computeFrontHash(card.frontHtml);
  return {
    ...card,
    hash,
    normalizedFront: normalized,
    tags: ensureTag(card.tags, hash)
  };
};

export const prepareCardsForQueue = async (cards: CandidateCard[]): Promise<PreparedCard[]> =>
  Promise.all(cards.map((card) => prepareCardForQueue(card)));
