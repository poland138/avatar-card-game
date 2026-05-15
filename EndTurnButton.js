import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { SAFE_BOTTOM } from './safeArea';

export default function EndTurnButton({ enabled, onPress, label = 'End Turn' }) {
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      style={({ pressed }) => [
        styles.button,
        { bottom: SAFE_BOTTOM + 12 },
        enabled ? styles.enabled : styles.disabled,
        pressed && enabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, !enabled && styles.labelDisabled]}>
        {label} ⚔️
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  enabled: { backgroundColor: '#ea580c' },
  disabled: { backgroundColor: '#334155' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: { color: '#fff', fontWeight: '800', fontSize: 15 },
  labelDisabled: { color: '#64748b' },
});