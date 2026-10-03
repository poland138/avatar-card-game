import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ELEMENTS } from './constants';
import { ElementIcon } from './elementIcons';
import { rankLabel } from './deck';

export default function CardDisplay({ card, small = false, dim = false, highlighted = false }) {
  const elem = ELEMENTS[card.suit];
  const isFaceCard = card.rank >= 11;
  const size = small ? styles.small : styles.normal;

  return (
    <View
      style={[
        styles.card,
        size,
        { backgroundColor: elem.bg, borderColor: highlighted ? '#fde047' : elem.border },
        dim && styles.dim,
        highlighted && styles.highlighted,
      ]}
    >
      {/* Top-left corner: rank + element symbol */}
      <View style={styles.corner}>
        <Text style={[styles.cornerText, small && styles.cornerTextSmall]}>
          {rankLabel(card.rank)}
        </Text>
        <ElementIcon suit={card.suit} size={small ? 10 : 12} />
      </View>

      {/* Center: big face card letter, or blank for number cards */}
      <View style={styles.center}>
        {isFaceCard && (
          <Text style={[styles.centerText, small && styles.centerTextSmall]}>
            {rankLabel(card.rank)}
          </Text>
        )}
      </View>

      {/* Bottom-right corner: rotated copy of top-left */}
      <View style={[styles.corner, styles.cornerBottom]}>
        <Text style={[styles.cornerText, small && styles.cornerTextSmall]}>
          {rankLabel(card.rank)}
        </Text>
        <ElementIcon suit={card.suit} size={small ? 10 : 12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  normal: { width: 56, height: 84 },
  small: { width: 44, height: 64 },
  dim: { opacity: 0.4 },
  highlighted: { transform: [{ scale: 1.05 }] },

  corner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cornerBottom: {
    transform: [{ rotate: '180deg' }],
  },
  cornerText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cornerTextSmall: { fontSize: 10 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  centerTextSmall: { fontSize: 16 },
});
