import { laneDetails, playerLabel, trickSummary } from '@core/turnInfo';
import Modal from './Modal';
import CardFace from './CardFace';

function TrickWhy({ state }) {
  const trick = state.revealedTrick;
  const s = trickSummary(trick, state.players);
  return (
    <>
      <div className="why-trick">
        {trick.plays.map(p => {
          const won = p.playerIdx === trick.winner;
          return (
            <div key={p.playerIdx} className={`why-seat${won ? ' won' : ''}`}>
              <CardFace card={p.card} star={state.players[p.playerIdx].element === p.card.suit} crown={won} />
              <span className="why-name">{playerLabel(state.players, p.playerIdx)}</span>
            </div>
          );
        })}
      </div>
      <p className="why-verdict"><b>{s.text}</b><span className="chip">{s.reason}</span></p>
      <p className="why-legend">★ own element (trump) · 👑 winner</p>
    </>
  );
}

function DuelWhy({ state }) {
  const kingName = playerLabel(state.players, state.kingIdx);
  return (
    <>
      <div className="why-lanes">
        {laneDetails(state).map(l => (
          <div key={l.laneIdx} className={`why-lane ${l.result}`}>
            <span className="why-lane-n">Lane {l.laneIdx + 1}</span>
            <span className="why-cards">
              <CardFace card={l.kingCard} star={l.kingStar} crown={l.result === 'king'} />
              <span className="why-vs">vs</span>
              <CardFace card={l.rebelCard} star={l.rebelStar} crown={l.result === 'rebel'} />
            </span>
            <span className="why-result">
              <b>{l.result === 'king' ? `👑 ${kingName}` : l.result === 'rebel' ? `🛡 ${l.rebelName}` : '= Draw'}</b>
              <span className="chip">{l.reasonText}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="why-legend">Left card: King ({kingName}) · Right card: rebel · ★ own element</p>
    </>
  );
}

export default function WhyModal({ state, onClose }) {
  if (state.phase === 'freeforall' && state.revealedTrick) {
    return <Modal title="Why?" onClose={onClose}><TrickWhy state={state} /></Modal>;
  }
  if (state.phase === 'rebellion' && state.laneOutcomes.some(Boolean)) {
    return <Modal title={`Duel ${state.duelNumber}`} onClose={onClose}><DuelWhy state={state} /></Modal>;
  }
  return null;
}
