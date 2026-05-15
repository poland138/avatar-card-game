import { createDeck, rankLabel, sortHand } from '../deck';
import { SUITS } from '../constants';

describe('createDeck', () => {
  test('produces 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(52);
  });

  test('contains 13 cards of each suit, ranks 2–14', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards).toHaveLength(13);
      const ranks = suitCards.map(c => c.rank).sort((a, b) => a - b);
      expect(ranks).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    }
  });

  test('shuffles (two decks differ in order)', () => {
    const a = createDeck().map(c => c.id).join(',');
    const b = createDeck().map(c => c.id).join(',');
    // With 52! permutations, collision is astronomically unlikely.
    expect(a).not.toBe(b);
  });
});

describe('rankLabel', () => {
  test('returns face-card letters for 11–14', () => {
    expect(rankLabel(11)).toBe('J');
    expect(rankLabel(12)).toBe('Q');
    expect(rankLabel(13)).toBe('K');
    expect(rankLabel(14)).toBe('A');
  });

  test('passes through number ranks 2–10', () => {
    expect(rankLabel(2)).toBe(2);
    expect(rankLabel(10)).toBe(10);
  });
});

describe('sortHand', () => {
  test('sorts by suit order then rank ascending', () => {
    const hand = [
      { suit: 'fire', rank: 5, id: 'fire-5' },
      { suit: 'water', rank: 14, id: 'water-14' },
      { suit: 'water', rank: 2, id: 'water-2' },
      { suit: 'air', rank: 7, id: 'air-7' },
    ];
    const sorted = sortHand(hand);
    expect(sorted.map(c => c.id)).toEqual([
      'water-2', 'water-14', 'fire-5', 'air-7',
    ]);
  });

  test('does not mutate the input', () => {
    const hand = [
      { suit: 'fire', rank: 5, id: 'fire-5' },
      { suit: 'water', rank: 2, id: 'water-2' },
    ];
    const snapshot = [...hand];
    sortHand(hand);
    expect(hand).toEqual(snapshot);
  });
});
