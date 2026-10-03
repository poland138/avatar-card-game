// Pure layout for the three.js table. Orthographic camera with zoom 1, so
// world units are CSS pixels and (0, 0) is the canvas center, +y up.
// Seats: 0 = you (south), 1 = west, 2 = north, 3 = east.
//
// Vertical budget: the hand needs 8 + cardH + (rows - 1)·0.5·cardH + lift
// (lift = 0.22·cardH); the tallest play area (rebellion lanes) needs
// 2.36·cardH. Hence h ≥ 16 + F·cardH with F ≈ 3.58 (one row) / 4.08 (two rows);
// 3.7 / 4.2 leave rounding slack.

export const BADGE_SIZE = { w: 0.9, h: 0.26 };
const HEIGHT_FACTOR = { 1: 3.7, 2: 4.2 };

export function cardMetrics(width, height, rows = 1) {
  const byHeight = (height - 16) / (1.4 * HEIGHT_FACTOR[rows]);
  const cardW = Math.floor(Math.max(28, Math.min(110, width / 5.5, byHeight)));
  return { cardW, cardH: Math.round(cardW * 1.4) };
}

export function tableGeometry(width, height, handCount = 0) {
  // Decide rows once from the one-row size; never re-evaluate (avoids flip-flopping).
  const single = cardMetrics(width, height, 1);
  const singleSpacing = handCount > 1 ? (width - 16 - single.cardW) / (handCount - 1) : Infinity;
  const rows = handCount > 13 && singleSpacing < 0.45 * single.cardW ? 2 : 1;
  const { cardW, cardH } = rows === 1 ? single : cardMetrics(width, height, 2);
  const lift = Math.round(cardH * 0.22);
  const handY = -height / 2 + 8 + cardH / 2;
  const handTop = -height / 2 + 8 + cardH + (rows - 1) * 0.5 * cardH + lift;
  const centerY = (height / 2 + handTop) / 2;
  return { width, height, cardW, cardH, rows, handY, handYBack: handY + 0.5 * cardH, centerY, lift };
}

export function seatPosition(seat, g) {
  const dy = g.cardH * 0.62;
  const dx = g.cardW * 1.3;
  if (seat === 0) return { x: 0, y: g.centerY - dy };
  if (seat === 1) return { x: -dx, y: g.centerY };
  if (seat === 2) return { x: 0, y: g.centerY + dy };
  return { x: dx, y: g.centerY };
}

export function spawnPoint(seat, g) {
  if (seat === 1) return { x: -g.width / 2 - g.cardW, y: g.centerY };
  if (seat === 2) return { x: 0, y: g.height / 2 + g.cardH };
  if (seat === 3) return { x: g.width / 2 + g.cardW, y: g.centerY };
  return { x: 0, y: -g.height / 2 - g.cardH };
}

export function laneX(laneIdx, g) {
  return (laneIdx - 1) * g.cardW * 1.4;
}
export function laneKingY(g) {
  return g.centerY + g.cardH * 0.68;
}
export function laneRebelY(g) {
  return g.centerY - g.cardH * 0.68;
}

function rowPositions(count, g, y, zBase) {
  const spacing = count > 1 ? Math.min(g.cardW * 0.62, (g.width - 16 - g.cardW) / (count - 1)) : 0;
  return Array.from({ length: count }, (_, i) => ({
    x: (i - (count - 1) / 2) * spacing,
    y,
    z: zBase + i * 0.1,
  }));
}

export function handPositions(count, g) {
  if (g.rows === 2) {
    const backCount = Math.floor(count / 2);
    // Back row draws below the front row (z 2.x vs 4.x) so front corners stay readable.
    return [
      ...rowPositions(backCount, g, g.handYBack, 2),
      ...rowPositions(count - backCount, g, g.handY, 4),
    ];
  }
  return rowPositions(count, g, g.handY, 2);
}

export function getHandState(state, ui = {}) {
  const hand = state.players[0]?.hand ?? [];
  if (state.phase === 'freeforall') {
    const active = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
    const picking = !state.committedFFAPick && !state.revealedTrick && !state.animating && !state.waitingForContinue;
    return {
      hand,
      selectedId: state.humanFFAPick?.id ?? null,
      interactive: picking && active.includes(0),
      mode: 'ffa',
    };
  }
  if (state.phase === 'rebellion') {
    if (state.kingIdx === 0 && state.rebellionStage === 'king-choosing' && !state.waitingForContinue) {
      const placed = new Set(state.selectedKingCards.filter(Boolean).map(c => c.id));
      return {
        hand: hand.filter(c => !placed.has(c.id)),
        selectedId: ui.kingSelection?.id ?? null,
        interactive: true,
        mode: 'king',
      };
    }
    const lane = state.rebelOrder.indexOf(0);
    const defending = lane >= 0 && state.rebellionStage === 'rebels-responding'
      && !state.rebelResponses[lane] && !state.waitingForContinue;
    return {
      hand,
      selectedId: defending ? state.humanRebelSelection?.id ?? null : null,
      interactive: defending,
      mode: 'rebel',
    };
  }
  return { hand, selectedId: null, interactive: false, mode: 'none' };
}

