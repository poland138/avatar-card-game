import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { geometryFor, layoutTable } from '../lib/cardLayout';
import { useElementSize } from '../lib/useElementSize';
import { useAbsorb } from './useAbsorb';
import Card3D from './Card3D';
import Slot3D from './Slot3D';
import Badge3D from './Badge3D';
import TableLabel from '../hud/TableLabel';

const DRAG_THRESHOLD = 6;

function Scene({ layout, flights, g, onPress, onSlotSelect }) {
  return (
    <>
      {layout.slots.map(s => <Slot3D key={s.id} slot={s} cardW={g.cardW} cardH={g.cardH} onSelect={onSlotSelect} />)}
      {[...layout.cards, ...flights].map(c => (
        <Card3D key={c.id} item={c} cardW={g.cardW} cardH={g.cardH} onPress={onPress} />
      ))}
      {layout.badges.map(b => <Badge3D key={b.id} badge={b} cardW={g.cardW} cardH={g.cardH} />)}
    </>
  );
}

export default function Table({ state, ui, dev, onTap, onDrop, onSlotSelect }) {
  const wrap = useRef(null);
  const size = useElementSize(wrap);
  const [drag, setDrag] = useState(null);
  const press = useRef(null);

  const g = size.width > 0 && size.height > 0 ? geometryFor(state, size.width, size.height) : null;
  const layout = g ? layoutTable(state, g, { ...ui, drag, dev: dev.enabled ? dev : null }) : null;
  const { flights, labels, pulse } = useAbsorb(layout);

  const latest = useRef(null);
  latest.current = { onTap, onDrop, g };

  // Pointer → table coordinates (origin at center, +y up), matching the camera.
  function toWorld(clientX, clientY) {
    const el = wrap.current;
    const r = el.getBoundingClientRect();
    return {
      x: clientX - r.left - el.clientLeft - el.clientWidth / 2,
      y: el.clientHeight / 2 - (clientY - r.top - el.clientTop),
    };
  }

  // Drag is tracked on window so it keeps working when the pointer leaves the card.
  useEffect(() => {
    function move(ev) {
      const p = press.current;
      if (!p) return;
      if (!p.dragging) {
        if (!p.item.draggable || Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0) < DRAG_THRESHOLD) return;
        p.dragging = true;
        document.body.style.cursor = 'grabbing';
      }
      setDrag({ id: p.item.card.id, ...toWorld(ev.clientX, ev.clientY) });
    }
    function up(ev) {
      const p = press.current;
      press.current = null;
      if (!p) return;
      if (p.dragging) {
        document.body.style.cursor = '';
        setDrag(null);
        latest.current.onDrop(p.item, toWorld(ev.clientX, ev.clientY), latest.current.g);
      } else {
        latest.current.onTap(p.item);
      }
    }
    function cancel() {
      press.current = null;
      document.body.style.cursor = '';
      setDrag(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, []);

  function onPress(item, ev) {
    press.current = { item, x0: ev.clientX, y0: ev.clientY, dragging: false };
  }

  return (
    <div className="table" data-region="table" ref={wrap}>
      <Canvas
        orthographic
        flat
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
      >
        {layout && <Scene layout={layout} flights={flights} g={g} onPress={onPress} onSlotSelect={onSlotSelect} />}
      </Canvas>
      <div className="table-labels">
        {labels.map(l => <TableLabel key={l.id} label={l} pulse={pulse.includes(l.id)} />)}
      </div>
    </div>
  );
}
