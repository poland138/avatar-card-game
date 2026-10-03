import { cardLabel, playerLabel } from '@core/turnInfo';
import Modal from './Modal';
import { elementVars } from '../lib/elementVars';

export default function LogModal({ state, onClose }) {
  const groups = [];
  for (const entry of state.discardPile) {
    const label = entry.label.replace('👑', '');
    const key = `${entry.phase}-${label}`;
    let g = groups.find(x => x.key === key);
    if (!g) {
      g = { key, label, entries: [] };
      groups.push(g);
    }
    g.entries.push(entry);
  }
  return (
    <Modal title="Cards played this round" onClose={onClose}>
      {groups.length === 0 ? (
        <p className="muted">Nothing played yet.</p>
      ) : (
        <ol className="log">
          {[...groups].reverse().map(g => (
            <li key={g.key}>
              <span className="log-label">{g.label}</span>
              {g.entries.map((e, i) => (
                <span key={i} className={`log-card${e.isWinner ? ' won' : ''}`} style={elementVars(e.card.suit)}>
                  {playerLabel(state.players, e.playerIdx)}: {cardLabel(e.card)}
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
