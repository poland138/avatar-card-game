// Free-for-all table: four element-colored territories meeting in the middle.
// You sit at the bottom; opponents' face-down fans run along the top and
// (rotated) down the left/right edges with their point labels.
//
// Vertical budget: top strip (mini cards or label) + play area (the cross of
// played cards, budgeted at 2.36·cardH) + hand (cardH + extra row + lift)
// ≈ 4.08·cardH (+0.5 for a second hand row) plus ~26px of margins; the
// 4.15 / 4.65 factors leave room for rounding.

import { ELEMENTS } from '@core/constants';
import {
  CARD_CAP, MINI_SCALE, SHADE_FAR, SHADE_NEAR, cardItem, fanWidth, getHandState, handItems, handRows,
  horizontalFan, labelSize, miniItem, seatLabel,
} from './tableParts';

export const FFA_SEATS = { 0: 'south', 1: 'west', 2: 'north', 3: 'east' };

function cardSize(width, height, rows, label) {
  const factor = rows === 2 ? 4.65 : 4.15;
  // The top strip is as tall as the larger of the mini cards and the label.
  const byHeight = Math.min(
    (height - 30) / (1.4 * factor),
    (height - 30 - label.h) / (1.4 * (factor - MINI_SCALE)),
  );
  // Played cards span 1.9·cardW each side of center; the side columns need the rest.
  const byLabel = (width / 2 - label.w - 14) / 1.9;
  const byMini = (width / 2 - 14) / (1.9 + 1.4 * MINI_SCALE);
  const cardW = Math.floor(Math.max(24, Math.min(CARD_CAP, byHeight, byLabel, byMini)));
  return { cardW, cardH: Math.round(cardW * 1.4) };
}

export function tableGeometry(width, height, { handCount = 0 } = {}) {
  const label = labelSize(width);
  const single = cardSize(width, height, 1, label);
  const rows = handRows(handCount, width, single.cardW);
  const { cardW, cardH } = rows === 1 ? single : cardSize(width, height, 2, label);
  const lift = Math.round(cardH * 0.22);
  const miniW = cardW * MINI_SCALE;
  const miniH = cardH * MINI_SCALE;
  const top = height / 2 - 6;
  const stripH = Math.max(miniH, label.h);
  const playTop = top - stripH - 6;
  const handY = -height / 2 + 8 + cardH / 2;
  const handTop = -height / 2 + 8 + cardH + (rows - 1) * 0.5 * cardH + lift;
  const colW = Math.max(miniH, label.w);
  const westX = -width / 2 + 6 + colW / 2;
  const centerY = (playTop + handTop) / 2;
  // Slots spread toward their owners when there's room, like a real table.
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ffaDy = clamp((playTop - centerY) - cardH / 2 - 6, cardH * 0.62, cardH * 1.1);
  const ffaDx = clamp(width / 2 - colW - 16 - cardW / 2, cardW * 1.3, cardW * 2.2);
  return {
    mode: 'ffa',
    width, height, cardW, cardH, rows, lift, miniW, miniH, label,
    northY: top - stripH / 2,
    playTop,
    handY,
    handYBack: handY + 0.5 * cardH,
    handTop,
    centerY,
    ffaDx,
    ffaDy,
    colW,
    westX,
    eastX: -westX,
  };
}

export function seatPosition(seat, g) {
  if (seat === 'south') return { x: 0, y: g.centerY - g.ffaDy };
  if (seat === 'west') return { x: -g.ffaDx, y: g.centerY };
  if (seat === 'north') return { x: 0, y: g.centerY + g.ffaDy };
  return { x: g.ffaDx, y: g.centerY };
}

