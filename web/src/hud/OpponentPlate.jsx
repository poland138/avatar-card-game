import { ELEMENTS } from '@core/constants';
import { rankLabel } from '@core/deck';
import ElementGlyph from './ElementGlyph';
import { elementVars } from '../lib/elementVars';

export default function OpponentPlate({ state, idx, dev }) {
  const p = state.players[idx];
  if (!p) return null;
  const active = state.skirmish ? state.skirmish.participants.includes(idx) : true;
  const lane = state.rebelOrder.indexOf(idx);
  // Phones show "L2" so the name keeps its room; wide screens show "Lane 2".
  let tag = null;
  if (state.phase === 'rebellion') {
    if (state.kingIdx === idx) tag = 'King';
    else if (lane >= 0) tag = <><span className="tag-short">L</span><span className="tag-long">Lane </span>{lane + 1}</>;
  } else if (!active) tag = 'Out';
  const ffa = state.phase === 'freeforall';
  const tricks = state.trickWins[idx];
  const cards = p.hand.length;
  const pts = state.scores[idx];
  const peek = dev.enabled && dev.showHands;
  const nextId = dev.enabled && dev.showNextPick ? state.aiPreviewPicks?.[idx] : null;
  const classes = ['plate', !active && 'sitting-out', state.revealedTrick?.winner === idx && 'winner']
    .filter(Boolean).join(' ');

  return (
    <section className={classes} data-region={`plate-${idx}`} data-seat={idx} style={elementVars(p.element)}>
      <div className="head">
        <ElementGlyph suit={p.element} size={16} />
        <span className="name">{p.name}</span>
        <span className="short-name">{ELEMENTS[p.element].name}</span>
        {tag && <span className="tag">{tag}</span>}
      </div>
      <div className="stats">
        <span className="stats-short">{ffa ? `${tricks}t · ` : ''}{cards}c · {pts} pts</span>
        <span className="stats-long">{ffa ? `${tricks} tricks · ` : ''}{cards} cards · {pts} pts</span>
      </div>
      {peek && (
        <div className="peek">
          {p.hand.map(c => (
            <span key={c.id} className={`mini-card${c.id === nextId ? ' next' : ''}`} style={elementVars(c.suit)}>
              {rankLabel(c.rank)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
