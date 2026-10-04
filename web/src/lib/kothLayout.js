// King-of-the-Hill table: the King's band (in the King's element color) and
// three lane columns (each in its rebel's color) separated by a VS seam.
//
//   AI King:   tally / King strip (label + face-down fan) / King's row / VS / rebels' row / rebel panels / your hand
//   You King:  tally / rebel panels / rebels' row / VS / your attack row / your label / your hand
//
// In wide columns each rebel's label and fan sit beside their lane card
// instead of in their own strip, which leaves room for bigger cards.

import { ELEMENTS } from '@core/constants';
import {
  BADGE, CARD_CAP, MINI_SCALE, TALLY_H, cardItem, fanWidth, getHandState, handItems, handRows,
  horizontalFan, labelSize, seatLabel, shadedRect, tallyLabels,
} from './tableParts';

const GAP_MIN = 28;
const VS = { w: 34, h: 20 };

function fit(width, height, cardW, rows, humanKing, label) {
  const colWidth = width / 3;
  const cardH = Math.round(cardW * 1.4);
  const miniH = cardH * MINI_SCALE;
  const sideBySide = !label.compact && colWidth >= cardW + 32 + 2 * label.w;
  let kingStrip = Math.max(label.h, miniH);
  if (humanKing) kingStrip = sideBySide ? 0 : label.h;
  const rebelStrip = sideBySide ? 0 : label.h + 4 + miniH;
  const gap = Math.max(GAP_MIN, 0.3 * cardH);
  const lift = Math.round(cardH * 0.22);
  const hand = cardH + (rows - 1) * 0.5 * cardH + lift;
  const block = (kingStrip ? kingStrip + 6 : 0) + cardH + gap + cardH + (rebelStrip ? 6 + rebelStrip : 0);
  const total = 6 + TALLY_H + 6 + block + 6 + hand + 8;
  return {
    ok: total <= height && cardW <= colWidth - 16,
    cardW, cardH, miniH, sideBySide, kingStrip, rebelStrip, gap, lift, block, colWidth,
  };
}

function largestFit(width, height, rows, humanKing, label) {
  for (let w = CARD_CAP; w > 24; w--) {
    const f = fit(width, height, w, rows, humanKing, label);
    if (f.ok) return f;
  }
  return fit(width, height, 24, rows, humanKing, label);
}

export function kothGeometry(width, height, { handCount = 0, humanKing = false } = {}) {
  const label = labelSize(width);
  const single = largestFit(width, height, 1, humanKing, label);
  const rows = handRows(handCount, width, single.cardW);
  const f = rows === 1 ? single : largestFit(width, height, 2, humanKing, label);
  const { cardW, cardH, miniH, kingStrip, rebelStrip, gap, lift, block, colWidth, sideBySide } = f;

  const top = height / 2 - 6;
  const fieldTop = top - TALLY_H - 3;
  const handY = -height / 2 + 8 + cardH / 2;
  const handTop = -height / 2 + 8 + cardH + (rows - 1) * 0.5 * cardH + lift;
  const fieldBottom = handTop + 4;

  // Stack the rows top-down, centered in the field.
  let y = fieldTop - Math.max(3, (fieldTop - fieldBottom - block) / 2);
  const at = {};
  const take = (name, h, after = 0) => {
    at[name] = y - h / 2;
    y -= h + after;
  };
  if (humanKing) {
    if (rebelStrip) take('rebelStrip', rebelStrip, 6);
    take('rebelRow', cardH);
    take('gap', gap);
    take('kingRow', cardH);
    if (kingStrip) { y -= 6; take('kingStrip', kingStrip); }
  } else {
    if (kingStrip) take('kingStrip', kingStrip, 6);
    take('kingRow', cardH);
    take('gap', gap);
    take('rebelRow', cardH);
    if (rebelStrip) { y -= 6; take('rebelStrip', rebelStrip); }
  }

  return {
    mode: 'koth',
    width, height, cardW, cardH, rows, lift, label, colWidth, sideBySide,
    miniW: cardW * MINI_SCALE,
    miniH,
    kingStrip,
    rebelStrip,
    gap,
    tallyH: TALLY_H,
    tallyY: top - TALLY_H / 2,
    fieldTop,
    fieldBottom,
    kingStripY: at.kingStrip ?? null,
    rebelStripY: at.rebelStrip ?? null,
    kingY: at.kingRow,
    rebelY: at.rebelRow,
    centerY: at.gap,
    handY,
    handYBack: handY + 0.5 * cardH,
    handTop,
  };
}

export function laneX(laneIdx, g) {
  return (laneIdx - 1) * g.colWidth;
}

export function laneRows(state, g) {
  return { kingY: g.kingY, rebelY: g.rebelY };
}

export function nearestLane(x, g) {
  return Math.max(0, Math.min(2, Math.round(x / g.colWidth) + 1));
}

function kothField(state, g) {
  const left = -g.width / 2;
  const right = g.width / 2;
  const split = g.centerY;
  const humanKing = state.kingIdx === 0;
  const band = humanKing ? [g.fieldBottom, split] : [split, g.fieldTop];
  const cols = humanKing ? [split, g.fieldTop] : [g.fieldBottom, split];
  const tris = [...shadedRect(left, band[0], right, band[1], ELEMENTS[state.players[state.kingIdx].element].bg, split)];
  state.rebelOrder.forEach((rebelIdx, lane) => {
    const x0 = left + lane * g.colWidth;
    tris.push(...shadedRect(x0, cols[0], x0 + g.colWidth, cols[1], ELEMENTS[state.players[rebelIdx].element].bg, split));
  });
  const lines = [
    [left, split, right, split],
    [left, g.fieldTop, right, g.fieldTop],
    [left, g.fieldBottom, right, g.fieldBottom],
    [left + g.colWidth, cols[0], left + g.colWidth, cols[1]],
    [left + 2 * g.colWidth, cols[0], left + 2 * g.colWidth, cols[1]],
  ];
  return { tris, lines };
}