// Opponent fan: horizontal along the top, rotated 90° on the sides. Returns the label position.
function opponentFan(out, state, g, idx, seat, ui) {
  if (seat === 'north') {
    const n = state.players[idx]?.hand.length ?? 0;
    const maxW = Math.max(g.miniW, g.width - 2 * g.colW - g.label.w - 48);
    const fanW = fanWidth(n, g, maxW);
    const groupW = fanW + 8 + g.label.w;
    horizontalFan(out, state, g, ui, idx, -groupW / 2 + fanW / 2, g.northY, maxW);
    out.backdrops.push({ id: `panel-${idx}`, x: 0, y: g.northY, w: groupW + 12, h: Math.max(g.miniH, g.label.h) + 8 });
    return { x: -groupW / 2 + fanW + 8 + g.label.w / 2, y: g.northY };
  }

  const hand = state.players[idx]?.hand ?? [];
  const n = hand.length;
  const x = seat === 'west' ? g.westX : g.eastX;
  const fanTop = g.playTop - g.label.h - 6;
  // The west column also holds your own label at its foot.
  const fanBottom = seat === 'west' ? g.handTop + 4 + g.label.h + 6 : g.handTop + 4;
  const avail = Math.max(0, fanTop - fanBottom);
  const spacing = n > 1 ? Math.max(0, Math.min(g.miniW * 0.45, (avail - g.miniW) / (n - 1))) : 0;
  // Top-aligned so the cards hang right under their owner's label.
  hand.forEach((card, i) => out.cards.push(miniItem(state, g, ui, idx, card, i, {
    x,
    y: fanTop - g.miniW / 2 - i * spacing,
    rotZ: seat === 'west' ? -Math.PI / 2 : Math.PI / 2,
  })));
  const fanLow = n > 0 ? fanTop - g.miniW - (n - 1) * spacing : g.playTop - g.label.h;
  out.backdrops.push({
    id: `panel-${idx}`, x, y: (g.playTop + fanLow) / 2 + 1, w: g.colW + 8, h: g.playTop - fanLow + 6,
  });
  return { x, y: g.playTop - g.label.h / 2 };
}

function ffaField(state, g) {
  const left = -g.width / 2;
  const right = g.width / 2;
  const top = g.height / 2;
  const bottom = g.handTop + 2;
  const c = [0, g.centerY];
  const hexAt = seat => {
    const idx = Number(Object.keys(FFA_SEATS).find(k => FFA_SEATS[k] === seat));
    return ELEMENTS[state.players[idx].element].bg;
  };
  // Each triangle runs edge → center → edge (counter-clockwise, facing the camera).
  const tri = (a, b, seat) => ({ pts: [a, c, b], hex: hexAt(seat), shades: [SHADE_FAR, SHADE_NEAR, SHADE_FAR] });
  return {
    tris: [
      tri([left, top], [right, top], 'north'),
      tri([right, top], [right, bottom], 'east'),
      tri([right, bottom], [left, bottom], 'south'),
      tri([left, bottom], [left, top], 'west'),
    ],
    lines: [
      [left, top, ...c], [right, top, ...c], [right, bottom, ...c], [left, bottom, ...c],
      [left, bottom, right, bottom],
    ],
  };
}

export function layoutFFA(state, g, ui, out) {
  const labelPos = {};
  for (const idx of [1, 2, 3]) labelPos[idx] = opponentFan(out, state, g, idx, FFA_SEATS[idx], ui);
  labelPos[0] = { x: g.westX, y: g.handTop + 4 + g.label.h / 2 };
  const labelFor = {};
  for (const idx of [0, 1, 2, 3]) {
    labelFor[idx] = seatLabel(state, idx, labelPos[idx], g, false);
    out.labels.push(labelFor[idx]);
  }
  // Pause between the last trick and the rebellion: just the table and your hand.
  if (state.phase !== 'freeforall') {
    handItems(state, g, ui, out, null);
    return;
  }

  const active = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
  const { selectedId, interactive } = getHandState(state, ui);
  const previewId = selectedId && selectedId !== ui.drag?.id ? selectedId : null;

  out.field = ffaField(state, g);
  for (const idx of active) {
    out.slots.push({
      id: `slot-${idx}`,
      ...seatPosition(FFA_SEATS[idx], g),
      label: '',
      fill: true,
      suit: state.players[idx].element,
      target: null,
    });
  }
  // "Pick a card" pill in the middle while the center is empty, if it fits between the slots.
  const pill = { w: g.label.compact ? 96 : 132, h: 30 };
  const fits = g.ffaDy - g.cardH / 2 >= pill.h / 2 + 4 && g.ffaDx - g.cardW / 2 >= pill.w / 2 + 4;
  if (fits && !state.revealedTrick) {
    out.labels.push({
      id: 'center-pill', kind: 'pill', x: 0, y: g.centerY, w: pill.w, h: pill.h,
      text: interactive ? (previewId ? 'Ready!' : 'Pick a card') : 'Waiting…',
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
        ...seatPosition(FFA_SEATS[p.playerIdx], g),
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
