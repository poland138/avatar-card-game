import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const noRaycast = () => null;
const BASE = '#0b1120';

function shade(hex, t) {
  return new THREE.Color(hex).lerp(new THREE.Color(BASE), t);
}

// Four element-colored triangles meeting at the center of the play area: each
// player's territory, like the original mobile layout. Edges are darker than
// the center so the cards in the middle stay the brightest thing on screen.
export default function Battlefield({ field }) {
  const { left, right, top, bottom, cx, cy, colors } = field;

  const surface = useMemo(() => {
    const tris = [
      [[left, top], [right, top], colors.north],
      [[right, top], [right, bottom], colors.east],
      [[right, bottom], [left, bottom], colors.south],
      [[left, bottom], [left, top], colors.west],
    ];
    const pos = [];
    const col = [];
    for (const [a, b, hex] of tris) {
      const edge = shade(hex, 0.66);
      const center = shade(hex, 0.4);
      // Counter-clockwise (a → center → b) so the triangle faces the camera.
      pos.push(a[0], a[1], -2, cx, cy, -2, b[0], b[1], -2);
      col.push(edge.r, edge.g, edge.b, center.r, center.g, center.b, edge.r, edge.g, edge.b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }, [left, right, top, bottom, cx, cy, colors.north, colors.east, colors.south, colors.west]);

  const seams = useMemo(() => {
    const pts = [
      left, top, cx, cy, right, top, cx, cy,
      right, bottom, cx, cy, left, bottom, cx, cy,
      left, bottom, right, bottom,
    ];
    const pos = [];
    for (let i = 0; i < pts.length; i += 2) pos.push(pts[i], pts[i + 1], -1.9);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return geo;
  }, [left, right, top, bottom, cx, cy]);

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
