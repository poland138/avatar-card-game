import { gameReducer, initialState } from '../core/reducer';
import { resolveTrick } from '../core/rules';
import {
  getStatus, explainTrick, explainLane, explainDuel, getPhaseIntro, cardLabel,
} from '../core/turnInfo';

const players = [
  { name: 'You', element: 'water' },
  { name: 'Firebender', element: 'fire' },
  { name: 'Earthbender', element: 'earth' },
  { name: 'Airbender', element: 'air' },
];

function play(playerIdx, suit, rank) {
  return { playerIdx, card: { suit, rank, id: `${suit}-${rank}` } };
}

function ffa() {
  const s = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'water' });
  return gameReducer(s, { type: 'START_GAME' });
}

function sittingOut(extra = {}) {
  return {
    ...ffa(),
    skirmish: { participants: [1, 2], savedScores: [0, 0, 0, 0], totalTricks: 5, recursionLevel: 0 },
    ...extra,
  };
}

function humanKing() {
  return gameReducer(ffa(), { type: 'DEAL_REBELLION', kingIdx: 0 });
}

function humanRebelAttacked() {
  const s = gameReducer(ffa(), { type: 'DEAL_REBELLION', kingIdx: 2 });
  const attack = [
    { suit: 'fire', rank: 9, id: 'fire-9' },
    { suit: 'earth', rank: 12, id: 'earth-12' },
    { suit: 'air', rank: 3, id: 'air-3' },
  ];
  return gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: attack });
}

function resolvedHumanKingDuel() {
  let s = humanKing();
  s = gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: s.players[0].hand.slice(0, 3) });
  s = gameReducer(s, { type: 'AI_REBELS_RESPOND' });
  return gameReducer(s, { type: 'RESOLVE_DUEL' });
}

describe('cardLabel', () => {
  test('uses element name and rank label', () => {
    expect(cardLabel({ suit: 'earth', rank: 12 })).toBe('Earth Q');
    expect(cardLabel({ suit: 'fire', rank: 9 })).toBe('Fire 9');
  });
});

describe('getStatus', () => {
  test('menus and game over', () => {
    expect(getStatus(initialState).phaseLabel).toBe('Choose your element');
    expect(getStatus(gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'air' })).phaseLabel).toBe('Prepare');
    expect(getStatus({ ...ffa(), phase: 'gameover' }).phaseLabel).toBe('Game over');
  });

  test('crowning pause', () => {
    expect(getStatus({ ...ffa(), phase: 'score', kingIdx: 1 }))
      .toEqual({ phaseLabel: 'King crowned', progress: '', instruction: 'Preparing the next round…' });
  });

  test('FFA asks for a card, then for Play', () => {
    const s = ffa();
    expect(getStatus(s)).toEqual({
      phaseLabel: 'Free-for-all', progress: 'Trick 1 of 13', instruction: 'Pick a card to play.',
    });
    const picked = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
    expect(getStatus(picked).instruction).toBe('Press Play to reveal all cards at once.');
  });

  test('FFA reveal, then Continue', () => {
    let s = ffa();
    s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
    s = gameReducer(s, { type: 'COMMIT_FFA_TURN' });
    expect(getStatus(s).instruction).toBe('Revealing…');
    s = gameReducer(s, { type: 'ACK_FFA_REVEAL' });
    expect(getStatus(s).instruction).toBe('Trick over. Press Continue for the next one.');
  });

  test('last trick asks to continue to the crowning', () => {
    const s = gameReducer(ffa(), { type: 'SKIP_TO_FFA_END', wins: [4, 3, 3, 3] });
    expect(getStatus(s).instruction).toBe('Last trick played. Press Continue to see who is crowned.');
  });

  test('skirmish when the human sits out', () => {
    expect(getStatus(sittingOut())).toEqual({
      phaseLabel: 'Skirmish',
      progress: 'Trick 1 of 5',
      instruction: 'You sit this skirmish out. Tricks play automatically.',
    });
    expect(getStatus(sittingOut({ waitingForContinue: true })).instruction).toBe('Watching the skirmish…');
  });

  test('human king placing cards', () => {
    let s = humanKing();
    const [a, b, c] = s.players[0].hand;
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, null, null] });
    expect(getStatus(s)).toEqual({
      phaseLabel: 'Rebellion · You are King',
      progress: 'Duel 1 of 7 · King 0 – Rebels 0',
      instruction: 'Place an attack card in each lane (1/3): pick a card, then tap a lane.',
    });
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, b, c] });
    expect(getStatus(s).instruction).toBe('Press Attack to launch all three lanes.');
    s = gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: [a, b, c] });
    expect(getStatus(s).instruction).toBe('Rebels are choosing defenses…');
  });

  test('AI king choosing', () => {
    const s = gameReducer(ffa(), { type: 'DEAL_REBELLION', kingIdx: 2 });
    expect(getStatus(s).instruction).toBe('The King is choosing attacks…');
  });

  test('human rebel sees the attack on their lane, then confirms', () => {
    let s = humanRebelAttacked();
    expect(getStatus(s).instruction).toBe("Pick a card to defend lane 2 against the King's Earth Q.");
    s = gameReducer(s, { type: 'SELECT_REBEL_CARD', card: s.players[0].hand[0] });
    expect(getStatus(s).instruction).toBe('Press Defend to lock in your card.');
  });

  test('resolving shows the updated duel tally', () => {
    const s = resolvedHumanKingDuel();
    const t = s.pendingResolution.newDuelWins;
    expect(getStatus(s).progress).toBe(`Duel 1 of 7 · King ${t.king} – Rebels ${t.rebellion}`);
    expect(getStatus(s).instruction).toBe('Duel over. Press Continue.');
  });
});

