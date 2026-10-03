import { ELEMENTS } from '@core/constants';
import { GLYPHS } from '../lib/glyphs';

export default function ElementGlyph({ suit, size = 18, color }) {
  const g = GLYPHS[suit];
  const c = color ?? ELEMENTS[suit].border;
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={g.d}
        fill={g.mode === 'fill' ? c : 'none'}
        stroke={g.mode === 'stroke' ? c : 'none'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
