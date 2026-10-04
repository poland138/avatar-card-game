import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const noRaycast = () => null;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 6);
}

// Dark rounded panel behind a player's label and face-down cards.
export default function Backdrop3D({ backdrop }) {
  const { x, y, w, h } = backdrop;
  const geo = useMemo(() => roundedRect(w, h, Math.min(12, h / 3)), [w, h]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[x, y, -1]} raycast={noRaycast}>
      <meshBasicMaterial color="#0b1120" transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}
