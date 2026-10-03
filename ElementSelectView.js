import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ELEMENTS, SUITS, COLORS } from './constants';
import { ELEMENT_ICONS } from './elementIcons';
import { SAFE_TOP, SAFE_BOTTOM } from './safeArea';

export default function ElementSelectView({ onSelect }) {
  return (
    <View
      style={[
        styles.container,
        { paddingTop: SAFE_TOP + 16, paddingBottom: SAFE_BOTTOM + 16 },
      ]}
    >
      <Text style={styles.title}>Avatar: King of the Hill</Text>
      <Text style={styles.subtitle}>Choose your element.</Text>

      <View style={styles.grid}>
        {SUITS.map(suit => {
          const elem = ELEMENTS[suit];
          const Icon = ELEMENT_ICONS[suit];
          return (
            <Pressable
              key={suit}
              onPress={() => onSelect(suit)}
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: elem.bg, borderColor: elem.border },
                pressed && styles.tilePressed,
              ]}
            >
              <View style={styles.tileHeader}>
                <Icon size={22} color="#fff" strokeWidth={2.25} />
                <Text
                  style={styles.tileName}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {elem.name}bender
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ //adds the buttons with each bending type
  container: { flex: 1, paddingHorizontal: 30, backgroundColor: COLORS.bgDark },

  title: { //'Avatar: King of the Hill' title settings
    fontSize: 26, fontWeight: '800', color: COLORS.textPrimary,
    textAlign: 'center', marginBottom: 6,
  },

  subtitle: { //'Choose your element' subtitle/heading
    fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20,
  },
  
  grid: { //Grid that contains element buttons
    flexDirection: 'row', flexWrap: 'wrap',
    rowGap: 12, columnGap: 12,
  },

  tile: { //Colored element buttons/boxes
    flexBasis: '48%', flexGrow: 1,
    borderRadius: 14, borderWidth: 4,
    paddingVertical: 16, paddingHorizontal: 10,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },

  tilePressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileName: { color: '#fff', fontSize: 15, fontWeight: '700', flexShrink: 1 },
});