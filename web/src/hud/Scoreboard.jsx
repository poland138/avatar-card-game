import { TARGET_SCORE } from '@core/constants';
import ElementGlyph from './ElementGlyph';

export default function Scoreboard({ state }) {
  const showKing = state.phase === 'rebellion' || state.phase === 'score';
  const ffa = state.phase === 'freeforall';
  return (
    <section className="scoreboard" data-region="scoreboard" aria-label="Score">
      <h2>Score · first to {TARGET_SCORE}</h2>
      <ol>
        {state.players.map((p, i) => (
          <li key={i} className={i === 0 ? 'me' : ''}>
            <ElementGlyph suit={p.element} size={14} />
            <span className="name">{i === 0 ? 'You' : p.name}</span>
            {showKing && state.kingIdx === i && <span className="crown" aria-label="King">👑</span>}
            {ffa && <span className="tricks" title="tricks won">{state.trickWins[i]}t</span>}
            <strong className="pts">{state.scores[i]}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}
