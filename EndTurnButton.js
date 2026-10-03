import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Swords } from 'lucide-react-native';

export default function EndTurnButton({ enabled, onPress, label = 'End Turn', style }) {
  const swordColor = enabled ? '#fff' : '#64748b';
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      style={({ pressed }) => [
        styles.button,
        enabled ? styles.enabled : styles.disabled,
        pressed && enabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, !enabled && styles.labelDisabled]}>
        {label}{' '}
      </Text>
      <Swords size={13} color={swordColor} strokeWidth={2.25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  enabled: { backgroundColor: '#ea580c' },
  disabled: { backgroundColor: '#334155' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: { color: '#fff', fontWeight: '800', fontSize: 13 },
  labelDisabled: { color: '#64748b' },
});
