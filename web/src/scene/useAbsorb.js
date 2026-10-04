import { useEffect, useRef, useState } from 'react';

const FLIGHT_MS = 750;
const PULSE_MS = 800;

// When a shown trick/duel is cleared (Continue), its cards fly into the
// winner's point label and shrink away. Labels keep their old numbers until
// the cards land, then the receiving label pulses.
export function useAbsorb(layout) {
  const prev = useRef(null);
  const timers = useRef([]);
  const [flights, setFlights] = useState([]);
  const [frozenLabels, setFrozenLabels] = useState(null);
  const [pulse, setPulse] = useState([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const before = prev.current;
    prev.current = layout;
    if (!before || !layout) return;
    if (before.resolved.length === 0 || layout.resolved.length > 0) return;

    const stillShown = new Set(layout.cards.map(c => c.id));
    const items = before.resolved
      .filter(r => !stillShown.has(r.item.id))
      .map(({ item, pile }) => ({
        ...item,
        spawn: { x: item.x, y: item.y },
        x: pile.x,
        y: pile.y,
        z: 40,
        scale: 0.12,
        glow: false,
        dim: false,
        interactive: false,
        draggable: false,
        target: { kind: 'flight' },
      }));
    if (items.length === 0) return;

    const pileIds = [...new Set(before.resolved.map(r => r.pile?.id).filter(Boolean))];
    timers.current.forEach(clearTimeout);
    setFlights(items);
    setFrozenLabels(before.labels);
    timers.current = [
      setTimeout(() => {
        setFlights([]);
        setFrozenLabels(null);
        setPulse(pileIds);
      }, FLIGHT_MS),
      setTimeout(() => setPulse([]), FLIGHT_MS + PULSE_MS),
    ];
  });

  return { flights, labels: frozenLabels ?? layout?.labels ?? [], pulse };
}
