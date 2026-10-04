import { useEffect, useState } from 'react';
import { getStatus } from '@core/turnInfo';
import Table from '../scene/Table';
import StatusBanner from '../hud/StatusBanner';
import ActionBar from '../hud/ActionBar';
import PhaseIntro from '../hud/PhaseIntro';
import RulesModal from '../hud/RulesModal';
import LogModal from '../hud/LogModal';
import WhyModal from '../hud/WhyModal';
import DevPanel from '../hud/DevPanel';
import { getPrimaryAction } from '../lib/primaryAction';
import { getHandState, nearestLane } from '../lib/cardLayout';
import { hasWebGL } from '../lib/webgl';

export default function GameScreen({ state, dispatch, dev, setDev, intro, onDismissIntro, modal, setModal }) {
  const [kingSelection, setKingSelection] = useState(null);
  const ui = { kingSelection };
  const primary = getPrimaryAction(state);
  const blocked = intro !== null || modal !== null;
  const closeModal = () => setModal(null);

  useEffect(() => { setKingSelection(null); }, [state.rebellionStage, state.duelNumber]);

  // Free-for-all and rebel picks preview the card in your slot; null puts it back.
  function select(card) {
    const { mode } = getHandState(state, ui);
    if (mode === 'ffa') dispatch({ type: 'SELECT_FFA_CARD', card });
    else if (mode === 'rebel') dispatch({ type: 'SELECT_REBEL_CARD', card });
  }

  function placeCard(card, lane) {
    const next = state.selectedKingCards.map(c => (c?.id === card.id ? null : c));
    next[lane] = card;
    dispatch({ type: 'SET_SELECTED_KING_CARDS', cards: next });
    setKingSelection(null);
  }

  function unplace(lane) {
    const next = [...state.selectedKingCards];
    next[lane] = null;
    dispatch({ type: 'SET_SELECTED_KING_CARDS', cards: next });
  }

  function onTap(item) {
    if (blocked) return;
    const kind = item.target?.kind;
    const { mode } = getHandState(state, ui);
    if (kind === 'hand') {
      if (mode === 'king') setKingSelection(k => (k?.id === item.card.id ? null : item.card));
      else select(item.card);
    } else if (kind === 'preview') {
      select(null);
    } else if (kind === 'placed') {
      if (kingSelection) placeCard(kingSelection, item.target.lane);
      else unplace(item.target.lane);
    }
  }

  function onDrop(item, point, g) {
    if (blocked) return;
    const onField = point.y > g.handTop;
    const kind = item.target?.kind;
    const { mode } = getHandState(state, ui);
    if (mode === 'king') {
      if (onField) placeCard(item.card, nearestLane(point.x, g));
      else if (kind === 'placed') unplace(item.target.lane);
      return;
    }
    if (onField) select(item.card);
    else if (kind === 'preview') select(null);
  }

  function onSlotSelect(slot) {
    if (blocked) return;
    if (slot.target?.kind === 'lane' && kingSelection) placeCard(kingSelection, slot.target.lane);
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
        const card = hs.hand[cur < 0 ? (step > 0 ? 0 : n - 1) : (cur + step + n) % n];
        if (hs.mode === 'king') setKingSelection(card);
        else select(card);
      } else if (hs.mode === 'king' && ['1', '2', '3'].includes(e.key)) {
        if (kingSelection) placeCard(kingSelection, Number(e.key) - 1);
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
          <button type="button" className="btn btn-small" aria-label="Rules" onClick={() => setModal('rules')}>
            <span className="wide-only">Rules</span><span className="narrow-only" aria-hidden="true">?</span>
          </button>
          <button type="button" className="btn btn-small" aria-label="Log" onClick={() => setModal('log')}>
            <span className="wide-only">Log</span><span className="narrow-only" aria-hidden="true">☰</span>
          </button>
        </StatusBanner>
        {hasWebGL() ? (
          <Table state={state} ui={ui} dev={dev} onTap={onTap} onDrop={onDrop} onSlotSelect={onSlotSelect} />
        ) : (
          <div className="table table-fallback" data-region="table">
            <p>Your browser doesn't support WebGL, which this game needs to draw the cards. Try a recent Chrome, Firefox, Safari or Edge.</p>
          </div>
        )}
        <ActionBar state={state} primary={primary} onPress={runPrimary} onWhy={() => setModal('why')} />
      </div>
      {dev.enabled && <DevPanel dev={dev} setDev={setDev} state={state} dispatch={dispatch} />}
      {intro && <PhaseIntro key={`${intro.kind}-${intro.title}`} intro={intro} onClose={onDismissIntro} />}
      {!intro && modal === 'rules' && <RulesModal onClose={closeModal} />}
      {!intro && modal === 'log' && <LogModal state={state} onClose={closeModal} />}
      {!intro && modal === 'why' && <WhyModal state={state} onClose={closeModal} />}
    </div>
  );
}
