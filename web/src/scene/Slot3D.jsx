import { ELEMENTS } from '@core/constants';
import { slotTexture } from './textures';

export default function Slot3D({ slot, cardW, cardH, onSelect }) {
  const color = ELEMENTS[slot.suit]?.border ?? '#94a3b8';
  return (
    <mesh
      position={[slot.x, slot.y, 0]}
      onClick={e => {
        if (!slot.target) return;
        e.stopPropagation();
        onSelect(slot);
      }}
    >
      <planeGeometry args={[cardW, cardH]} />
      <meshBasicMaterial map={slotTexture(slot.label, color)} transparent depthWrite={false} />
    </mesh>
  );
}
