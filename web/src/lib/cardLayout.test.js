import { describe, expect, test } from 'vitest';
import { gameReducer, initialState } from '@core/reducer';
import {
  cardMetrics, tableGeometry, handPositions, layoutTable, getHandState, laneX, BADGE_SIZE,
} from './cardLayout';

const SIZES = [
  { name: 'tiny phone table', width: 374, height: 200 },
  { name: 'short phone table', width: 374, height: 260 },
  { name: 'phone', width: 374, height: 430 },
  { name: 'desktop', width: 780, height: 470 },
];

function ffaState() {
  const s = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'water' });
  return gameReducer(s, { type: 'START_GAME' });
}
function revealedState() {
  let s = ffaState();
  s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
  return gameReducer(s, { type: 'COMMIT_FFA_TURN' });
}
function kingState() {
  return gameReducer(ffaState(), { type: 'DEAL_REBELLION', kingIdx: 0 });
}
function resolvedKingDuel() {
  let s = kingState();
  s = gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: s.players[0].hand.slice(0, 3) });
  s = gameReducer(s, { type: 'AI_REBELS_RESPOND' });
  return gameReducer(s, { type: 'RESOLVE_DUEL' });
}
function rebelState() {
  const s = gameReducer(ffaState(), { type: 'DEAL_REBELLION', kingIdx: 2 });
  return gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: s.players[2].hand.slice(0, 3) });
}

const geo = (size, state) => tableGeometry(size.width, size.height, state.players[0].hand.length);
const rect = (item, w, h) => ({ l: item.x - w / 2, r: item.x + w / 2, b: item.y - h / 2, t: item.y + h / 2 });
const cardRect = (item, g) => rect(item, g.cardW, g.cardH);
const intersects = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.b < b.t - 0.5 && b.b < a.t - 0.5;
const inside = (r, g) =>
  r.l >= -g.width / 2 - 0.5 && r.r <= g.width / 2 + 0.5 && r.b >= -g.height / 2 - 0.5 && r.t <= g.height / 2 + 0.5;
const isHand = c => c.target?.kind === 'hand';

function expectNoOverlaps(rects) {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      expect(intersects(rects[i], rects[j]), `rect ${i} overlaps rect ${j}`).toBe(false);
    }
  }
}

describe('cardMetrics', () => {
  test.each(SIZES)('$name: card size stays within bounds', ({ width, height }) => {
    for (const rows of [1, 2]) {
      const { cardW, cardH } = cardMetrics(width, height, rows);
      expect(cardW).toBeGreaterThanOrEqual(28);
      expect(cardW).toBeLessThanOrEqual(110);
      expect(cardH).toBe(Math.round(cardW * 1.4));
    }
  });
});

describe('handPositions', () => {
  test.each(SIZES)('$name: a 21-card hand fits inside the table width', ({ width, height }) => {
    const g = tableGeometry(width, height, 21);
    for (const p of handPositions(21, g)) {
      expect(p.x - g.cardW / 2).toBeGreaterThanOrEqual(-width / 2 + 7.5);
      expect(p.x + g.cardW / 2).toBeLessThanOrEqual(width / 2 - 7.5);
    }
  });

  test.each(SIZES)('$name: a 24-card skirmish hand uses two rows clear of the play area', ({ width, height }) => {
    const g = tableGeometry(width, height, 24);
    expect(g.rows).toBe(2);
    const pos = handPositions(24, g);
    expect(pos).toHaveLength(24);
    for (const p of pos) {
      expect(p.x - g.cardW / 2).toBeGreaterThanOrEqual(-width / 2 + 7.5);
      expect(p.x + g.cardW / 2).toBeLessThanOrEqual(width / 2 - 7.5);
      // Even lifted, no hand card reaches the lowest lane card.
      expect(p.y + g.cardH / 2 + g.lift).toBeLessThanOrEqual(g.centerY - g.cardH * 1.18 + 0.5);
    }
  });

  test('a 13-card hand stays on one row and later cards sit above earlier ones', () => {
    const g = tableGeometry(780, 470, 13);
    expect(g.rows).toBe(1);
    const pos = handPositions(13, g);
    expect(pos[12].z).toBeGreaterThan(pos[0].z);
  });
});

