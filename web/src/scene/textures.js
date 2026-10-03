import * as THREE from 'three';
import { ELEMENTS, SUITS } from '@core/constants';
import { rankLabel } from '@core/deck';
import { GLYPHS } from '../lib/glyphs';

const W = 256;
const H = 358;
const R = 22;
const HALO_PAD = 32;
export const HALO_SCALE = { x: (W + HALO_PAD * 2) / W, y: (H + HALO_PAD * 2) / H };

// Textures are shared across all cards and live for the page's lifetime
// (at most ~52 faces + a few labels), so they are cached and never disposed.
const cache = new Map();

function cached(key, draw) {
  if (!cache.has(key)) cache.set(key, draw());
  return cache.get(key);
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function drawGlyph(ctx, suit, cx, cy, size, color) {
  const g = GLYPHS[suit];
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  const path = new Path2D(g.d);
  if (g.mode === 'stroke') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  } else {
    ctx.fillStyle = color;
    ctx.fill(path);
  }
  ctx.restore();
}

function cardFrame(ctx, outer, inner) {
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, R);
  ctx.fillStyle = outer;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(10, 10, W - 20, H - 20, R - 8);
  ctx.fillStyle = inner;
  ctx.fill();
}

export function faceTexture(card) {
  return cached(`face-${card.suit}-${card.rank}`, () => {
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const el = ELEMENTS[card.suit];
    cardFrame(ctx, el.bg, '#0f172a');
    const label = String(rankLabel(card.rank));
    ctx.fillStyle = el.text;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(label, 24, 22);
    drawGlyph(ctx, card.suit, 46, 118, 44, el.border);
    drawGlyph(ctx, card.suit, W / 2, H / 2 + 36, 112, el.border);
    return toTexture(c);
  });
}

export function backTexture() {
  return cached('back', () => {
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    cardFrame(ctx, '#475569', '#1e293b');
    SUITS.forEach((s, i) => {
      const x = W / 2 + (i % 2 ? 44 : -44);
      const y = H / 2 + (i < 2 ? -44 : 44);
      drawGlyph(ctx, s, x, y, 56, ELEMENTS[s].border);
    });
    return toTexture(c);
  });
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineH));
}

export function slotTexture(label, color) {
  return cached(`slot-${label}-${color}`, () => {
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.globalAlpha = 0.7;
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 6;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.roundRect(6, 6, W - 12, H - 12, R);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.font = '600 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    wrapText(ctx, label, W / 2, H / 2, W - 40, 40);
    return toTexture(c);
  });
}

export function badgeTexture(text, color) {
  return cached(`badge-${text}-${color}`, () => {
    const c = canvas(256, 104);
    const ctx = c.getContext('2d');
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 96, 48);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 56);
    return toTexture(c);
  });
}

// Soft blurred card-shaped halo, used for both drop shadows and the winner glow.
export function haloTexture(color, blur) {
  return cached(`halo-${color}-${blur}`, () => {
    const c = canvas(W + HALO_PAD * 2, H + HALO_PAD * 2);
    const ctx = c.getContext('2d');
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(HALO_PAD, HALO_PAD, W, H, R);
    ctx.fill();
    return toTexture(c);
  });
}