function cardItem(card, fields) {
  return {
    id: card.id,
    card,
    z: 1,
    faceUp: true,
    startFaceDown: false,
    spawn: null,
    dim: false,
    glow: false,
    interactive: false,
    target: null,
    ...fields,
  };
}

function pushHand(state, g, ui, out) {
  const { hand, selectedId, interactive } = getHandState(state, ui);
  const positions = handPositions(hand.length, g);
  hand.forEach((card, i) => {
    const selected = card.id === selectedId;
    const p = positions[i];
    out.cards.push(cardItem(card, {
      x: p.x,
      y: p.y + (selected ? g.lift : 0),
      z: p.z + (selected ? 5 : 0),
      spawn: { x: 0, y: g.centerY },
      glow: selected,
      interactive,
      target: { kind: 'hand', card },
    }));
  });
}

function layoutFFA(state, g, ui, out) {
  const active = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
  for (const idx of active) {
    out.slots.push({
      id: `slot-${idx}`,
      ...seatPosition(idx, g),
      label: idx === 0 ? 'You' : state.players[idx].name,
      suit: state.players[idx].element,
      target: null,
    });
  }
  if (state.revealedTrick) {
    const { plays, winner } = state.revealedTrick;
    for (const p of plays) {
      const ai = p.playerIdx !== 0;
      out.cards.push(cardItem(p.card, {
        ...seatPosition(p.playerIdx, g),
        startFaceDown: ai,
        spawn: ai ? spawnPoint(p.playerIdx, g) : null,
        dim: p.playerIdx !== winner,
        glow: p.playerIdx === winner,
      }));
    }
  }
  pushHand(state, g, ui, out);
}

const BADGE = {
  king: { text: 'KING', color: '#fbbf24' },
  rebel: { text: 'REBEL', color: '#60a5fa' },
  draw: { text: 'DRAW', color: '#c084fc' },
};

function layoutRebellion(state, g, ui, out) {
  const kingIdx = state.kingIdx;
  const humanKingChoosing = kingIdx === 0 && state.rebellionStage === 'king-choosing' && !state.waitingForContinue;
  state.rebelOrder.forEach((rebelIdx, lane) => {
    const x = laneX(lane, g);
    const kingY = laneKingY(g);
    const rebelY = laneRebelY(g);
    let kingLabel = 'King';
    if (humanKingChoosing) kingLabel = ui.kingSelection ? 'Place here' : `Lane ${lane + 1}`;
    out.slots.push({
      id: `lane-king-${lane}`, x, y: kingY, label: kingLabel,
      suit: state.players[kingIdx].element,
      target: humanKingChoosing ? { kind: 'lane', lane } : null,
    });
    out.slots.push({
      id: `lane-rebel-${lane}`, x, y: rebelY,
      label: rebelIdx === 0 ? 'Your lane' : state.players[rebelIdx].name,
      suit: state.players[rebelIdx].element,
      target: null,
    });

    const outcome = state.laneOutcomes[lane];
    const kingCard = humanKingChoosing ? state.selectedKingCards[lane] : state.kingLanes[lane];
    if (kingCard) {
      out.cards.push(cardItem(kingCard, {
        x, y: kingY,
        spawn: kingIdx === 0 ? null : { x, y: g.height / 2 + g.cardH },
        dim: outcome === 'rebel',
        glow: outcome === 'king',
        interactive: humanKingChoosing,
        target: humanKingChoosing ? { kind: 'placed', lane } : null,
      }));
    }
    const resp = state.rebelResponses[lane];
    if (resp) {
      const ai = resp.playerIdx !== 0;
      out.cards.push(cardItem(resp.card, {
        x, y: rebelY,
        startFaceDown: ai,
        spawn: ai ? { x, y: -g.height / 2 - g.cardH } : null,
        dim: outcome === 'king',
        glow: outcome === 'rebel',
      }));
    }
    if (outcome) out.badges.push({ id: `badge-${lane}`, x, y: g.centerY, ...BADGE[outcome] });
  });
  pushHand(state, g, ui, out);
}

export function layoutTable(state, g, ui = {}) {
  const out = { cards: [], slots: [], badges: [] };
  if (state.phase === 'freeforall') layoutFFA(state, g, ui, out);
  else if (state.phase === 'rebellion' || (state.phase === 'score' && state.rebelOrder.length > 0)) {
    layoutRebellion(state, g, ui, out);
  } else if (state.phase === 'score') pushHand(state, g, ui, out);
  return out;
}
