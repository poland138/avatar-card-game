import { duelSummary, getStatus, trickSummary } from '@core/turnInfo';
import ElementGlyph from './ElementGlyph';

// One centered line telling you what's happening, plus the one button you need.
export default function ActionBar({ state, primary, onPress, onWhy }) {
  let message = getStatus(state).instruction;
  let glyph = null;
  let chip = null;
  let canWhy = false;

  if (state.phase === 'freeforall' && state.revealedTrick) {
    const s = trickSummary(state.revealedTrick, state.players);
    message = s.text;
    glyph = s.element;
    chip = s.reason;
    canWhy = true;
  } else if (state.phase === 'rebellion' && state.laneOutcomes.some(Boolean)) {
    message = duelSummary(state);
    canWhy = true;
  }

  return (
    <section className="action" data-region="action">
      <p className="status" data-testid="status" aria-live="polite">
        {glyph && <ElementGlyph suit={glyph} size={16} />}
        <span className="message">{message}</span>
        {chip && <span className="chip">{chip}</span>}
        {canWhy && <button type="button" className="btn btn-small why" onClick={onWhy}>Why?</button>}
      </p>
      <button type="button" className="btn btn-primary" disabled={!primary.enabled} onClick={onPress}>
        {primary.label}
      </button>
    </section>
  );
}
