// Pure layout for the three.js table. Orthographic camera with zoom 1, so
// world units are CSS pixels and (0, 0) is the canvas center, +y up.
// The free-for-all and King-of-the-Hill tables live in their own modules;
// this file picks the right one for the current state.

import { isRebellionLayout, dragItem, handItems } from './tableParts';
import { layoutFFA, tableGeometry } from './ffaLayout';
import { kothGeometry, layoutKoth } from './kothLayout';

export {
  BADGE_SIZE, MINI_SCALE, getHandState, handPositions, isRebellionLayout, labelSize,
} from './tableParts';
export { FFA_SEATS, seatPosition, tableGeometry } from './ffaLayout';
export { kothGeometry, laneRows, laneX, nearestLane } from './kothLayout';

export function geometryFor(state, width, height) {
  const handCount = state.players[0]?.hand.length ?? 0;
  if (isRebellionLayout(state)) return kothGeometry(width, height, { handCount, humanKing: state.kingIdx === 0 });
  return tableGeometry(width, height, { handCount });
}

export function layoutTable(state, g, ui = {}) {
  const out = { cards: [], slots: [], badges: [], labels: [], resolved: [], backdrops: [], field: null };
  if (!state.players?.length) return out;
  if (g.mode === 'koth' && isRebellionLayout(state)) layoutKoth(state, g, ui, out);
  else if (g.mode === 'ffa') layoutFFA(state, g, ui, out);
  else handItems(state, g, ui, out, null);
  dragItem(state, ui, out);
  return out;
}