describe('explainTrick', () => {
  const cases = [
    ['only-trump', [play(0, 'water', 5), play(1, 'earth', 14), play(2, 'air', 13), play(3, 'fire', 12)],
      'You win: Water 5 was the only trump played.'],
    ['highest-trump', [play(0, 'water', 5), play(1, 'fire', 9), play(2, 'air', 13), play(3, 'fire', 12)],
      'Firebender wins: Fire 9 is the highest trump.'],
    ['highest-rank', [play(0, 'fire', 3), play(1, 'air', 10), play(2, 'water', 7), play(3, 'earth', 2)],
      'Firebender wins: no trumps were played, so the highest card (Air 10) takes it.'],
    ['tie-defender', [play(0, 'fire', 10), play(1, 'water', 10), play(2, 'air', 2), play(3, 'water', 3)],
      'Firebender wins the tie: a tied card was Fire, and ties go to the Fire player.'],
    ['tie-first-trump', [play(0, 'water', 9), play(1, 'fire', 9), play(2, 'water', 2), play(3, 'fire', 3)],
      'You win the tie: tied trumps go to the earlier seat.'],
  ];

  test.each(cases)('%s', (reason, plays, text) => {
    const result = resolveTrick(plays, players);
    expect(result.reason).toBe(reason);
    expect(explainTrick({ plays, ...result }, players)).toBe(text);
  });

  test('tie-random', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const plays = [play(0, 'earth', 8), play(1, 'air', 8), play(2, 'fire', 2), play(3, 'earth', 3)];
    const result = resolveTrick(plays, players);
    spy.mockRestore();
    expect(explainTrick({ plays, ...result }, players))
      .toBe('You win the tie: equal cards with no element tiebreak, so it was a coin flip.');
  });
});

describe('explainLane', () => {
  const base = { kingElement: 'fire', rebelElement: 'water', kingName: 'Firebender', rebelName: 'You' };
  const k = (suit, rank) => ({ suit, rank });
  const cases = [
    ['both-own, rebel higher', k('fire', 10), k('water', 12), 'rebel', 'You win: both played their own element, and Water Q is higher.'],
    ['both-own, equal', k('fire', 10), k('water', 10), 'draw', 'Draw: both played their own element at the same rank (Fire 10 vs Water 10).'],
    ['king-own', k('fire', 2), k('earth', 14), 'king', "Firebender wins: the King's own-element Fire 2 beats the off-element Earth A."],
    ['rebel-own', k('earth', 14), k('water', 2), 'rebel', "You win: own-element Water 2 beats the King's off-element Earth A."],
    ['higher-rank', k('earth', 9), k('air', 5), 'king', 'Firebender wins: neither played their own element, and Earth 9 is higher.'],
    ['tie-both-enemy', k('water', 7), k('fire', 7), 'draw', "Draw: same rank, and both played into the other's element."],
    ['tie-king-in-enemy', k('water', 7), k('air', 7), 'rebel', 'You win: same rank, but the King played your element.'],
    ['tie-rebel-in-enemy', k('earth', 7), k('fire', 7), 'king', "Firebender wins: same rank, but you played the King's element."],
    ['tie', k('earth', 7), k('air', 7), 'draw', 'Draw: same rank with no element advantage.'],
  ];

  test.each(cases)('%s', (_label, kingCard, rebelCard, result, text) => {
    expect(explainLane({ ...base, kingCard, rebelCard })).toEqual({ result, text });
  });

  test('no defender', () => {
    expect(explainLane({ ...base, kingCard: k('fire', 3), rebelCard: null }))
      .toEqual({ result: 'draw', text: 'Draw: no defender in this lane.' });
  });
});

