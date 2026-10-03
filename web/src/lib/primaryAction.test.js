import { describe, expect, test } from 'vitest';
import { gameReducer, initialState } from '@core/reducer';
import { getPrimaryAction } from './primaryAction';

function ffaState() {
  const s = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'water' });
  return gameReducer(s, { type: 'START_GAME' });
}

describe('getPrimaryAction — free-for-all', () => {
  test('disabled until a card is picked', () => {
    expect(getPrimaryAction(ffaState())).toEqual({ label: 'Play', enabled: false, action: null, hint: 'Pick a card first.' });
  });

  test('Play commits the turn once a card is picked', () => {
    let s = ffaState();
    s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Play', enabled: true, action: { type: 'COMMIT_FFA_TURN' } });
  });

  test('Continue after the reveal', () => {
    let s = ffaState();
    s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
    s = gameReducer(s, { type: 'COMMIT_FFA_TURN' });
    s = gameReducer(s, { type: 'ACK_FFA_REVEAL' });
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Continue', enabled: true, action: { type: 'CONTINUE' } });
  });

  test('sitting out a skirmish still allows playing the trick manually', () => {
    const s = { ...ffaState(), skirmish: { participants: [1, 2], savedScores: [0, 0, 0, 0], totalTricks: 5, recursionLevel: 0 } };
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Play', enabled: true, hint: 'Sitting out: tricks play automatically.' });
  });
});

describe('getPrimaryAction — rebellion', () => {
  test('human king needs all three lanes filled', () => {
    let s = gameReducer(ffaState(), { type: 'DEAL_REBELLION', kingIdx: 0 });
    const [a, b, c] = s.players[0].hand;
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, b, null] });
    expect(getPrimaryAction(s)).toEqual({ label: 'Attack', enabled: false, action: null, hint: 'Place a card in every lane (2/3).' });
    s = gameReducer(s, { type: 'SET_SELECTED_KING_CARDS', cards: [a, b, c] });
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Attack', enabled: true, action: { type: 'COMMIT_KING_CARDS', cards: [a, b, c] } });
  });

  test('human rebel defends once a card is picked', () => {
    let s = gameReducer(ffaState(), { type: 'DEAL_REBELLION', kingIdx: 2 });
    s = gameReducer(s, { type: 'COMMIT_KING_CARDS', cards: s.players[2].hand.slice(0, 3) });
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Defend', enabled: false, hint: 'Pick a card to defend with.' });
    s = gameReducer(s, { type: 'SELECT_REBEL_CARD', card: s.players[0].hand[0] });
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Defend', enabled: true, action: { type: 'COMMIT_REBEL_TURN' } });
  });

  test('waiting while the AI king chooses', () => {
    const s = gameReducer(ffaState(), { type: 'DEAL_REBELLION', kingIdx: 1 });
    expect(getPrimaryAction(s)).toMatchObject({ label: 'Waiting…', enabled: false });
  });
});
