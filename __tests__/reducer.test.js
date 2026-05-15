import { gameReducer, initialState } from '../reducer';

describe('gameReducer — basic flow', () => {
  test('initial phase is element-select', () => {
    expect(initialState.phase).toBe('element-select');
    expect(initialState.chosenElement).toBeNull();
  });

  test('SELECT_ELEMENT transitions to upgrades', () => {
    const next = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'water' });
    expect(next.phase).toBe('upgrades');
    expect(next.chosenElement).toBe('water');
  });

  test('BACK_TO_SELECT clears chosenElement', () => {
    const picked = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'fire' });
    const back = gameReducer(picked, { type: 'BACK_TO_SELECT' });
    expect(back.phase).toBe('element-select');
    expect(back.chosenElement).toBeNull();
  });

  test('START_GAME deals 13 cards to each of 4 players and enters freeforall', () => {
    const picked = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'earth' });
    const started = gameReducer(picked, { type: 'START_GAME' });
    expect(started.phase).toBe('freeforall');
    expect(started.players).toHaveLength(4);
    for (const p of started.players) {
      expect(p.hand).toHaveLength(13);
    }
    expect(started.players[0].element).toBe('earth');
    expect(started.players[0].isHuman).toBe(true);
  });

  test('RESTART preserves XP but resets game state', () => {
    const withXp = { ...initialState, xp: { water: 50, fire: 0, earth: 0, air: 0 } };
    const restarted = gameReducer(withXp, { type: 'RESTART' });
    expect(restarted.xp.water).toBe(50);
    expect(restarted.phase).toBe('element-select');
    expect(restarted.scores).toEqual([0, 0, 0, 0]);
  });

  test('unknown action returns state unchanged', () => {
    const next = gameReducer(initialState, { type: '__NOPE__' });
    expect(next).toBe(initialState);
  });

  test('SELECT_FFA_CARD sets humanFFAPick', () => {
    const card = { suit: 'water', rank: 7, id: 'water-7' };
    const next = gameReducer(initialState, { type: 'SELECT_FFA_CARD', card });
    expect(next.humanFFAPick).toBe(card);
  });
});
