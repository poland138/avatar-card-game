import { useEffect, useState } from 'react';
import { getStatus } from '@core/turnInfo';
import Table from '../scene/Table';
import StatusBanner from '../hud/StatusBanner';
import OpponentPlate from '../hud/OpponentPlate';
import Scoreboard from '../hud/Scoreboard';
import Callout, { LaneList } from '../hud/Callout';
import PrimaryButton from '../hud/PrimaryButton';
import PhaseIntro from '../hud/PhaseIntro';
import Modal from '../hud/Modal';
import RulesModal from '../hud/RulesModal';
import LogModal from '../hud/LogModal';
import DevPanel from '../hud/DevPanel';
import { getPrimaryAction } from '../lib/primaryAction';
import { getHandState } from '../lib/cardLayout';
import { hasWebGL } from '../lib/webgl';

export default function GameScreen({ state, dispatch, dev, setDev, intro, onDismissIntro, modal, setModal }) {
  const [kingSelection, setKingSelection] = useState(null);
  const ui = { kingSelection };
  const primary = getPrimaryAction(state);
  const blocked = intro !== null || modal !== null;
  const closeModal = () => setModal(null);

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
        <StatusBanner status={getStatus(state)}>
          <button type="button" className="btn btn-small" onClick={() => setModal('rules')}>Rules</button>
          <button type="button" className="btn btn-small" onClick={() => setModal('log')}>Log</button>
        </StatusBanner>
        <div className="side-left">
          <Scoreboard state={state} />
          <OpponentPlate state={state} idx={1} dev={dev} />
        </div>
        <OpponentPlate state={state} idx={2} dev={dev} />
        <div className="side-right">
          <OpponentPlate state={state} idx={3} dev={dev} />
        </div>
        {hasWebGL() ? (
          <Table state={state} ui={ui} onCardSelect={onCardSelect} onSlotSelect={onSlotSelect} />
        ) : (
          <div className="table table-fallback" data-region="table">
            <p>Your browser doesn't support WebGL, which this game needs to draw the cards. Try a recent Chrome, Firefox, Safari or Edge.</p>
          </div>
        )}
        <Callout state={state} onWhy={() => setModal('why')} />
        <PrimaryButton primary={primary} onPress={runPrimary} />
      </div>
      {dev.enabled && <DevPanel dev={dev} setDev={setDev} state={state} dispatch={dispatch} />}
      {intro && <PhaseIntro key={`${intro.kind}-${intro.title}`} intro={intro} onClose={onDismissIntro} />}
      {!intro && modal === 'rules' && <RulesModal onClose={closeModal} />}
      {!intro && modal === 'log' && <LogModal state={state} onClose={closeModal} />}
      {!intro && modal === 'why' && state.laneOutcomes.some(Boolean) && (
        <Modal title={`Duel ${state.duelNumber}`} onClose={closeModal}>
          <LaneList state={state} />
        </Modal>
      )}
    </div>
  );
}
