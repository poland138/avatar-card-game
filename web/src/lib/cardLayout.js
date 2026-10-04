// Pure layout for the three.js table. Orthographic camera with zoom 1, so
// world units are CSS pixels and (0, 0) is the canvas center, +y up.
//
// The table is laid out like a real card table: you at the bottom, opponents'
// face-down cards along the top edge and (rotated) down the left/right edges,
// with their point labels beside them. The play area sits in the middle.
//
// Vertical budget: top strip (tally + mini cards) + play area (rebellion lanes
// are the tallest at 2.36·cardH) + hand (cardH + extra row + lift). That's
// ≈ 4.08·cardH (+0.5 for a second hand row) plus ~26px of margins; the
// 4.15 / 4.65 factors leave room for rounding.

import { ELEMENTS } from '@core/constants';

export const MINI_SCALE = 0.5;
export const BADGE_SIZE = { w: 0.9, h: 0.26 };
const CARD_CAP = 120;
const TALLY_H = 30;

export function labelSize(width) {
  return width < 600 ? { w: 52, h: 34, compact: true } : { w: 112, h: 44, compact: false };
}

export function isRebellionLayout(state) {
  return (state.phase === 'rebellion' || state.phase === 'score') && state.rebelOrder.length === 3;
}

function cardSize(width, height, rows, tallyH, label) {
  const factor = rows === 2 ? 4.65 : 4.15;
  // The top strip is as tall as the larger of the mini cards and the label.
  const byHeight = Math.min(
    (height - 30 - tallyH) / (1.4 * factor),
    (height - 30 - tallyH - label.h) / (1.4 * (factor - MINI_SCALE)),
  );
  // Lanes span 1.9·cardW each side of center; the side columns need the rest.
  const byLabel = (width / 2 - label.w - 14) / 1.9;
  const byMini = (width / 2 - 14) / (1.9 + 1.4 * MINI_SCALE);
  const cardW = Math.floor(Math.max(24, Math.min(CARD_CAP, byHeight, byLabel, byMini)));
  return { cardW, cardH: Math.round(cardW * 1.4) };
}

export function tableGeometry(width, height, { handCount = 0, tally = false } = {}) {
  const label = labelSize(width);
  const tallyH = tally ? TALLY_H : 0;
  // Decide hand rows once from the one-row size; never re-evaluate (avoids flip-flopping).
  const single = cardSize(width, height, 1, tallyH, label);
  const singleSpacing = handCount > 1 ? (width - 16 - single.cardW) / (handCount - 1) : Infinity;
  const rows = handCount > 13 && singleSpacing < 0.45 * single.cardW ? 2 : 1;
  const { cardW, cardH } = rows === 1 ? single : cardSize(width, height, 2, tallyH, label);
  const lift = Math.round(cardH * 0.22);
  const miniW = cardW * MINI_SCALE;
  const miniH = cardH * MINI_SCALE;
  const top = height / 2 - 6;
  const stripH = Math.max(miniH, label.h);
  const playTop = top - tallyH - stripH - 6;
  const handY = -height / 2 + 8 + cardH / 2;
  const handTop = -height / 2 + 8 + cardH + (rows - 1) * 0.5 * cardH + lift;
  const colW = Math.max(miniH, label.w);
  const westX = -width / 2 + 6 + colW / 2;
  return {
    width, height, cardW, cardH, rows, lift, miniW, miniH, label, tallyH,
    tallyY: top - tallyH / 2,
    northY: top - tallyH - stripH / 2,
    playTop,
    handY,
    handYBack: handY + 0.5 * cardH,
    handTop,
    centerY: (playTop + handTop) / 2,
    colW,
    westX,
    eastX: -westX,
  };
}

export function geometryFor(state, width, height) {
  return tableGeometry(width, height, {
    handCount: state.players[0]?.hand.length ?? 0,
    tally: isRebellionLayout(state),
  });
}

// Which edge each player sits on. In the rebellion an AI King takes the top;
// rebels line up with their lanes (lane 1 left, lane 3 right).
export function seatMap(state) {
  if (isRebellionLayout(state)) {
    const [a, b, c] = state.rebelOrder;
    if (state.kingIdx === 0) return { 0: 'south', [a]: 'west', [b]: 'north', [c]: 'east' };
    return { 0: 'south', [state.kingIdx]: 'north', [a]: 'west', [c]: 'east' };
  }
  return { 0: 'south', 1: 'west', 2: 'north', 3: 'east' };
}

