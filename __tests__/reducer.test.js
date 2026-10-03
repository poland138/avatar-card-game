import { gameReducer, initialState } from '../core/reducer';

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

function started() {
  const s = gameReducer(initialState, { type: 'SELECT_ELEMENT', element: 'water' });
  return gameReducer(s, { type: 'START_GAME' });
}

function revealed() {
  let s = started();
  s = gameReducer(s, { type: 'SELECT_FFA_CARD', card: s.players[0].hand[0] });
  return gameReducer(s, { type: 'COMMIT_FFA_TURN' });
}

describe('gameReducer — trick reason and double-commit guard', () => {
  test('COMMIT_FFA_TURN records why the trick was won', () => {
    const s = revealed();
    expect(s.revealedTrick.plays).toHaveLength(4);
    expect(typeof s.revealedTrick.winner).toBe('number');
    expect(['only-trump', 'highest-trump', 'highest-rank', 'tie-defender', 'tie-first-trump', 'tie-random'])
      .toContain(s.revealedTrick.reason);
  });

  test('a second COMMIT_FFA_TURN is ignored while the trick is shown', () => {
    const s = revealed();
    expect(gameReducer(s, { type: 'COMMIT_FFA_TURN' })).toBe(s);
    const acked = gameReducer(s, { type: 'ACK_FFA_REVEAL' });
    expect(gameReducer(acked, { type: 'COMMIT_FFA_TURN' })).toBe(acked);
  });
});

describe('gameReducer — lastRebellion', () => {
  function endOfRebellion(newDuelWins) {
    const s = gameReducer(started(), { type: 'DEAL_REBELLION', kingIdx: 1 });
    return { ...s, waitingForContinue: true, pendingResolution: { type: 'POST_DUEL', newDuelWins } };
  }

  test('starts empty', () => {
    expect(initialState.lastRebellion).toBeNull();
  });

  test('a held crown records points and XP', () => {
    const s = gameReducer(endOfRebellion({ king: 4, rebellion: 1 }), { type: 'CONTINUE' });
    expect(s.lastRebellion).toEqual({ kingIdx: 1, held: true, duels: { king: 4, rebellion: 1 }, points: 4, xp: 5 });
  });

  test('an overthrow records the duel score', () => {
    const s = gameReducer(endOfRebellion({ king: 2, rebellion: 4 }), { type: 'CONTINUE' });
    expect(s.lastRebellion).toEqual({ kingIdx: 1, held: false, duels: { king: 2, rebellion: 4 }, points: 0, xp: 0 });
  });

  test('the next deal clears it', () => {
    const held = gameReducer(endOfRebellion({ king: 4, rebellion: 1 }), { type: 'CONTINUE' });
    expect(gameReducer(held, { type: 'DEAL_REBELLION', kingIdx: 1 }).lastRebellion).toBeNull();
    const over = gameReducer(endOfRebellion({ king: 2, rebellion: 4 }), { type: 'CONTINUE' });
    expect(gameReducer(over, { type: 'DEAL_FFA' }).lastRebellion).toBeNull();
    expect(gameReducer(over, { type: 'RETURN_TO_FFA' }).lastRebellion).toBeNull();
    expect(gameReducer(over, { type: 'SKIP_TO_GAMEOVER' }).lastRebellion).toBeNull();
    expect(gameReducer(over, { type: 'START_GAME' }).lastRebellion).toBeNull();
    expect(gameReducer(over, { type: 'SKIP_TO_FFA_END', wins: [4, 3, 3, 3] }).lastRebellion).toBeNull();
  });
});