describe('explainDuel', () => {
  test('agrees with the reducer lane outcomes', () => {
    const s = resolvedHumanKingDuel();
    const lanes = explainDuel(s);
    expect(lanes.map(l => l.result)).toEqual(s.laneOutcomes);
    expect(lanes.map(l => l.laneIdx)).toEqual([0, 1, 2]);
  });
});

describe('getPhaseIntro', () => {
  test('starting the game announces the free-for-all', () => {
    const before = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'water' });
    const after = gameReducer(before, { type: 'START_GAME' });
    expect(getPhaseIntro(before, after)).toMatchObject({ kind: 'ffa-start', title: 'Free-for-all' });
  });

  test('no intro mid-phase', () => {
    const s = ffa();
    const picked = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
    expect(getPhaseIntro(s, picked)).toBeNull();
  });

  test('a new FFA after an overthrow says who fell and the score', () => {
    const before = {
      ...ffa(), phase: 'score', kingIdx: 2,
      lastRebellion: { kingIdx: 2, held: false, duels: { king: 2, rebellion: 4 }, points: 0, xp: 0 },
    };
    const after = gameReducer(before, { type: 'DEAL_FFA' });
    expect(getPhaseIntro(before, after)).toMatchObject({
      kind: 'ffa-start',
      title: `${before.players[2].name} was overthrown!`,
      body: 'The rebels won 4–2. A new free-for-all decides the next King.',
    });
  });

  test('debug Return to FFA gets the plain intro', () => {
    const before = gameReducer(ffa(), { type: 'DEAL_REBELLION', kingIdx: 2 });
    const after = gameReducer(before, { type: 'RETURN_TO_FFA' });
    expect(getPhaseIntro(before, after)).toMatchObject({ kind: 'ffa-start', title: 'Free-for-all' });
  });

  test('skirmish lists who tied', () => {
    const before = { ...ffa(), trickWins: [4, 4, 3, 2] };
    const after = { ...before, skirmish: { participants: [0, 1], savedScores: [0, 0, 0, 0], totalTricks: 4, recursionLevel: 0 } };
    const intro = getPhaseIntro(before, after);
    expect(intro.kind).toBe('skirmish-start');
    expect(intro.title).toBe('Skirmish!');
    expect(intro.body).toBe(
      `You and ${before.players[1].name} tied with 4 tricks each. They replay a mini free-for-all using only the cards they won.`
    );
  });

  test('rebellion start for a human king', () => {
    const before = { ...ffa(), phase: 'score', kingIdx: 0 };
    const after = gameReducer(before, { type: 'DEAL_REBELLION', kingIdx: 0 });
    const intro = getPhaseIntro(before, after);
    expect(intro).toMatchObject({ kind: 'rebellion-start', title: 'You are King!' });
    expect(intro.body).toContain('You won the most tricks and take the crown.');
  });

  test('rebellion start for a human rebel names their lane', () => {
    const before = { ...ffa(), phase: 'score', kingIdx: 3 };
    const after = gameReducer(before, { type: 'DEAL_REBELLION', kingIdx: 3 });
    expect(getPhaseIntro(before, after).body).toContain('You are a rebel defending lane 2.');
  });

  test('a held crown shows points, XP and the streak', () => {
    const before = {
      ...ffa(), phase: 'score', kingIdx: 1, kingStreak: 1,
      lastRebellion: { kingIdx: 1, held: true, duels: { king: 4, rebellion: 2 }, points: 4, xp: 5 },
    };
    const after = gameReducer(before, { type: 'DEAL_REBELLION', kingIdx: 1 });
    const intro = getPhaseIntro(before, after);
    expect(intro.title).toBe(`${before.players[1].name} holds the crown!`);
    expect(intro.body).toContain('won 4–2: +4 pts, +5 XP.');
    expect(intro.body).toContain('Streak ×2');
  });
});
