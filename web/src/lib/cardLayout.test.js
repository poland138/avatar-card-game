import { describe, expect, test } from 'vitest';
import { gameReducer, initialState } from '@core/reducer';
import {
  geometryFor, tableGeometry, handPositions, layoutTable, getHandState, seatMap, laneX, laneRows,
  nearestLane, seatPosition, BADGE_SIZE,
} from './cardLayout';

const SIZES = [
  { name: 'tiny phone table', width: 374, height: 300 },
  { name: 'phone table', width: 374, height: 600 },
  { name: 'short laptop table', width: 1340, height: 450 },
  { name: 'desktop table', width: 1256, height: 560 },
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
function rebelAttacked() {
  const s = gameReducer(ffaState(), { type: 'DEAL_REBELLION', kingIdx: 2 });
  return gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: s.players[2].hand.slice(0, 3) });
}
function resolvedRebelDuel() {
  let s = rebelAttacked();
  s = gameReducer(s, { type: 'SELECT_REBEL_CARD', card: s.players[0].hand[0] });
  s = gameReducer(s, { type: 'COMMIT_REBEL_TURN' });
  return gameReducer(s, { type: 'RESOLVE_DUEL' });
}
function bigSkirmish() {
  const s = ffaState();
  const deck = [...s.players[1].hand, ...s.players[2].hand];
  const players = s.players.map((p, i) => (i === 0 ? { ...p, hand: deck.slice(0, 24) } : i === 1 ? { ...p, hand: deck.slice(24) } : { ...p, hand: [] }));
  return { ...s, players, skirmish: { participants: [0, 1], savedScores: [0, 0, 0, 0], totalTricks: 24, recursionLevel: 0 } };
}

const STATES = {
  'FFA start': ffaState,
  'FFA revealed': revealedState,
  'human king duel': resolvedKingDuel,
  'human rebel duel': resolvedRebelDuel,
  '24-card skirmish': bigSkirmish,
};

function rectOf(item, g) {
  const w = g.cardW * item.scale;
  const h = g.cardH * item.scale;
  const sideways = Math.abs(Math.abs(item.rotZ) - Math.PI / 2) < 0.01;
  const [rw, rh] = sideways ? [h, w] : [w, h];
  return { l: item.x - rw / 2, r: item.x + rw / 2, b: item.y - rh / 2, t: item.y + rh / 2 };
}
const boxOf = (o, w, h) => ({ l: o.x - w / 2, r: o.x + w / 2, b: o.y - h / 2, t: o.y + h / 2 });
const intersects = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.b < b.t - 0.5 && b.b < a.t - 0.5;
const inside = (r, g) =>
  r.l >= -g.width / 2 - 0.5 && r.r <= g.width / 2 + 0.5 && r.b >= -g.height / 2 - 0.5 && r.t <= g.height / 2 + 0.5;

function groups(layout, g) {
  const isHand = c => c.target?.kind === 'hand';
  const isMini = c => c.scale < 1;
  return {
    hand: layout.cards.filter(isHand).map(c => rectOf(c, g)),
    minis: layout.cards.filter(isMini).map(c => rectOf(c, g)),
    play: [
      ...layout.cards.filter(c => !isHand(c) && !isMini(c)).map(c => rectOf(c, g)),
      ...layout.slots.map(s => boxOf(s, g.cardW, g.cardH)),
      ...layout.badges.map(b => boxOf(b, g.cardW * BADGE_SIZE.w, g.cardH * BADGE_SIZE.h)),
    ],
    labels: layout.labels.map(l => boxOf(l, l.w, l.h)),
  };
}

function expectApart(as, bs, what) {
  for (const a of as) for (const b of bs) expect(intersects(a, b), what).toBe(false);
}

describe('tableGeometry', () => {
  test.each(SIZES)('$name: card size stays within bounds', ({ width, height }) => {
    for (const tally of [false, true]) {
      const g = tableGeometry(width, height, { handCount: 21, tally });
      expect(g.cardW).toBeGreaterThanOrEqual(24);
      expect(g.cardW).toBeLessThanOrEqual(120);
      expect(g.cardH).toBe(Math.round(g.cardW * 1.4));
    }
  });

  test('a short laptop table gets real-sized cards', () => {
    expect(tableGeometry(1340, 450).cardW).toBeGreaterThanOrEqual(65);
  });
});

