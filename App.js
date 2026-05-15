import React, { useReducer, useEffect, useState } from 'react';
import { View, StatusBar } from 'react-native';

import { gameReducer, initialState } from './reducer';
import { ZERO_XP } from './constants';
import { aiPlayFFASimultaneous, aiKingPlay } from './ai';
import ElementSelectView from './ElementSelectView';
import UpgradeView from './UpgradeView';
import FreeForAllView from './FreeForAllView';
import RebellionView from './RebellionView';

let xpCache = null;

const TIMING = {
  FFA_REVEAL: 0,
  AI_KING_THINK: 300,
  AI_REBELS_RESPOND: 0,
  DUEL_RESOLVE: 0,
};

const DEFAULT_TRANSITION_DELAY = {
  DEAL_REBELLION: 0,
  DEAL_FFA: 0,
  GAME_OVER: 0,
};

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [hasLoadedXp, setHasLoadedXp] = useState(false);

  useEffect(() => {
    if (xpCache) {
      const merged = { ...ZERO_XP, ...xpCache };
      dispatch({ type: 'SET_XP', xp: merged });
    }
    setHasLoadedXp(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedXp) return;
    xpCache = state.xp;
  }, [state.xp, hasLoadedXp]);

  useEffect(() => {
    if (state.phase !== 'freeforall') return;
    if (state.committedFFAPick || state.revealedTrick || state.animating) return;
    const activeIndices = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
    if (activeIndices.some(i => !state.players[i] || state.players[i].hand.length === 0)) return;
    const picks = {};
    for (let i = 1; i < 4; i++) {
      if (!activeIndices.includes(i)) continue;
      if (state.players[i] && state.players[i].hand.length > 0) {
        const card = aiPlayFFASimultaneous(state.players[i].hand, state.players[i].element);
        picks[i] = card.id;
      }
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

  useEffect(() => {
    if (state.phase !== 'rebellion') return;
    if (state.rebellionStage !== 'king-choosing') return;
    if (state.kingIdx === null || state.kingIdx === 0) return;
    if (state.animating) return;
    if (state.kingLanes[0] !== null) return;
    const kingPlayer = state.players[state.kingIdx];
    if (!kingPlayer || kingPlayer.hand.length < 3) return;
    const t = setTimeout(() => {
      const cards = aiKingPlay(kingPlayer.hand, kingPlayer.element);
      dispatch({ type: 'COMMIT_KING_CARDS', cards });
    }, TIMING.AI_KING_THINK);
    return () => clearTimeout(t);
  }, [
    state.phase, state.rebellionStage, state.kingIdx,
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
    const ms = delay ?? DEFAULT_TRANSITION_DELAY[type] ?? 0;
    const t = setTimeout(() => dispatch({ type, ...payload }), ms);
    return () => clearTimeout(t);
  }, [state.nextTransition]);

  let screen;
  if (state.phase === 'element-select') {
    screen = (
      <ElementSelectView onSelect={element => dispatch({ type: 'SELECT_ELEMENT', element })} />
    );
  } else if (state.phase === 'upgrades') {
    screen = (
      <UpgradeView
        element={state.chosenElement}
        currentXp={state.xp[state.chosenElement] || 0}
        onContinue={() => dispatch({ type: 'START_GAME' })}
        onBack={() => dispatch({ type: 'BACK_TO_SELECT' })}
      />
    );
  } else if (state.phase === 'freeforall' || (state.phase === 'score' && state.kingIdx === null)) {
    screen = (
      <FreeForAllView
        players={state.players}
        trickWins={state.trickWins}
        scores={state.scores}
        message={state.message}
        humanFFAPick={state.humanFFAPick}
        committedFFAPick={state.committedFFAPick}
        revealedTrick={state.revealedTrick}
        trickNumber={state.trickNumber}
        animating={state.animating}
        discardPile={state.discardPile}
        aiPreviewPicks={state.aiPreviewPicks}
        waitingForContinue={state.waitingForContinue}
        skirmish={state.skirmish}
        onSelectCard={card => dispatch({ type: 'SELECT_FFA_CARD', card })}
        onEndTurn={() => dispatch({ type: 'COMMIT_FFA_TURN' })}
        onContinue={() => dispatch({ type: 'CONTINUE' })}
        onSkipToFFAEnd={wins => dispatch({ type: 'SKIP_TO_FFA_END', wins })}
      />
    );
  } else {
    screen = (
      <RebellionView
        players={state.players}
        kingIdx={state.kingIdx}
        rebelOrder={state.rebelOrder}
        kingLanes={state.kingLanes}
        rebelResponses={state.rebelResponses}
        laneOutcomes={state.laneOutcomes}
        duelWins={state.duelWins}
        duelNumber={state.duelNumber}
        scores={state.scores}
        message={state.message}
        animating={state.animating}
        selectedKingCards={state.selectedKingCards}
        setSelectedKingCards={cards => dispatch({ type: 'SET_SELECTED_KING_CARDS', cards })}
        onCommitKingCards={cards => dispatch({ type: 'COMMIT_KING_CARDS', cards })}
        humanRebelSelection={state.humanRebelSelection}
        onSelectRebelCard={card => dispatch({ type: 'SELECT_REBEL_CARD', card })}
        onEndRebelTurn={() => dispatch({ type: 'COMMIT_REBEL_TURN' })}
        rebellionStage={state.rebellionStage}
        phase={state.phase}
        onRestart={() => dispatch({ type: 'RESTART' })}
        discardPile={state.discardPile}
        waitingForContinue={state.waitingForContinue}
        onContinue={() => dispatch({ type: 'CONTINUE' })}
        onSkipToGameOver={() => dispatch({ type: 'SKIP_TO_GAMEOVER' })}
        onReturnToFFA={() => dispatch({ type: 'RETURN_TO_FFA' })}
      />
    );
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
        hidden={false}
      />
      {screen}
    </>
  );
}
