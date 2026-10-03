import { useState } from 'react';

export default function DevPanel({ dev, setDev, state, dispatch }) {
  const [open, setOpen] = useState(false);
  const [wins, setWins] = useState([4, 3, 3, 3]);
  const total = wins.reduce((a, b) => a + b, 0);
  const canSkipFFA = state.phase === 'freeforall' && !state.skirmish && total === 13;
  const toggle = key => e => setDev(d => ({ ...d, [key]: e.target.checked }));
  // Debug jumps collapse the panel so it never sits between the player and the next button.
  const run = action => {
    dispatch(action);
    setOpen(false);
  };

  return (
    <aside className="dev-panel" aria-label="Developer tools">
      <button type="button" className="dev-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        Dev {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="dev-controls">
          <label><input type="checkbox" checked={dev.showHands} onChange={toggle('showHands')} /> Show opponent hands</label>
          <label><input type="checkbox" checked={dev.showNextPick} onChange={toggle('showNextPick')} /> Highlight AI next card</label>
          <span className="skip">
            FFA wins:
            {wins.map((w, i) => (
              <input
                key={i}
                type="number"
                min="0"
                max="13"
                value={w}
                aria-label={`Tricks for ${i === 0 ? 'You' : state.players[i]?.name ?? `player ${i}`}`}
                onChange={e => setWins(ws => ws.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              />
            ))}
            <button type="button" className="btn btn-small" disabled={!canSkipFFA} onClick={() => run({ type: 'SKIP_TO_FFA_END', wins })}>
              Skip ({total}/13)
            </button>
          </span>
          <button type="button" className="btn btn-small" onClick={() => run({ type: 'SKIP_TO_GAMEOVER' })}>Skip to game over</button>
          <button type="button" className="btn btn-small" disabled={state.phase !== 'rebellion'} onClick={() => run({ type: 'RETURN_TO_FFA' })}>
            Return to FFA
          </button>
        </div>
      )}
    </aside>
  );
}