export function seatPosition(seat, g) {
  const dy = g.cardH * 0.62;
  const dx = g.cardW * 1.3;
  if (seat === 'south') return { x: 0, y: g.centerY - dy };
  if (seat === 'west') return { x: -dx, y: g.centerY };
  if (seat === 'north') return { x: 0, y: g.centerY + dy };
  return { x: dx, y: g.centerY };
}

export function laneX(laneIdx, g) {
  return (laneIdx - 1) * g.cardW * 1.4;
}

// An AI King attacks from the top row; when you're King your row is the one nearest you.
export function laneRows(state, g) {
  const up = g.centerY + g.cardH * 0.68;
  const down = g.centerY - g.cardH * 0.68;
  return state.kingIdx === 0 ? { kingY: down, rebelY: up } : { kingY: up, rebelY: down };
}

export function nearestLane(x, g) {
  let best = 0;
  for (let l = 1; l < 3; l++) if (Math.abs(x - laneX(l, g)) < Math.abs(x - laneX(best, g))) best = l;
  return best;
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

// Fan of an opponent's cards: horizontal along the top, rotated 90° on the sides.
function pushOpponentFan(out, state, g, idx, seat, ui) {
  const hand = state.players[idx]?.hand ?? [];
  const n = hand.length;
  const faceUp = !!ui.dev?.showHands;
  const nextId = ui.dev?.showNextPick ? state.aiPreviewPicks?.[idx] : null;
  const common = (card, i) => cardItem(card, {
    z: 0.5 + i * 0.01,
    scale: MINI_SCALE,
    faceUp,
    glow: card.id === nextId,
    spawn: { x: 0, y: g.centerY },
  });

  if (seat === 'north') {
    const maxW = Math.max(g.miniW, g.width - 2 * g.colW - g.label.w - 48);
    const spacing = n > 1 ? Math.min(g.miniW * 0.45, (maxW - g.miniW) / (n - 1)) : 0;
    const fanW = n > 0 ? (n - 1) * spacing + g.miniW : 0;
    const groupW = fanW + 8 + g.label.w;
    const fanCenter = -groupW / 2 + fanW / 2;
    hand.forEach((card, i) => out.cards.push({
      ...common(card, i), x: fanCenter + (i - (n - 1) / 2) * spacing, y: g.northY,
    }));
    return { x: -groupW / 2 + fanW + 8 + g.label.w / 2, y: g.northY };
  }

  const x = seat === 'west' ? g.westX : g.eastX;
  const labelY = g.playTop - g.label.h / 2;
  const fanTop = g.playTop - g.label.h - 6;
  // The west column also holds your own label at its foot.
  const fanBottom = seat === 'west' ? g.handTop + 4 + g.label.h + 6 : g.handTop + 4;
  const avail = Math.max(0, fanTop - fanBottom);
  const spacing = n > 1 ? Math.max(0, Math.min(g.miniW * 0.45, (avail - g.miniW) / (n - 1))) : 0;
  // Top-aligned so the cards hang right under their owner's label.
  hand.forEach((card, i) => out.cards.push({
    ...common(card, i),
    x,
    y: fanTop - g.miniW / 2 - i * spacing,
    rotZ: seat === 'west' ? -Math.PI / 2 : Math.PI / 2,
  }));
  return { x, y: labelY };
}

function seatLabel(state, idx, pos, g, rebellion) {
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
    sub: rebellion ? null : `${state.scores[idx]} pts`,
    tag,
    active,
  };
}

function tallyLabels(state, g) {
  const w = g.label.compact ? 92 : 112;
  const gap = 6;
  const common = { kind: 'tally', y: g.tallyY, w, h: g.tallyH - 4, compact: g.label.compact };
  return [
    { ...common, id: 'tally-king', side: 'king', x: -(w / 2 + gap), name: 'King', value: state.duelWins.king },
    { ...common, id: 'tally-rebels', side: 'rebels', x: w / 2 + gap, name: 'Rebels', value: state.duelWins.rebellion },
  ];
}

function handItems(state, g, ui, out, previewId) {
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
  return { interactive, mode };
}

function dragItem(state, ui, out) {
  if (!ui.drag) return;
  const card = state.players[0]?.hand.find(c => c.id === ui.drag.id);
  if (!card) return;
  out.cards.push(cardItem(card, {
    x: ui.drag.x, y: ui.drag.y, z: 30, scale: 1.06, glow: true, target: { kind: 'drag', card },
  }));
}

