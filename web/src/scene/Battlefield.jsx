import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const noRaycast = () => null;
const BASE = new THREE.Color('#0b1120');

// Draws the colored territories from layoutTable: triangles with a darkness
// per corner (so each region glows toward the action) plus thin seams.
export default function Battlefield({ field }) {
  // The layout object is rebuilt every render; only rebuild geometry when it actually changes.
  const key = JSON.stringify(field);

  const surface = useMemo(() => {
    const pos = [];
    const col = [];
    for (const tri of field.tris) {
      tri.pts.forEach(([x, y], i) => {
        const c = new THREE.Color(tri.hex).lerp(BASE, tri.shades[i]);
        pos.push(x, y, -2);
        col.push(c.r, c.g, c.b);
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const seams = useMemo(() => {
    const pos = [];
    for (const [x1, y1, x2, y2] of field.lines) pos.push(x1, y1, -1.9, x2, y2, -1.9);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => surface.dispose(), [surface]);
  useEffect(() => () => seams.dispose(), [seams]);

  return (
    <>
      <mesh geometry={surface} raycast={noRaycast}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <lineSegments geometry={seams} raycast={noRaycast}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.14} />
      </lineSegments>
    </>
  );
}
