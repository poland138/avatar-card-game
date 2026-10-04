import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { backTexture, faceTexture, haloTexture, HALO_SCALE } from './textures';

const noRaycast = () => null;
const meshRaycast = THREE.Mesh.prototype.raycast;

export default function Card3D({ item, cardW, cardH, onPress }) {
  const group = useRef();
  const flipper = useRef();
  const latest = useRef(item);
  latest.current = item;
  const invalidate = useThree(s => s.invalidate);

  const face = useMemo(() => faceTexture(item.card), [item.card.suit, item.card.rank]);
  const back = backTexture();
  const glow = haloTexture('#facc15', 28);
  const shadow = haloTexture('#000000', 20);

  useLayoutEffect(() => {
    const start = item.spawn ?? item;
    group.current.position.set(start.x, start.y, item.z);
    group.current.rotation.z = item.rotZ;
    group.current.scale.setScalar(item.scale);
    flipper.current.rotation.y = item.startFaceDown || !item.faceUp ? Math.PI : 0;
    invalidate();
    // Mount-only: later target changes are animated in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // frameloop="demand": a new target needs a frame to start animating toward it.
  useEffect(() => { invalidate(); }, [item.x, item.y, item.z, item.faceUp, item.scale, item.rotZ, invalidate]);

  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useFrame((_, delta) => {
    const it = latest.current;
    const dt = Math.min(delta, 0.1);
    const g = group.current;
    const f = flipper.current;
    const rot = it.faceUp ? 0 : Math.PI;
    // A dragged card tracks the pointer exactly.
    // Absorbed cards fly a little slower so you can follow them to the points.
    const k = it.target?.kind === 'drag' ? 40 : it.target?.kind === 'flight' ? 6 : 12;
    g.position.x = THREE.MathUtils.damp(g.position.x, it.x, k, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, it.y, k, dt);
    g.position.z = it.z;
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, it.rotZ, 12, dt);
    const s = THREE.MathUtils.damp(g.scale.x, it.scale, 12, dt);
    g.scale.setScalar(s);
    f.rotation.y = THREE.MathUtils.damp(f.rotation.y, rot, 10, dt);
    // damp never lands exactly, so snap when close or demand mode would render forever.
    const settled = Math.abs(g.position.x - it.x) < 0.1 && Math.abs(g.position.y - it.y) < 0.1
      && Math.abs(f.rotation.y - rot) < 1e-3 && Math.abs(g.rotation.z - it.rotZ) < 1e-3
      && Math.abs(s - it.scale) < 1e-3;
    if (settled) {
      g.position.x = it.x;
      g.position.y = it.y;
      g.rotation.z = it.rotZ;
      g.scale.setScalar(it.scale);
      f.rotation.y = rot;
    } else {
      invalidate();
    }
  });

  const pressable = it => it.interactive || it.draggable;

  return (
    <group
      ref={group}
      onPointerDown={e => {
        if (!pressable(latest.current)) return;
        e.stopPropagation();
        onPress(latest.current, e.nativeEvent);
      }}
      onClick={e => { if (pressable(latest.current)) e.stopPropagation(); }}
      onPointerOver={e => {
        if (!pressable(latest.current)) return;
        e.stopPropagation();
        document.body.style.cursor = latest.current.draggable ? 'grab' : 'pointer';
      }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <mesh position={[3, -5, -0.05]} raycast={noRaycast}>
        <planeGeometry args={[cardW * HALO_SCALE.x, cardH * HALO_SCALE.y]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {item.glow && (
        <mesh position={[0, 0, -0.03]} raycast={noRaycast}>
          <planeGeometry args={[cardW * HALO_SCALE.x * 1.04, cardH * HALO_SCALE.y * 1.03]} />
          <meshBasicMaterial map={glow} transparent depthWrite={false} />
        </mesh>
      )}
      <group ref={flipper}>
        <mesh raycast={pressable(item) ? meshRaycast : noRaycast}>
          <planeGeometry args={[cardW, cardH]} />
          <meshBasicMaterial map={face} color={item.dim ? '#6b7280' : '#ffffff'} alphaTest={0.5} />
        </mesh>
        <mesh rotation={[0, Math.PI, 0]} raycast={pressable(item) ? meshRaycast : noRaycast}>
          <planeGeometry args={[cardW, cardH]} />
          <meshBasicMaterial map={back} alphaTest={0.5} />
        </mesh>
      </group>
    </group>
  );
}
