import { useEffect, useReducer, useRef, useState } from 'react';
import { gameReducer, initialState } from '@core/reducer';
import { aiPlayFFASimultaneous, aiKingPlay } from '@core/ai';
import { getPhaseIntro } from '@core/turnInfo';
import { TIMING } from './timing';
import { useDevMode } from './lib/useDevMode';
import ElementSelectScreen from './screens/ElementSelectScreen';
import UpgradeScreen from './screens/UpgradeScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [introQueue, setIntroQueue] = useState([]);
  const [modal, setModal] = useState(null);
  const [dev, setDev] = useDevMode();
  const prevState = useRef(state);
  const intro = introQueue[0] ?? null;
  const paused = intro !== null || modal !== null;

  useEffect(() => {
    const next = getPhaseIntro(prevState.current, state);
    prevState.current = state;
    if (next) setIntroQueue(q => [...q, next]);
  }, [state]);

  useEffect(() => {
    if (state.phase !== 'freeforall') return;
    if (state.committedFFAPick || state.revealedTrick || state.animating) return;
    const activeIndices = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
    if (activeIndices.some(i => !state.players[i] || state.players[i].hand.length === 0)) return;
    const picks = {};
    for (let i = 1; i < 4; i++) {
      if (!activeIndices.includes(i)) continue;
      picks[i] = aiPlayFFASimultaneous(state.players[i].hand, state.players[i].element).id;
    }
    dispatch({ type: 'SET_AI_PREVIEW_PICKS', picks });
  }, [
    state.phase, state.trickNumber, state.players,
    state.committedFFAPick, state.revealedTrick, state.animating,
    state.skirmish,
  ]);

  useEffect(() => {
    if (!state.pendingAckReveal) return;
    const t = setTimeout(() => dispatch({ type: 'ACK_FFA_REVEAL' }), TIMING.FFA_REVEAL);
    return () => clearTimeout(t);
  }, [state.pendingAckReveal]);

  // Skirmish the human sits out: play and continue automatically so they just watch.
  useEffect(() => {
    if (paused || state.phase !== 'freeforall' || !state.skirmish) return;
    if (state.skirmish.participants.includes(0)) return;
    if (state.waitingForContinue) {
      const t = setTimeout(() => dispatch({ type: 'CONTINUE' }), TIMING.SPECTATE_CONTINUE);
      return () => clearTimeout(t);
    }
    if (state.revealedTrick || state.committedFFAPick || state.animating) return;
    const t = setTimeout(() => dispatch({ type: 'COMMIT_FFA_TURN' }), TIMING.SPECTATE_PLAY);
    return () => clearTimeout(t);
  }, [
    paused, state.phase, state.skirmish, state.waitingForContinue,
    state.revealedTrick, state.committedFFAPick, state.animating, state.trickNumber,
  ]);

  useEffect(() => {
    if (paused) return;
    if (state.phase !== 'rebellion' || state.rebellionStage !== 'king-choosing') return;
    if (state.kingIdx === null || state.kingIdx === 0 || state.animating) return;
    if (state.kingLanes[0] !== null) return;
    const kingPlayer = state.players[state.kingIdx];
    if (!kingPlayer || kingPlayer.hand.length < 3) return;
    const t = setTimeout(() => {
      dispatch({ type: 'COMMIT_KING_CARDS', cards: aiKingPlay(kingPlayer.hand, kingPlayer.element) });
    }, TIMING.AI_KING_THINK);
    return () => clearTimeout(t);
  }, [
    paused, state.phase, state.rebellionStage, state.kingIdx,
    state.players, state.animating, state.duelNumber, state.kingLanes,
  ]);

  useEffect(() => {
    if (!state.pendingAiRebels) return;
    const t = setTimeout(() => dispatch({ type: 'AI_REBELS_RESPOND' }), TIMING.AI_REBELS_RESPOND);
    return () => clearTimeout(t);
  }, [state.pendingAiRebels]);

  useEffect(() => {
    if (!state.pendingDuelResolve) return;
    const t = setTimeout(() => dispatch({ type: 'RESOLVE_DUEL' }), TIMING.DUEL_RESOLVE);
    return () => clearTimeout(t);
  }, [state.pendingDuelResolve]);

  useEffect(() => {
    if (!state.nextTransition) return;
    const { type, delay, ...payload } = state.nextTransition;
    const t = setTimeout(() => dispatch({ type, ...payload }), delay ?? 0);
    return () => clearTimeout(t);
  }, [state.nextTransition]);

  if (state.phase === 'element-select') {
    return <ElementSelectScreen xp={state.xp} onSelect={element => dispatch({ type: 'SELECT_ELEMENT', element })} />;
  }
  if (state.phase === 'upgrades') {
    return (
      <UpgradeScreen
        element={state.chosenElement}
        xp={state.xp[state.chosenElement] || 0}
        onBegin={() => dispatch({ type: 'START_GAME' })}
        onBack={() => dispatch({ type: 'BACK_TO_SELECT' })}
      />
    );
  }
  if (state.phase === 'gameover') {
    return (
      <GameOverScreen
        state={state}
        onRestart={() => {
          setIntroQueue([]);
          setModal(null);
          dispatch({ type: 'RESTART' });
        }}
      />
    );
  }
  return (
    <GameScreen
      state={state}
      dispatch={dispatch}
      dev={dev}
      setDev={setDev}
      intro={intro}
      onDismissIntro={() => setIntroQueue(q => q.slice(1))}
      modal={modal}
      setModal={setModal}
    />
  );
}
