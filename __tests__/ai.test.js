import { aiPlayFFASimultaneous, aiKingPlay, aiRebelPlay } from '../ai';

describe('aiPlayFFASimultaneous', () => {
  test('always returns a card from the hand', () => {
    const hand = [
      { suit: 'fire', rank: 5, id: 'fire-5' },
      { suit: 'water', rank: 14, id: 'water-14' },
      { suit: 'earth', rank: 9, id: 'earth-9' },
    ];
    for (let i = 0; i < 50; i++) {
      const picked = aiPlayFFASimultaneous(hand, 'fire');
      expect(hand).toContainEqual(picked);
    }
  });
});

describe('aiKingPlay', () => {
  test('returns exactly 3 distinct cards from the hand', () => {
    const hand = Array.from({ length: 21 }, (_, i) => ({
      suit: ['water', 'fire', 'earth', 'air'][i % 4],
      rank: 2 + (i % 13),
      id: `card-${i}`,
    }));
    const picks = aiKingPlay(hand, 'fire');
    expect(picks).toHaveLength(3);
    const ids = new Set(picks.map(c => c.id));
    expect(ids.size).toBe(3);
    for (const p of picks) expect(hand).toContainEqual(p);
  });
});

describe('aiRebelPlay', () => {
  test('returns null on empty hand', () => {
    expect(aiRebelPlay([], { suit: 'fire', rank: 5 }, 'water', 'fire')).toBeNull();
  });

  test('king played own element — plays cheapest winning trump if available', () => {
    const hand = [
      { suit: 'water', rank: 9, id: 'water-9' },   // own; loses to king's fire-10
      { suit: 'water', rank: 12, id: 'water-12' }, // own; wins
      { suit: 'water', rank: 14, id: 'water-14' }, // own; wins, but more expensive
      { suit: 'earth', rank: 13, id: 'earth-13' },
    ];
    const picked = aiRebelPlay(hand, { suit: 'fire', rank: 10 }, 'water', 'fire');
    expect(picked.id).toBe('water-12');
  });

  test('king played own and rebel cannot win or tie — dumps cheapest non-element', () => {
    const hand = [
      { suit: 'water', rank: 6, id: 'water-6' },   // own, but loses (king rank 14)
      { suit: 'earth', rank: 4, id: 'earth-4' },   // cheap non-element — dump
      { suit: 'air', rank: 8, id: 'air-8' },
    ];
    const picked = aiRebelPlay(hand, { suit: 'fire', rank: 14 }, 'water', 'fire');
    expect(picked.id).toBe('earth-4');
  });

  test('king played own — rebel prefers a tie (draw) over dumping', () => {
    const hand = [
      { suit: 'water', rank: 10, id: 'water-10' }, // own, ties king's rank — forces a draw
      { suit: 'earth', rank: 4, id: 'earth-4' },   // dump candidate, but tie is better
    ];
    const picked = aiRebelPlay(hand, { suit: 'fire', rank: 10 }, 'water', 'fire');
    expect(picked.id).toBe('water-10');
  });

  test('king played non-element — any own-element auto-wins, pick cheapest', () => {
    const hand = [
      { suit: 'water', rank: 5, id: 'water-5' },
      { suit: 'water', rank: 11, id: 'water-11' },
      { suit: 'earth', rank: 14, id: 'earth-14' },
    ];
    const picked = aiRebelPlay(hand, { suit: 'air', rank: 12 }, 'water', 'fire');
    expect(picked.id).toBe('water-5');
  });
});
