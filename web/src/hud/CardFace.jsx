import { rankLabel } from '@core/deck';
import ElementGlyph from './ElementGlyph';
import { elementVars } from '../lib/elementVars';

// Small HTML card used in explanations. ★ = the player's own element (trump).
export default function CardFace({ card, star = false, crown = false }) {
  if (!card) return <span className="card-face empty" aria-label="no card">—</span>;
  return (
    <span className={`card-face${crown ? ' won' : ''}`} style={elementVars(card.suit)}>
      <span className="card-rank">{rankLabel(card.rank)}</span>
      <ElementGlyph suit={card.suit} size={20} />
      {star && <span className="card-star" title="own element">★</span>}
      {crown && <span className="card-crown" title="winner">👑</span>}
    </span>
  );
}
