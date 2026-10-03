import { simultaneousWinner, resolveLane } from '../core/rules';

const players = [
  { element: 'water' },
  { element: 'fire' },
  { element: 'earth' },
  { element: 'air' },
];

function play(playerIdx, suit, rank) {
  return { playerIdx, card: { suit, rank, id: `${suit}-${rank}` } };
}

describe('simultaneousWinner', () => {
  test('a single trump beats higher-ranked non-trumps', () => {
    const plays = [
      play(0, 'water', 5),   // trump for player 0
      play(1, 'earth', 14),  // non-trump for player 1
      play(2, 'air', 13),    // non-trump for player 2
      play(3, 'fire', 12),   // non-trump for player 3
    ];
    expect(simultaneousWinner(plays, players)).toBe(0);
  });

  test('highest rank wins among non-trumps', () => {
    const plays = [
      play(0, 'fire', 3),
      play(1, 'air', 10),
      play(2, 'water', 7),
      play(3, 'earth', 2),
    ];
    expect(simultaneousWinner(plays, players)).toBe(1);
  });

  test('among trumps, highest rank wins', () => {
    const plays = [
      play(0, 'water', 8),
      play(1, 'fire', 14),   // fire trump, player 1
      play(2, 'water', 5),
      play(3, 'fire', 9),    // unrelated
    ];
    // Trumps: p0 water (own), p1 fire (own). Highest rank = 14.
    expect(simultaneousWinner(plays, players)).toBe(1);
  });

  test('tied top trumps: defender of attacked element wins', () => {
    // Two players play rank 10. Player 0 plays water (own), player 1 also
    // plays water rank 10 — but water is player 0's element so player 0
    // is the defender.
    const plays = [
      play(0, 'water', 10),  // water-bender plays water
      play(1, 'water', 10),  // fire-bender plays water (attacking water territory)
      play(2, 'earth', 3),
      play(3, 'air', 4),
    ];
    // Only player 0 is in trumpPlays (own element). They win outright.
    expect(simultaneousWinner(plays, players)).toBe(0);
  });
});

describe('resolveLane', () => {
  test('king plays own, rebel plays own — higher rank wins', () => {
    expect(
      resolveLane(
        { suit: 'water', rank: 10 },
        { suit: 'fire', rank: 8 },
        'water',
        'fire',
      ),
    ).toBe('king');
  });

  test('king plays own, rebel does not — king wins regardless of rank', () => {
    expect(
      resolveLane(
        { suit: 'water', rank: 2 },
        { suit: 'earth', rank: 14 },
        'water',
        'fire',
      ),
    ).toBe('king');
  });

  test('rebel plays own, king does not — rebel wins regardless of rank', () => {
    expect(
      resolveLane(
        { suit: 'air', rank: 14 },
        { suit: 'fire', rank: 2 },
        'water',
        'fire',
      ),
    ).toBe('rebel');
  });

  test('neither plays own — higher rank wins', () => {
    expect(
      resolveLane(
        { suit: 'earth', rank: 5 },
        { suit: 'air', rank: 9 },
        'water',
        'fire',
      ),
    ).toBe('rebel');
  });

  test('neither plays own, equal rank, both in enemy territory — draw', () => {
    expect(
      resolveLane(
        { suit: 'fire', rank: 7 },  // king (water) plays rebel's element
        { suit: 'water', rank: 7 }, // rebel (fire) plays king's element
        'water',
        'fire',
      ),
    ).toBe('draw');
  });

  test('king plays own, rebel plays own, equal rank — draw', () => {
    expect(
      resolveLane(
        { suit: 'water', rank: 9 },
        { suit: 'fire', rank: 9 },
        'water',
        'fire',
      ),
    ).toBe('draw');
  });
});

import { resolveTrick, resolveLaneDetailed } from '../core/rules';

describe('resolveTrick reasons', () => {
  test('only-trump', () => {
    const plays = [play(0, 'water', 5), play(1, 'earth', 14), play(2, 'air', 13), play(3, 'fire', 12)];
    expect(resolveTrick(plays, players)).toEqual({ winner: 0, reason: 'only-trump' });
  });

  test('highest-trump', () => {
    const plays = [play(0, 'water', 5), play(1, 'fire', 9), play(2, 'air', 13), play(3, 'fire', 12)];
    expect(resolveTrick(plays, players)).toEqual({ winner: 1, reason: 'highest-trump' });
  });

  test('highest-rank when nobody trumps', () => {
    const plays = [play(0, 'fire', 3), play(1, 'air', 10), play(2, 'water', 7), play(3, 'earth', 2)];
    expect(resolveTrick(plays, players)).toEqual({ winner: 1, reason: 'highest-rank' });
  });

  test('tie-defender', () => {
    const plays = [play(0, 'fire', 10), play(1, 'water', 10), play(2, 'air', 2), play(3, 'water', 3)];
    expect(resolveTrick(plays, players)).toEqual({ winner: 1, reason: 'tie-defender' });
  });

  test('tie-first-trump', () => {
    const plays = [play(0, 'water', 9), play(1, 'fire', 9), play(2, 'water', 2), play(3, 'fire', 3)];
    expect(resolveTrick(plays, players)).toEqual({ winner: 0, reason: 'tie-first-trump' });
  });

  test('tie-random', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const plays = [play(0, 'earth', 8), play(1, 'air', 8), play(2, 'fire', 2), play(3, 'earth', 3)];
    expect(resolveTrick(plays, players)).toEqual({ winner: 0, reason: 'tie-random' });
    spy.mockRestore();
  });

  test('simultaneousWinner returns the same winner', () => {
    const plays = [play(0, 'water', 5), play(1, 'fire', 9), play(2, 'air', 13), play(3, 'fire', 12)];
    expect(simultaneousWinner(plays, players)).toBe(resolveTrick(plays, players).winner);
  });
});

describe('resolveLaneDetailed reasons', () => {
  const k = (suit, rank) => ({ suit, rank, id: `${suit}-${rank}` });
  const cases = [
    ['both-own, rebel higher', k('fire', 10), k('water', 12), { result: 'rebel', reason: 'both-own' }],
    ['both-own, equal', k('fire', 10), k('water', 10), { result: 'draw', reason: 'both-own' }],
    ['king-own', k('fire', 2), k('earth', 14), { result: 'king', reason: 'king-own' }],
    ['rebel-own', k('earth', 14), k('water', 2), { result: 'rebel', reason: 'rebel-own' }],
    ['higher-rank', k('earth', 9), k('air', 5), { result: 'king', reason: 'higher-rank' }],
    ['tie-both-enemy', k('water', 7), k('fire', 7), { result: 'draw', reason: 'tie-both-enemy' }],
    ['tie-king-in-enemy', k('water', 7), k('air', 7), { result: 'rebel', reason: 'tie-king-in-enemy' }],
    ['tie-rebel-in-enemy', k('earth', 7), k('fire', 7), { result: 'king', reason: 'tie-rebel-in-enemy' }],
    ['tie', k('earth', 7), k('air', 7), { result: 'draw', reason: 'tie' }],
  ];
  test.each(cases)('%s', (_label, kingCard, rebelCard, expected) => {
    expect(resolveLaneDetailed(kingCard, rebelCard, 'fire', 'water')).toEqual(expected);
    expect(resolveLane(kingCard, rebelCard, 'fire', 'water')).toBe(expected.result);
  });
});
