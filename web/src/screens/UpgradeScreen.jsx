import { ELEMENTS, UPGRADE_STUBS } from '@core/constants';
import ElementGlyph from '../hud/ElementGlyph';
import { elementVars } from '../lib/elementVars';

export default function UpgradeScreen({ element, xp, onBegin, onBack }) {
  const e = ELEMENTS[element];
  return (
    <main className="screen">
      <button type="button" className="btn-link back" onClick={onBack}>← Change element</button>
      <section className="hero" style={elementVars(element)}>
        <ElementGlyph suit={element} size={40} />
        <div className="titles">
          <h2>{e.name}bender</h2>
          <p>{e.flavor}</p>
        </div>
        <div className="xp">
          <div className="label">Class XP</div>
          <div className="value">{xp} / 100</div>
        </div>
      </section>
      <section className="panel">
        <h3>Upgrades <span className="muted">(coming soon)</span></h3>
        <ul className="upgrade-list">
          {UPGRADE_STUBS.map(u => (
            <li key={u.id} className={u.unlocked ? 'upgrade' : 'upgrade locked'}>
              <span className="name">{u.name}</span>
              <span className="cost">{u.unlocked ? 'Unlocked' : `${u.cost} XP`}</span>
              <span className="desc">{u.desc}</span>
            </li>
          ))}
        </ul>
      </section>
      <button type="button" className="btn btn-primary" onClick={onBegin}>Begin Run</button>
    </main>
  );
}
