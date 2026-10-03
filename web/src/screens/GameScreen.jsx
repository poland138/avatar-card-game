import { useEffect, useState } from 'react';
import { getStatus } from '@core/turnInfo';
import Table from '../scene/Table';
import StatusBanner from '../hud/StatusBanner';
import PrimaryButton from '../hud/PrimaryButton';
import PhaseIntro from '../hud/PhaseIntro';
import { getPrimaryAction } from '../lib/primaryAction';
import { getHandState } from '../lib/cardLayout';
import { hasWebGL } from '../lib/webgl';

export default function GameScreen({ state, dispatch, intro, onDismissIntro, modal }) {
  const [kingSelection, setKingSelection] = useState(null);
  const ui = { kingSelection };
  const primary = getPrimaryAction(state);
  const blocked = intro !== null || modal !== null;

  useEffect(() => { setKingSelection(null); }, [state.rebellionStage, state.duelNumber]);

  function chooseCard(card, toggle) {
    const { mode } = getHandState(state, ui);
    if (mode === 'ffa') dispatch({ type: 'SELECT_FFA_CARD', card });
    else if (mode === 'rebel') dispatch({ type: 'SELECT_REBEL_CARD', card });
    else if (mode === 'king') setKingSelection(k => (toggle && k?.id === card.id ? null : card));
  }

  function placeKingCard(lane) {
    if (!kingSelection) return;
    const next = state.selectedKingCards.map(c => (c?.id === kingSelection.id ? null : c));
    next[lane] = kingSelection;
    dispatch({ type: 'SET_SELECTED_KING_CARDS', cards: next });
    setKingSelection(null);
  }

  function onCardSelect(item) {
    if (blocked) return;
    if (item.target?.kind === 'hand') chooseCard(item.target.card, true);
    else if (item.target?.kind === 'placed') {
      if (kingSelection) placeKingCard(item.target.lane);
      else {
        const next = [...state.selectedKingCards];
        next[item.target.lane] = null;
        dispatch({ type: 'SET_SELECTED_KING_CARDS', cards: next });
      }
    }
  }

  function onSlotSelect(slot) {
    if (blocked) return;
    if (slot.target?.kind === 'lane') placeKingCard(slot.target.lane);
  }

  function runPrimary() {
    if (blocked || !primary.enabled) return;
    dispatch(primary.action);
  }

  useEffect(() => {
    function onKey(e) {
      if (blocked) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('input, select, textarea')) return;
      // A focused button already handles Enter/Space natively; arrows and 1-3 still work.
      const onButton = !!target?.closest('button');
      const hs = getHandState(state, ui);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!hs.interactive || hs.hand.length === 0) return;
        e.preventDefault();
        const n = hs.hand.length;
        const cur = hs.hand.findIndex(c => c.id === hs.selectedId);
        const step = e.key === 'ArrowRight' ? 1 : -1;
        const nextIdx = cur < 0 ? (step > 0 ? 0 : n - 1) : (cur + step + n) % n;
        chooseCard(hs.hand[nextIdx], false);
      } else if (hs.mode === 'king' && ['1', '2', '3'].includes(e.key)) {
        placeKingCard(Number(e.key) - 1);
      } else if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
        e.preventDefault();
        runPrimary();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="app-shell">
      <div className="game">
        <StatusBanner status={getStatus(state)} />
        {hasWebGL() ? (
          <Table state={state} ui={ui} onCardSelect={onCardSelect} onSlotSelect={onSlotSelect} />
        ) : (
          <div className="table table-fallback" data-region="table">
            <p>Your browser doesn't support WebGL, which this game needs to draw the cards. Try a recent Chrome, Firefox, Safari or Edge.</p>
          </div>
        )}
        <PrimaryButton primary={primary} onPress={runPrimary} />
      </div>
      {intro && <PhaseIntro key={`${intro.kind}-${intro.title}`} intro={intro} onClose={onDismissIntro} />}
    </div>
  );
}