// Label (and face-down fan for AI players) for each participant.
function panels(state, g, ui, out) {
  const kingIdx = state.kingIdx;
  const besideLeft = (x, y) => ({ x: x - g.cardW / 2 - 10 - g.label.w / 2, y });

  if (kingIdx === 0) {
    const pos = g.sideBySide ? besideLeft(laneX(1, g), g.kingY) : { x: 0, y: g.kingStripY };
    out.labels.push(seatLabel(state, 0, pos, g, true));
  } else {
    const n = state.players[kingIdx].hand.length;
    const maxW = g.width - g.label.w - 40;
    const fanW = fanWidth(n, g, maxW);
    const groupW = fanW + (fanW ? 8 : 0) + g.label.w;
    horizontalFan(out, state, g, ui, kingIdx, -groupW / 2 + fanW / 2, g.kingStripY, maxW);
    out.backdrops.push({ id: `panel-${kingIdx}`, x: 0, y: g.kingStripY, w: groupW + 12, h: g.kingStrip + 8 });
    out.labels.push(seatLabel(state, kingIdx, { x: groupW / 2 - g.label.w / 2, y: g.kingStripY }, g, true));
  }

  state.rebelOrder.forEach((rebelIdx, lane) => {
    const x = laneX(lane, g);
    let pos;
    if (g.sideBySide) {
      pos = besideLeft(x, g.rebelY);
      if (rebelIdx !== 0) {
        const side = g.colWidth / 2 - g.cardW / 2 - 16;
        const fanW = fanWidth(state.players[rebelIdx].hand.length, g, side);
        horizontalFan(out, state, g, ui, rebelIdx, x + g.cardW / 2 + 10 + fanW / 2, g.rebelY, side);
      }
    } else {
      pos = { x, y: g.rebelStripY + g.rebelStrip / 2 - g.label.h / 2 };
      if (rebelIdx !== 0) {
        const fanY = g.rebelStripY - g.rebelStrip / 2 + g.miniH / 2;
        horizontalFan(out, state, g, ui, rebelIdx, x, fanY, g.colWidth - 12);
        out.backdrops.push({ id: `panel-${rebelIdx}`, x, y: g.rebelStripY, w: g.colWidth - 10, h: g.rebelStrip + 8 });
      }
    }
    out.labels.push(seatLabel(state, rebelIdx, pos, g, true));
  });
}

export function layoutKoth(state, g, ui, out) {
  const kingIdx = state.kingIdx;
  const humanKingChoosing = kingIdx === 0 && state.rebellionStage === 'king-choosing' && !state.waitingForContinue;
  const { selectedId, interactive, mode } = getHandState(state, ui);
  const previewId = mode === 'rebel' && selectedId && selectedId !== ui.drag?.id ? selectedId : null;
  const humanLane = state.rebelOrder.indexOf(0);

  const tally = tallyLabels(state, g);
  out.labels.push(...tally);
  out.field = kothField(state, g);
  panels(state, g, ui, out);

  const pileFor = outcome => (outcome === 'king' ? tally[0] : outcome === 'rebel' ? tally[1] : null);

  state.rebelOrder.forEach((rebelIdx, lane) => {
    const x = laneX(lane, g);
    let kingLabel = '?';
    if (humanKingChoosing) kingLabel = ui.kingSelection ? 'Place here' : `Lane ${lane + 1}`;
    out.slots.push({
      id: `lane-king-${lane}`, x, y: g.kingY, label: kingLabel, fill: true,
      suit: state.players[kingIdx].element,
      target: humanKingChoosing ? { kind: 'lane', lane } : null,
    });
    out.slots.push({
      id: `lane-rebel-${lane}`, x, y: g.rebelY, label: rebelIdx === 0 ? 'Your lane' : '?', fill: true,
      suit: state.players[rebelIdx].element,
      target: null,
    });

    const outcome = state.laneOutcomes[lane];
    const kingCard = humanKingChoosing ? state.selectedKingCards[lane] : state.kingLanes[lane];
    if (kingCard && kingCard.id !== ui.drag?.id) {
      const item = cardItem(kingCard, {
        x, y: g.kingY,
        dim: outcome === 'rebel',
        glow: outcome === 'king',
        interactive: humanKingChoosing,
        draggable: humanKingChoosing,
        target: humanKingChoosing ? { kind: 'placed', lane, card: kingCard } : null,
      });
      out.cards.push(item);
      if (outcome) out.resolved.push({ item, pile: pileFor(outcome) ?? { x, y: g.kingY } });
    }
    const resp = state.rebelResponses[lane];
    if (resp) {
      const item = cardItem(resp.card, {
        x, y: g.rebelY,
        startFaceDown: resp.playerIdx !== 0,
        dim: outcome === 'king',
        glow: outcome === 'rebel',
      });
      out.cards.push(item);
      if (outcome) out.resolved.push({ item, pile: pileFor(outcome) ?? { x, y: g.rebelY } });
    } else if (lane === humanLane && previewId) {
      out.cards.push(cardItem(state.humanRebelSelection, {
        x, y: g.rebelY,
        glow: true,
        interactive,
        draggable: interactive,
        target: { kind: 'preview', card: state.humanRebelSelection },
      }));
    }
    if (outcome) out.badges.push({ id: `badge-${lane}`, x, y: g.centerY, ...BADGE[outcome] });
    else out.labels.push({ id: `vs-${lane}`, kind: 'vs', x, y: g.centerY, ...VS });
  });

  handItems(state, g, ui, out, previewId);
}