function layoutFFA(state, g, ui, out, labelFor) {
  const active = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
  const seats = seatMap(state);
  const { selectedId, interactive } = getHandState(state, ui);
  const previewId = selectedId && selectedId !== ui.drag?.id ? selectedId : null;

  for (const idx of active) {
    out.slots.push({
      id: `slot-${idx}`,
      ...seatPosition(seats[idx], g),
      label: idx === 0 ? 'You' : state.players[idx].name,
      suit: state.players[idx].element,
      target: null,
    });
  }
  if (previewId) {
    out.cards.push(cardItem(state.humanFFAPick, {
      ...seatPosition('south', g),
      glow: true,
      interactive,
      draggable: interactive,
      target: { kind: 'preview', card: state.humanFFAPick },
    }));
  }
  if (state.revealedTrick) {
    const { plays, winner } = state.revealedTrick;
    for (const p of plays) {
      const item = cardItem(p.card, {
        ...seatPosition(seats[p.playerIdx], g),
        startFaceDown: p.playerIdx !== 0,
        dim: p.playerIdx !== winner,
        glow: p.playerIdx === winner,
      });
      out.cards.push(item);
      out.resolved.push({ item, pile: labelFor[winner] });
    }
  }
  handItems(state, g, ui, out, previewId);
}

const BADGE = {
  king: { text: 'KING', color: '#fbbf24' },
  rebel: { text: 'REBEL', color: '#60a5fa' },
  draw: { text: 'DRAW', color: '#c084fc' },
};

function layoutRebellion(state, g, ui, out, tally) {
  const kingIdx = state.kingIdx;
  const humanKingChoosing = kingIdx === 0 && state.rebellionStage === 'king-choosing' && !state.waitingForContinue;
  const { kingY, rebelY } = laneRows(state, g);
  const { selectedId, interactive, mode } = getHandState(state, ui);
  const previewId = mode === 'rebel' && selectedId && selectedId !== ui.drag?.id ? selectedId : null;
  const humanLane = state.rebelOrder.indexOf(0);
  const pileFor = outcome => (outcome === 'king' ? tally[0] : outcome === 'rebel' ? tally[1] : null);

  state.rebelOrder.forEach((rebelIdx, lane) => {
    const x = laneX(lane, g);
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
    if (kingCard && kingCard.id !== ui.drag?.id) {
      const item = cardItem(kingCard, {
        x, y: kingY,
        dim: outcome === 'rebel',
        glow: outcome === 'king',
        interactive: humanKingChoosing,
        draggable: humanKingChoosing,
        target: humanKingChoosing ? { kind: 'placed', lane, card: kingCard } : null,
      });
      out.cards.push(item);
      if (outcome) out.resolved.push({ item, pile: pileFor(outcome) ?? { x, y: kingY } });
    }
    const resp = state.rebelResponses[lane];
    if (resp) {
      const item = cardItem(resp.card, {
        x, y: rebelY,
        startFaceDown: resp.playerIdx !== 0,
        dim: outcome === 'king',
        glow: outcome === 'rebel',
      });
      out.cards.push(item);
      if (outcome) out.resolved.push({ item, pile: pileFor(outcome) ?? { x, y: rebelY } });
    } else if (lane === humanLane && previewId) {
      out.cards.push(cardItem(state.humanRebelSelection, {
        x, y: rebelY,
        glow: true,
        interactive,
        draggable: interactive,
        target: { kind: 'preview', card: state.humanRebelSelection },
      }));
    }
    if (outcome) out.badges.push({ id: `badge-${lane}`, x, y: g.centerY, ...BADGE[outcome] });
  });
  handItems(state, g, ui, out, previewId);
}

export function layoutTable(state, g, ui = {}) {
  const out = { cards: [], slots: [], badges: [], labels: [], resolved: [] };
  if (!state.players?.length) return out;
  const rebellion = isRebellionLayout(state);
  const seats = seatMap(state);

  const labelPos = {};
  for (const [idxStr, seat] of Object.entries(seats)) {
    const idx = Number(idxStr);
    if (idx === 0) continue;
    labelPos[idx] = pushOpponentFan(out, state, g, idx, seat, ui);
  }
  labelPos[0] = { x: g.westX, y: g.handTop + 4 + g.label.h / 2 };
  for (const idx of [0, 1, 2, 3]) {
    if (labelPos[idx]) out.labels.push(seatLabel(state, idx, labelPos[idx], g, rebellion));
  }

  const labelFor = Object.fromEntries(out.labels.map(l => [l.idx, l]));
  if (state.phase === 'freeforall') layoutFFA(state, g, ui, out, labelFor);
  else if (rebellion) {
    const tally = tallyLabels(state, g);
    out.labels.push(...tally);
    layoutRebellion(state, g, ui, out, tally);
  } else {
    handItems(state, g, ui, out, null);
  }
  dragItem(state, ui, out);
  return out;
}
