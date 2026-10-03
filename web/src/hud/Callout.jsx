import { explainDuel, explainTrick } from '@core/turnInfo';

function duelHeadline(n, lanes) {
  const kw = lanes.filter(l => l.result === 'king').length;
  const rw = lanes.filter(l => l.result === 'rebel').length;
  if (kw > rw) return `The King takes duel ${n} (${kw}–${rw}).`;
  if (rw > kw) return `The rebels take duel ${n} (${rw}–${kw}).`;
  return `Duel ${n} is a draw (${kw}–${rw}).`;
}

export function LaneList({ state }) {
  return (
    <ul className="lanes">
      {explainDuel(state).map(l => (
        <li key={l.laneIdx} className={`lane-${l.result}`}>Lane {l.laneIdx + 1} ({l.rebelName}): {l.text}</li>
      ))}
    </ul>
  );
}

export default function Callout({ state, onWhy }) {
  let content = null;
  if (state.phase === 'freeforall' && state.revealedTrick) {
    content = <p className="headline">{explainTrick(state.revealedTrick, state.players)}</p>;
  } else if (state.phase === 'rebellion' && state.laneOutcomes.some(Boolean)) {
    content = (
      <>
        <p className="headline">{duelHeadline(state.duelNumber, explainDuel(state))}</p>
        <button type="button" className="btn btn-small why" onClick={onWhy}>Why?</button>
        <LaneList state={state} />
      </>
    );
  }
  return (
    <section className={`callout${content ? '' : ' empty'}`} data-region="callout" data-testid="callout" aria-live="polite">
      {content ?? <p>Results appear here after each {state.phase === 'rebellion' ? 'duel' : 'trick'}.</p>}
    </section>
  );
}
