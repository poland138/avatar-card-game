import { Canvas, useThree } from '@react-three/fiber';
import { layoutTable, tableGeometry } from '../lib/cardLayout';
import Card3D from './Card3D';
import Slot3D from './Slot3D';
import Badge3D from './Badge3D';

function Scene({ state, ui, onCardSelect, onSlotSelect }) {
  const size = useThree(s => s.size);
  const g = tableGeometry(size.width, size.height, state.players[0]?.hand.length ?? 0);
  const { cards, slots, badges } = layoutTable(state, g, ui);
  return (
    <>
      {slots.map(s => <Slot3D key={s.id} slot={s} cardW={g.cardW} cardH={g.cardH} onSelect={onSlotSelect} />)}
      {cards.map(c => <Card3D key={c.id} item={c} cardW={g.cardW} cardH={g.cardH} onSelect={onCardSelect} />)}
      {badges.map(b => <Badge3D key={b.id} badge={b} cardW={g.cardW} cardH={g.cardH} />)}
    </>
  );
}

export default function Table(props) {
  return (
    <div className="table" data-region="table">
      <Canvas
        orthographic
        flat
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
