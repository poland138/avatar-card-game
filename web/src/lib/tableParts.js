import { ELEMENTS } from '@core/constants';

// Building blocks shared by the free-for-all and King-of-the-Hill table layouts.
// All coordinates are CSS pixels with (0, 0) at the canvas center, +y up.

export const MINI_SCALE = 0.5;
export const BADGE_SIZE = { w: 0.9, h: 0.26 };
export const CARD_CAP = 120;
export const TALLY_H = 30;

export const BADGE = {
  king: { text: 'KING', color: '#fbbf24' },
  rebel: { text: 'REBEL', color: '#60a5fa' },
  draw: { text: 'DRAW', color: '#c084fc' },
};

export function labelSize(width) {
  return width < 600 ? { w: 52, h: 34, compact: true } : { w: 112, h: 44, compact: false };
}

export function isRebellionLayout(state) {
  return (state.phase === 'rebellion' || state.phase === 'score') && state.rebelOrder.length === 3;
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

export function cardItem(card, fields) {
  return {
    id: card.id,
    card,
    x: 0,
    y: 0,
    z: 1,
    rotZ: 0,
    scale: 1,
    faceUp: true,
    startFaceDown: false,
    spawn: null,
    dim: false,
    glow: false,
    interactive: false,
    draggable: false,
    target: null,
    ...fields,
  };
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

// Decide hand rows once from the one-row size; never re-evaluate (avoids flip-flopping).
export function handRows(handCount, width, cardW) {
  const spacing = handCount > 1 ? (width - 16 - cardW) / (handCount - 1) : Infinity;
  return handCount > 13 && spacing < 0.45 * cardW ? 2 : 1;
}

export function handItems(state, g, ui, out, previewId) {
  const { hand, selectedId, interactive, mode } = getHandState(state, ui);
  const shown = hand.filter(c => c.id !== previewId && c.id !== ui.drag?.id);
  const positions = handPositions(shown.length, g);
  const lifted = mode === 'king' ? selectedId : null;
  shown.forEach((card, i) => {
    const selected = card.id === lifted;
    const p = positions[i];
    out.cards.push(cardItem(card, {
      x: p.x,
      y: p.y + (selected ? g.lift : 0),
      z: p.z + (selected ? 5 : 0),
      spawn: { x: 0, y: g.centerY },
      glow: selected,
      interactive,
      draggable: interactive,
      target: { kind: 'hand', card },
    }));
  });
}

export function dragItem(state, ui, out) {
  if (!ui.drag) return;
  const card = state.players[0]?.hand.find(c => c.id === ui.drag.id);
  if (!card) return;
  out.cards.push(cardItem(card, {
    x: ui.drag.x, y: ui.drag.y, z: 30, scale: 1.06, glow: true, target: { kind: 'drag', card },
  }));
}

// An opponent's card shown small in their fan; face down unless dev peek is on.
export function miniItem(state, g, ui, idx, card, i, fields) {
  const nextId = ui.dev?.showNextPick ? state.aiPreviewPicks?.[idx] : null;
  return cardItem(card, {
    z: 0.5 + i * 0.01,
    scale: MINI_SCALE,
    faceUp: !!ui.dev?.showHands,
    glow: card.id === nextId,
    spawn: { x: 0, y: g.centerY },
    ...fields,
  });
}

function fanSpacing(n, g, maxW) {
  return n > 1 ? Math.max(0, Math.min(g.miniW * 0.45, (maxW - g.miniW) / (n - 1))) : 0;
}

export function fanWidth(n, g, maxW) {
  return n > 0 ? (n - 1) * fanSpacing(n, g, maxW) + g.miniW : 0;
}

// Horizontal fan of an opponent's cards centered on (cx, cy), no wider than maxW.
export function horizontalFan(out, state, g, ui, idx, cx, cy, maxW) {
  const hand = state.players[idx]?.hand ?? [];
  const spacing = fanSpacing(hand.length, g, maxW);
  const left = cx - fanWidth(hand.length, g, maxW) / 2 + g.miniW / 2;
  hand.forEach((card, i) => out.cards.push(miniItem(state, g, ui, idx, card, i, { x: left + i * spacing, y: cy })));
}

export function seatLabel(state, idx, pos, g, rebellion) {
  const p = state.players[idx];
  const active = state.skirmish ? state.skirmish.participants.includes(idx) : true;
  const lane = state.rebelOrder.indexOf(idx);
  let tag = null;
  if (rebellion) tag = state.kingIdx === idx ? 'King' : lane >= 0 ? `L${lane + 1}` : null;
  else if (!active) tag = 'Out';
  // The trick being shown hasn't been "absorbed" yet, so its point isn't counted until Continue.
  const pending = !rebellion && state.revealedTrick?.winner === idx ? 1 : 0;
  return {
    id: `seat-${idx}`,
    kind: 'seat',
    idx,
    x: pos.x,
    y: pos.y,
    w: g.label.w,
    h: g.label.h,
    compact: g.label.compact,
    name: idx === 0 ? 'You' : ELEMENTS[p.element].name,
    element: p.element,
    value: rebellion ? state.scores[idx] : state.trickWins[idx] - pending,
    caption: rebellion ? 'pts' : 'tricks',
    points: rebellion ? undefined : state.scores[idx],
    tag,
    active,
  };
}

export function tallyLabels(state, g) {
  const w = g.label.compact ? 92 : 112;
  const gap = 6;
  const common = { kind: 'tally', y: g.tallyY, w, h: g.tallyH - 4, compact: g.label.compact };
  return [
    { ...common, id: 'tally-king', side: 'king', x: -(w / 2 + gap), name: 'King', value: state.duelWins.king },
    { ...common, id: 'tally-rebels', side: 'rebels', x: w / 2 + gap, name: 'Rebels', value: state.duelWins.rebellion },
  ];
}

// Field shapes are plain triangles with a darkness per corner (0 = full color,
// 1 = background), so regions glow toward the middle of the action.
export const SHADE_NEAR = 0.4;
export const SHADE_FAR = 0.66;

export function shadedRect(x0, y0, x1, y1, hex, nearY) {
  const s = y => (Math.abs(y - nearY) < 1 ? SHADE_NEAR : SHADE_FAR);
  // Two counter-clockwise triangles (y0 < y1) so they face the camera.
  return [
    { pts: [[x0, y0], [x1, y0], [x1, y1]], hex, shades: [s(y0), s(y0), s(y1)] },
    { pts: [[x0, y0], [x1, y1], [x0, y1]], hex, shades: [s(y0), s(y1), s(y1)] },
  ];
}
