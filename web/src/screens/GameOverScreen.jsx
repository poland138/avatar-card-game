import { ELEMENTS, TARGET_SCORE } from '@core/constants';
import ElementGlyph from '../hud/ElementGlyph';

export default function GameOverScreen({ state, onRestart }) {
  const best = Math.max(...state.scores);
  const winnerIdx = state.scores.indexOf(best);
  const ranking = state.players
    .map((p, i) => ({ i, name: i === 0 ? 'You' : p.name, element: p.element, score: state.scores[i] }))
    .sort((a, b) => b.score - a.score);
  const elem = state.chosenElement;
  const last = state.lastRebellion;

  return (
    <main className="screen">
      <h1>{winnerIdx === 0 ? 'You win the war!' : `${state.players[winnerIdx].name} wins the war`}</h1>
      <p className="subtitle">
        First to {TARGET_SCORE} points takes it.
        {last?.held && ` Final hold: ${last.duels.king}–${last.duels.rebellion}, +${last.points} pts.`}
        {elem && ` Your ${ELEMENTS[elem].name} XP: ${state.xp[elem]}.`}
      </p>
      <ol className="results panel">
        {ranking.map(r => (
          <li key={r.i} className={r.i === 0 ? 'me' : ''}>
            <ElementGlyph suit={r.element} size={18} />
            <span>{r.name}</span>
            <strong>{r.score}</strong>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-primary" onClick={onRestart}>New game</button>
    </main>
  );
}
