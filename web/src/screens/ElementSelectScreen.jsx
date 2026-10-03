import { ELEMENTS, SUITS } from '@core/constants';
import ElementGlyph from '../hud/ElementGlyph';
import { elementVars } from '../lib/elementVars';

export default function ElementSelectScreen({ xp, onSelect }) {
  return (
    <main className="screen">
      <h1>Avatar Card Game</h1>
      <p className="subtitle">First there is balance, then one of the nations attacks. Choose your element.</p>
      <div className="element-grid">
        {SUITS.map(suit => (
          <button
            key={suit}
            type="button"
            className="element-card"
            style={elementVars(suit)}
            onClick={() => onSelect(suit)}
          >
            <ElementGlyph suit={suit} size={40} />
            <span className="name">{ELEMENTS[suit].name}</span>
            <span className="flavor">{ELEMENTS[suit].flavor}</span>
            <span className="xp">{xp[suit] || 0} XP</span>
          </button>
        ))}
      </div>
    </main>
  );
}
