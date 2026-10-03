import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { backTexture, faceTexture, haloTexture, HALO_SCALE } from './textures';

const noRaycast = () => null;

export default function Card3D({ item, cardW, cardH, onSelect }) {
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
    flipper.current.rotation.y = item.startFaceDown || !item.faceUp ? Math.PI : 0;
    invalidate();
    // Mount-only: later target changes are animated in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // frameloop="demand": a new target needs a frame to start animating toward it.
  useEffect(() => { invalidate(); }, [item.x, item.y, item.z, item.faceUp, invalidate]);

  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useFrame((_, delta) => {
    const it = latest.current;
    const dt = Math.min(delta, 0.1);
    const g = group.current;
    const f = flipper.current;
    const rot = it.faceUp ? 0 : Math.PI;
    g.position.x = THREE.MathUtils.damp(g.position.x, it.x, 12, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, it.y, 12, dt);
    g.position.z = it.z;
    f.rotation.y = THREE.MathUtils.damp(f.rotation.y, rot, 10, dt);
    // damp never lands exactly, so snap when close or demand mode would render forever.
    const settled = Math.abs(g.position.x - it.x) < 0.1 && Math.abs(g.position.y - it.y) < 0.1
      && Math.abs(f.rotation.y - rot) < 1e-3;
    if (settled) {
      g.position.x = it.x;
      g.position.y = it.y;
      f.rotation.y = rot;
    } else {
      invalidate();
    }
  });

  return (
    <group
      ref={group}
      onClick={e => {
        if (!latest.current.interactive) return;
        e.stopPropagation();
        onSelect(latest.current);
      }}
      onPointerOver={e => {
        if (!latest.current.interactive) return;
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
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
        <mesh>
          <planeGeometry args={[cardW, cardH]} />
          <meshBasicMaterial map={face} color={item.dim ? '#6b7280' : '#ffffff'} alphaTest={0.5} />
        </mesh>
        <mesh rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[cardW, cardH]} />
          <meshBasicMaterial map={back} alphaTest={0.5} />
        </mesh>
      </group>
    </group>
  );
}