describe('layoutTable — free-for-all', () => {
  test.each(SIZES)('$name: every card and slot is inside the table', size => {
    for (const s of [ffaState(), revealedState()]) {
      const g = geo(size, s);
      const { cards, slots } = layoutTable(s, g);
      for (const c of cards) expect(inside(cardRect(c, g), g)).toBe(true);
      for (const sl of slots) expect(inside(cardRect(sl, g), g)).toBe(true);
    }
  });

  test.each(SIZES)('$name: trick cards overlap neither each other nor the hand', size => {
    const s = revealedState();
    const g = geo(size, s);
    const { cards } = layoutTable(s, g);
    const trick = cards.filter(c => !isHand(c));
    const hand = cards.filter(isHand);
    expect(trick).toHaveLength(4);
    expect(hand).toHaveLength(12);
    expectNoOverlaps(trick.map(c => cardRect(c, g)));
    for (const t of trick) for (const h of hand) expect(intersects(cardRect(t, g), cardRect(h, g))).toBe(false);
  });

  test('a selected card lifts, glows, and stays below the play area', () => {
    let s = ffaState();
    const pick = s.players[0].hand[2];
    s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: pick });
    const g = geo({ width: 780, height: 470 }, s);
    expect(g.rows).toBe(1);
    const { cards } = layoutTable(s, g);
    const lifted = cards.filter(c => c.y > g.handY);
    expect(lifted.map(c => c.id)).toEqual([pick.id]);
    expect(lifted[0].glow).toBe(true);
    expect(lifted[0].y + g.cardH / 2).toBeLessThanOrEqual(g.centerY - g.cardH * 1.12 + 0.5);
  });

  test('the hand is not clickable after the reveal', () => {
    const s = revealedState();
    const { cards } = layoutTable(s, geo({ width: 780, height: 470 }, s));
    expect(cards.filter(isHand).every(c => !c.interactive)).toBe(true);
  });

  test('the trick winner glows and the others dim', () => {
    const s = revealedState();
    const { cards } = layoutTable(s, geo({ width: 780, height: 470 }, s));
    const winnerCard = s.revealedTrick.plays.find(p => p.playerIdx === s.revealedTrick.winner).card;
    for (const c of cards.filter(x => !isHand(x))) {
      expect(c.glow).toBe(c.id === winnerCard.id);
      expect(c.dim).toBe(c.id !== winnerCard.id);
    }
  });
});

describe('layoutTable — rebellion', () => {
  test.each(SIZES)('$name: lanes, hand and badges never collide', size => {
    const s = resolvedKingDuel();
    const g = geo(size, s);
    const { cards, slots, badges } = layoutTable(s, g);
    const lane = cards.filter(c => !isHand(c));
    const hand = cards.filter(isHand);
    expect(lane).toHaveLength(6);
    expect(hand).toHaveLength(18);
    expect(slots).toHaveLength(6);
    expect(badges).toHaveLength(3);
    expectNoOverlaps(lane.map(c => cardRect(c, g)));
    for (const l of lane) for (const h of hand) expect(intersects(cardRect(l, g), cardRect(h, g))).toBe(false);
    const badgeRects = badges.map(b => rect(b, g.cardW * BADGE_SIZE.w, g.cardH * BADGE_SIZE.h));
    for (const b of badgeRects) {
      expect(inside(b, g)).toBe(true);
      for (const l of lane) expect(intersects(b, cardRect(l, g))).toBe(false);
    }
    for (const c of [...cards, ...slots]) expect(inside(cardRect(c, g), g)).toBe(true);
  });

  test('human king: placed cards leave the hand and sit in their lane', () => {
    let s = kingState();
    const [a, b] = s.players[0].hand;
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, null, b] });
    const g = geo({ width: 780, height: 470 }, s);
    const { cards, slots } = layoutTable(s, g, { kingSelection: null });
    expect(cards.filter(isHand)).toHaveLength(19);
    const placed = cards.filter(c => c.target?.kind === 'placed');
    expect(placed.map(c => c.target.lane)).toEqual([0, 2]);
    expect(placed[0].x).toBeCloseTo(laneX(0, g));
    expect(placed.every(c => c.interactive)).toBe(true);
    expect(slots.filter(sl => sl.target?.kind === 'lane')).toHaveLength(3);
  });

  test('placing cards never changes the row count', () => {
    let s = kingState();
    const before = geo({ width: 374, height: 260 }, s);
    const [a, b, c] = s.players[0].hand;
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, b, c] });
    const after = geo({ width: 374, height: 260 }, s);
    expect(after.rows).toBe(before.rows);
    expect(after.cardW).toBe(before.cardW);
  });
});

describe('getHandState', () => {
  test('free-for-all picking', () => {
    expect(getHandState(ffaState(), {})).toMatchObject({ mode: 'ffa', interactive: true, selectedId: null });
  });
  test('human king choosing uses the local selection', () => {
    const s = kingState();
    const sel = s.players[0].hand[4];
    expect(getHandState(s, { kingSelection: sel })).toMatchObject({ mode: 'king', interactive: true, selectedId: sel.id });
  });
  test('human rebel defending', () => {
    expect(getHandState(rebelState(), {})).toMatchObject({ mode: 'rebel', interactive: true });
  });
});
