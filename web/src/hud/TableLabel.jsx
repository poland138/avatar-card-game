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
  const classes = ['seat-label', label.compact && 'compact', !label.active && 'out', pulse && 'pulse']
    .filter(Boolean).join(' ');
  return (
    <div className={classes} style={{ ...style, ...elementVars(label.element) }} data-label={label.id}>
      <div className="seat-top">
        <ElementGlyph suit={label.element} size={label.compact ? 13 : 15} />
        {!label.compact && <span className="seat-name">{label.name}</span>}
        {label.compact && <b className="seat-value">{label.value}</b>}
        {!label.compact && tag && <span className="tag">{tag}</span>}
      </div>
      {label.compact ? (
        tag && <span className="tag">{tag}</span>
      ) : (
        <div className="seat-bottom">
          <b className="seat-value">{label.value}</b>
          <span className="seat-caption">{label.value === 1 ? label.caption.replace(/s$/, '') : label.caption}</span>
          {label.sub && <span className="seat-sub">· {label.sub}</span>}
        </div>
      )}
    </div>
  );
}