describe('layoutTable keeps every group apart', () => {
  for (const [stateName, make] of Object.entries(STATES)) {
    test.each(SIZES)(`${stateName} — $name`, size => {
      const s = make();
      const g = geometryFor(s, size.width, size.height);
      const layout = layoutTable(s, g, {});
      const { hand, minis, play, labels } = groups(layout, g);

      for (const r of [...hand, ...minis, ...play, ...labels]) expect(inside(r, g)).toBe(true);
      expectApart(play, hand, 'play area vs hand');
      expectApart(play, minis, 'play area vs opponent cards');
      expectApart(play, labels, 'play area vs labels');
      expectApart(labels, hand, 'labels vs hand');
      expectApart(labels, minis, 'labels vs opponent cards');
      for (let i = 0; i < labels.length; i++) expectApart([labels[i]], labels.slice(i + 1), 'label vs label');

      const playCards = layout.cards.filter(c => c.target?.kind !== 'hand' && c.scale === 1).map(c => rectOf(c, g));
      for (let i = 0; i < playCards.length; i++) expectApart([playCards[i]], playCards.slice(i + 1), 'play card vs play card');
    });
  }
});

describe('seats', () => {
  test('free-for-all seats by player index', () => {
    expect(seatMap(ffaState())).toEqual({ 0: 'south', 1: 'west', 2: 'north', 3: 'east' });
  });

  test('an AI King sits on top and rebels line up with their lanes', () => {
    const s = rebelAttacked();
    const [a, , c] = s.rebelOrder;
    expect(seatMap(s)).toEqual({ 0: 'south', 2: 'north', [a]: 'west', [c]: 'east' });
    const g = geometryFor(s, 1256, 560);
    const { kingY, rebelY } = laneRows(s, g);
    expect(kingY).toBeGreaterThan(rebelY);
  });

  test('when you are King, rebels sit left/top/right and your row is nearest you', () => {
    const s = kingState();
    const [a, b, c] = s.rebelOrder;
    expect(seatMap(s)).toEqual({ 0: 'south', [a]: 'west', [b]: 'north', [c]: 'east' });
    const { kingY, rebelY } = laneRows(s, geometryFor(s, 1256, 560));
    expect(kingY).toBeLessThan(rebelY);
  });

  test('opponent cards on the sides are rotated 90°', () => {
    const s = ffaState();
    const layout = layoutTable(s, geometryFor(s, 1256, 560), {});
    const minis = layout.cards.filter(c => c.scale < 1);
    expect(minis).toHaveLength(39);
    expect(minis.filter(c => Math.abs(c.rotZ) > 1)).toHaveLength(26);
    expect(minis.every(c => !c.faceUp)).toBe(true);
  });

  test('dev peek shows opponent cards face up', () => {
    const s = ffaState();
    const layout = layoutTable(s, geometryFor(s, 1256, 560), { dev: { showHands: true } });
    expect(layout.cards.filter(c => c.scale < 1).every(c => c.faceUp)).toBe(true);
  });
});

