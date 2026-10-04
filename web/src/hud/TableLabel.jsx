import ElementGlyph from './ElementGlyph';
import { elementVars } from '../lib/elementVars';

// Point labels drawn over the table at positions chosen by layoutTable.
export default function TableLabel({ label, pulse }) {
  const style = {
    left: `calc(50% + ${label.x}px)`,
    top: `calc(50% - ${label.y}px)`,
    width: label.w,
    height: label.h,
  };

  if (label.kind === 'vs') {
    return <div className="vs-marker" style={style} data-label={label.id}>VS</div>;
  }

  if (label.kind === 'pill') {
    return <div className="center-pill" style={style} data-label={label.id}>{label.text}</div>;
  }

  if (label.kind === 'tally') {
    return (
      <div className={`tally tally-${label.side}${pulse ? ' pulse' : ''}`} style={style} data-label={label.id}>
        {label.side === 'king' ? (
          <><span aria-hidden="true">👑</span><span className="tally-name">King</span><b>{label.value}</b></>
        ) : (
          <><b>{label.value}</b><span className="tally-name">Rebels</span><span aria-hidden="true">🛡</span></>
        )}
      </div>
    );
  }

  const tag = label.compact && label.tag === 'King' ? '👑' : label.tag;
  // 🏆 tricks won this round, ⭐ war points (first to 21).
  const icon = label.caption === 'tricks' ? '🏆' : '⭐';
  const classes = ['seat-label', label.compact && 'compact', !label.active && 'out', pulse && 'pulse']
    .filter(Boolean).join(' ');
  return (
    <div className={classes} style={{ ...style, ...elementVars(label.element) }} data-label={label.id}>
      <div className="seat-top">
        <ElementGlyph suit={label.element} size={label.compact ? 13 : 15} />
        {!label.compact && <span className="seat-name">{label.name}</span>}
        {label.compact && <span className="stat"><span aria-hidden="true">{icon}</span><b className="seat-value">{label.value}</b></span>}
        {!label.compact && tag && <span className="tag">{tag}</span>}
      </div>
      {label.compact ? (
        tag && <span className="tag">{tag}</span>
      ) : (
        <div className="seat-bottom">
          <span className="stat" title={label.caption}><span aria-hidden="true">{icon}</span><b className="seat-value">{label.value}</b></span>
          {label.points !== undefined && (
            <span className="stat" title="points"><span aria-hidden="true">⭐</span><b>{label.points}</b></span>
          )}
        </div>
      )}
    </div>
  );
}
