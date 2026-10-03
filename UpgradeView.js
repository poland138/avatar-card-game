import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Sparkles, Lock } from 'lucide-react-native';
import { ELEMENTS, UPGRADE_STUBS, COLORS } from './constants';
import { ElementIcon } from './elementIcons';
import { SAFE_TOP, SAFE_BOTTOM } from './safeArea';

export default function UpgradeView({ element, currentXp = 0, onContinue, onBack }) {
  const elem = ELEMENTS[element];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: SAFE_TOP + 12, paddingBottom: SAFE_BOTTOM + 24 },
      ]}
    >
      <Pressable onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>← Change element</Text>
      </Pressable>

      <View style={[styles.banner, { backgroundColor: elem.bg, borderColor: elem.border }]}>
        <ElementIcon suit={element} size={36} />
        <View style={styles.bannerCenter}>
          <Text style={styles.bannerTitle}>{elem.name}bender</Text>
          <Text style={styles.bannerFlavor}>{elem.flavor}</Text>
        </View>
        <View style={styles.bannerXp}>
          <Text style={styles.bannerXpLabel}>Class XP</Text>
          <Text style={styles.bannerXpValue}>{currentXp} / 100</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelTitleRow}>
          <Sparkles size={16} color={COLORS.textPrimary} strokeWidth={2.25} />
          <Text style={styles.panelTitle}>
            {' '}Upgrades <Text style={styles.panelSubtitle}>(coming soon)</Text>
          </Text>
        </View>
        <View style={styles.upgradeList}>
          {UPGRADE_STUBS.map(up => (
            <UpgradeCard key={up.id} upgrade={up} />
          ))}
        </View>
      </View>

      <Pressable
        onPress={onContinue}
        style={({ pressed }) => [styles.beginButton, pressed && styles.beginPressed]}
      >
        <Text style={styles.beginText}>Begin Run</Text>
      </Pressable>
    </ScrollView>
  );
}

function UpgradeCard({ upgrade }) {
  return (
    <View style={[styles.upgrade, !upgrade.unlocked && styles.upgradeLocked]}>
      <View style={styles.upgradeHeader}>
        <View style={styles.upgradeNameRow}>
          {upgrade.unlocked ? (
            <Sparkles size={13} color="#fff" strokeWidth={2.25} />
          ) : (
            <Lock size={13} color="#fff" strokeWidth={2.25} />
          )}
          <Text style={styles.upgradeName}>{' '}{upgrade.name}</Text>
        </View>
        <Text style={styles.upgradeCost}>
          {upgrade.cost === 0 ? 'Owned' : `${upgrade.cost} XP`}
        </Text>
      </View>
      <Text style={styles.upgradeDesc}>{upgrade.desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { padding: 16 },

  backRow: { marginBottom: 12 },
  backText: { color: COLORS.textDim, fontSize: 14 },

  banner: {
    borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  bannerCenter: { flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 },
  bannerFlavor: { color: '#ffffffcc', fontSize: 12 },
  bannerXp: { alignItems: 'flex-end' },
  bannerXpLabel: { color: '#ffffffb3', fontSize: 11 },
  bannerXpValue: { color: '#fff', fontSize: 18, fontWeight: '800' },

  panel: {
    backgroundColor: COLORS.bgPanel, borderRadius: 14, padding: 16, marginBottom: 16,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  panelTitle: {
    color: COLORS.textPrimary, fontSize: 16, fontWeight: '800',
  },
  panelSubtitle: { fontSize: 11, color: COLORS.textDim, fontWeight: '400' },

  upgradeList: { gap: 8 },
  upgrade: {
    backgroundColor: '#334155', borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 8, padding: 10,
  },
  upgradeLocked: { backgroundColor: '#0f172a', borderColor: COLORS.borderDim, opacity: 0.6 },
  upgradeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  upgradeNameRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  upgradeName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  upgradeCost: { color: COLORS.textDim, fontSize: 11 },
  upgradeDesc: { color: COLORS.textMuted, fontSize: 11 },

  beginButton: {
    alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 32,
    backgroundColor: '#ea580c', borderRadius: 14,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  beginPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  beginText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});