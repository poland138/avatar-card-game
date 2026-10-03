// On RN, we can't use Tailwind class strings. Each element carries the hex
// colors directly so styles can pull from here. Icons live in elementIcons.js.
export const ELEMENTS = {
  water: {
    name: 'Water',
    flavor: 'Adaptive defender. Strong counter-attacks.',
    bg: '#2563eb', text: '#93c5fd', border: '#60a5fa',
  },
  fire: {
    name: 'Fire',
    flavor: 'Aggressive attacker. Burns hot and fast.',
    bg: '#dc2626', text: '#fca5a5', border: '#f87171',
  },
  earth: {
    name: 'Earth',
    flavor: 'Stalwart defender. Patient and unyielding.',
    bg: '#15803d', text: '#86efac', border: '#4ade80',
  },
  air: {
    name: 'Air',
    flavor: 'Evasive trickster. Disrupts and outmaneuvers.',
    bg: '#eab308', text: '#fef08a', border: '#fde047',
  },
};

export const SUITS = ['water', 'fire', 'earth', 'air'];
export const RANK_NAMES = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const TARGET_SCORE = 21;
export const REBELLION_DUELS = 7;
export const XP_PER_RUN = 10;
export const ZERO_XP = { water: 0, fire: 0, earth: 0, air: 0 };

export const UPGRADE_STUBS = [
  { id: 'starter',  name: 'Apprentice',         desc: 'Default starting kit.',                                          cost: 0,    unlocked: true  },
  { id: 'sharper',  name: 'Sharper Strikes',    desc: '+1 rank to all element cards (placeholder).',                    cost: 100,  unlocked: false },
  { id: 'reserve',  name: 'Hidden Reserve',     desc: 'Draw 1 extra card per round (placeholder).',                     cost: 250,  unlocked: false },
  { id: 'mastery',  name: 'Elemental Mastery',  desc: 'Element trumps win ties (placeholder).',                         cost: 500,  unlocked: false },
  { id: 'avatar',   name: 'Avatar State',       desc: 'Once per run, treat any card as your element (placeholder).',    cost: 1000, unlocked: false },
];

// Shared palette for non-element-specific UI surfaces.
export const COLORS = {
  bgDark: '#0f172a',     // slate-900
  bgPanel: '#1e293b',    // slate-800
  bgPanelDim: '#0f172a99',
  border: '#475569',     // slate-600
  borderDim: '#334155',  // slate-700
  textPrimary: '#f8fafc',
  textMuted: '#cbd5e1',  // slate-300
  textDim: '#94a3b8',    // slate-400
  accent: '#facc15',     // yellow-400
  accentText: '#fde047', // yellow-300
  win: '#fbbf24',        // yellow-400/300 area
  loss: '#f87171',       // red-400
  draw: '#c084fc',       // purple-400
};