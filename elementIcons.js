import React from 'react';
import { Droplet, Flame, Mountain, Wind } from 'lucide-react-native';

export const ELEMENT_ICONS = {
  water: Droplet,
  fire: Flame,
  earth: Mountain,
  air: Wind,
};

export function ElementIcon({ suit, size = 14, color = '#fff', strokeWidth = 2.25, style }) {
  const Icon = ELEMENT_ICONS[suit];
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}