describe('selection, preview and drag', () => {
  test('a picked FFA card sits in your slot, not in your hand', () => {
    let s = ffaState();
    const pick = s.players[0].hand[2];
    s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: pick });
    const g = geometryFor(s, 1256, 560);
    const { cards } = layoutTable(s, g, {});
    const preview = cards.find(c => c.id === pick.id);
    expect(preview.target.kind).toBe('preview');
    expect(preview).toMatchObject(seatPosition('south', g));
    expect(preview.draggable).toBe(true);
    expect(cards.filter(c => c.target?.kind === 'hand')).toHaveLength(12);
  });

  test('a rebel pick previews in your lane', () => {
    let s = rebelAttacked();
    const pick = s.players[0].hand[0];
    s = gameReducer(s, { type: 'SELECT_REBEL_CARD', card: pick });
    const g = geometryFor(s, 1256, 560);
    const preview = layoutTable(s, g, {}).cards.find(c => c.id === pick.id);
    expect(preview.target.kind).toBe('preview');
    expect(preview.x).toBeCloseTo(laneX(1, g));
    expect(preview.y).toBeCloseTo(laneRows(s, g).rebelY);
  });

  test('a dragged card follows the pointer', () => {
    const s = ffaState();
    const card = s.players[0].hand[3];
    const g = geometryFor(s, 1256, 560);
    const { cards } = layoutTable(s, g, { drag: { id: card.id, x: 40, y: 50 } });
    const dragged = cards.filter(c => c.id === card.id);
    expect(dragged).toHaveLength(1);
    expect(dragged[0]).toMatchObject({ x: 40, y: 50 });
  });

  test('nearestLane picks the closest lane', () => {
    const g = tableGeometry(1256, 560, { tally: true });
    expect(nearestLane(laneX(0, g) + 5, g)).toBe(0);
    expect(nearestLane(3, g)).toBe(1);
    expect(nearestLane(laneX(2, g) + 200, g)).toBe(2);
  });

  test('human king: placed cards leave the hand and sit in their lane', () => {
    let s = kingState();
    const [a, b] = s.players[0].hand;
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, null, b] });
    const g = geometryFor(s, 1256, 560);
    const { cards, slots } = layoutTable(s, g, { kingSelection: null });
    expect(cards.filter(c => c.target?.kind === 'hand')).toHaveLength(19);
    const placed = cards.filter(c => c.target?.kind === 'placed');
    expect(placed.map(c => c.target.lane)).toEqual([0, 2]);
    expect(placed.every(c => c.interactive && c.draggable)).toBe(true);
    expect(slots.filter(sl => sl.target?.kind === 'lane')).toHaveLength(3);
  });

  test('placing cards never changes the card size', () => {
    let s = kingState();
    const before = geometryFor(s, 374, 300);
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: s.players[0].hand.slice(0, 3) });
    expect(geometryFor(s, 374, 300)).toEqual(before);
  });
});

describe('points and absorb targets', () => {
  test('a revealed trick flies to the winner label, whose count waits for Continue', () => {
    const s = revealedState();
    const g = geometryFor(s, 1256, 560);
    const layout = layoutTable(s, g, {});
    const w = s.revealedTrick.winner;
    const label = layout.labels.find(l => l.id === `seat-${w}`);
    expect(layout.resolved).toHaveLength(4);
    for (const r of layout.resolved) expect(r.pile).toMatchObject({ x: label.x, y: label.y });
    expect(label.value).toBe(s.trickWins[w] - 1);
  });

  test('duel lanes fly to the King or Rebels tally', () => {
    const s = resolvedKingDuel();
    const layout = layoutTable(s, geometryFor(s, 1256, 560), {});
    const king = layout.labels.find(l => l.id === 'tally-king');
    const rebels = layout.labels.find(l => l.id === 'tally-rebels');
    s.laneOutcomes.forEach((o, lane) => {
      const entries = layout.resolved.filter(r => Math.abs(r.item.x - laneX(lane, geometryFor(s, 1256, 560))) < 1);
      for (const e of entries) {
        if (o === 'king') expect(e.pile).toBe(king);
        if (o === 'rebel') expect(e.pile).toBe(rebels);
      }
    });
  });

  test('labels show tricks in the free-for-all and war points in the rebellion', () => {
    const f = layoutTable(ffaState(), geometryFor(ffaState(), 1256, 560), {});
    expect(f.labels.filter(l => l.kind === 'seat').every(l => l.caption === 'tricks')).toBe(true);
    expect(f.labels.some(l => l.kind === 'pill')).toBe(true);
    const k = kingState();
    const r = layoutTable(k, geometryFor(k, 1256, 560), {});
    expect(r.labels.filter(l => l.kind === 'seat').every(l => l.caption === 'pts')).toBe(true);
    expect(r.labels.find(l => l.idx === 0).tag).toBe('King');
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
    expect(getHandState(rebelAttacked(), {})).toMatchObject({ mode: 'rebel', interactive: true });
  });
  test('hand positions fit inside the width', () => {
    for (const { width, height } of SIZES) {
      const g = tableGeometry(width, height, { handCount: 24 });
      for (const p of handPositions(24, g)) {
        expect(p.x - g.cardW / 2).toBeGreaterThanOrEqual(-width / 2 + 7.5);
        expect(p.x + g.cardW / 2).toBeLessThanOrEqual(width / 2 - 7.5);
      }
    }
  });
});
