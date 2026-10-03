// 24×24 SVG paths so the HUD (<svg>) and card textures (Path2D) draw the same icons.
export const GLYPHS = {
  water: { mode: 'fill', d: 'M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2Z' },
  fire: { mode: 'fill', d: 'M12 2c1 4 6 6.5 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2 1 3.5 2.5 3.5C11.5 8 10 5.5 12 2Z' },
  earth: { mode: 'fill', d: 'M2 20 9 7l4 7 3-4 6 10Z' },
  air: { mode: 'stroke', d: 'M3 8h10a3 3 0 1 0-3-3M3 13h14a3 3 0 1 1-3 3M3 18h7' },
};
