const WAITING = { label: 'Waiting…', enabled: false, action: null, hint: '' };
const CONTINUE = { label: 'Continue', enabled: true, action: { type: 'CONTINUE' }, hint: '' };

export function getPrimaryAction(state) {
  if (state.phase === 'freeforall') {
    if (state.waitingForContinue) return CONTINUE;
    const picking = !state.committedFFAPick && !state.revealedTrick && !state.animating;
    if (!picking) return { label: 'Play', enabled: false, action: null, hint: '' };
    const active = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
    if (!active.includes(0)) {
      return { label: 'Play', enabled: true, action: { type: 'COMMIT_FFA_TURN' }, hint: 'Sitting out: tricks play automatically.' };
    }
    return state.humanFFAPick
      ? { label: 'Play', enabled: true, action: { type: 'COMMIT_FFA_TURN' }, hint: '' }
      : { label: 'Play', enabled: false, action: null, hint: 'Pick a card first.' };
  }

  if (state.phase === 'rebellion') {
    if (state.waitingForContinue) return CONTINUE;
    if (state.kingIdx === 0 && state.rebellionStage === 'king-choosing') {
      const placed = state.selectedKingCards.filter(Boolean).length;
      return placed === 3
        ? { label: 'Attack', enabled: true, action: { type: 'COMMIT_KING_CARDS', cards: state.selectedKingCards }, hint: '' }
        : { label: 'Attack', enabled: false, action: null, hint: `Place a card in every lane (${placed}/3).` };
    }
    const lane = state.rebelOrder.indexOf(0);
    if (lane >= 0 && state.rebellionStage === 'rebels-responding' && !state.rebelResponses[lane]) {
      return state.humanRebelSelection
        ? { label: 'Defend', enabled: true, action: { type: 'COMMIT_REBEL_TURN' }, hint: '' }
        : { label: 'Defend', enabled: false, action: null, hint: 'Pick a card to defend with.' };
    }
  }
  return WAITING;
}
