import { BADGE_SIZE } from '../lib/cardLayout';
import { badgeTexture } from './textures';

const noRaycast = () => null;

export default function Badge3D({ badge, cardW, cardH }) {
  return (
    <mesh position={[badge.x, badge.y, 3]} raycast={noRaycast}>
      <planeGeometry args={[cardW * BADGE_SIZE.w, cardH * BADGE_SIZE.h]} />
      <meshBasicMaterial map={badgeTexture(badge.text, badge.color)} transparent depthWrite={false} />
    </mesh>
  );
}
