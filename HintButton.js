import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Crown, Swords, Scale, HelpCircle, Spade, Lightbulb } from 'lucide-react-native';
import { TARGET_SCORE, COLORS } from './constants';
import { SAFE_TOP, SAFE_BOTTOM } from './safeArea';

// Inline button + modal. Parent positions the button via the surrounding
// toolbar; no absolute positioning here.
export default function HintButton({ style }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
      >
        <HelpCircle size={12} color="#fff" strokeWidth={2.25} />
        <Text style={styles.btnText}>{' '}Rules</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { marginTop: SAFE_TOP + 24, marginBottom: SAFE_BOTTOM + 24 },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <HelpCircle size={18} color="#fff" strokeWidth={2.25} />
                <Text style={styles.headerTitle}>{' '}Rules & Strategy</Text>
              </View>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            {/* The fix for the un-scrollable modal: ScrollView gets flex:1 so it
                takes the remaining height and becomes scrollable. */}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <Section
                title="The Basics"
                color="#fde047"
                icon={<Spade size={15} color="#fde047" strokeWidth={2.25} />}
              >
                <Bullet>4 players, each assigned an element (water, fire, earth, air)</Bullet>
                <Bullet>Standard 52-card deck where each suit represents an element</Bullet>
                <Bullet>Game alternates between Free-for-All and Rebellion phases</Bullet>
                <Bullet>First player to {TARGET_SCORE} points wins the war</Bullet>
              </Section>

              <Section
                title="Free-for-All Phase"
                color="#93c5fd"
                icon={<Swords size={15} color="#93c5fd" strokeWidth={2.25} />}
              >
                <Bullet>13 simultaneous tricks. All 4 players reveal a card at the same time</Bullet>
                <Bullet>Your element card trumps any non-element card from others</Bullet>
                <Bullet>Among trumps, highest rank wins</Bullet>
                <Bullet>Player with the most tricks becomes King for the Rebellion</Bullet>
              </Section>

              <Section
                title="Rebellion Phase (3v1)"
                color="#fde047"
                icon={<Crown size={15} color="#fde047" strokeWidth={2.25} />}
              >
                <Bullet>King gets 21 cards; each Rebel gets 7</Bullet>
                <Bullet>7 duels per round. King attacks 3 lanes, Rebels defend simultaneously</Bullet>
                <Bullet>King wins a duel by taking 2 of 3 lanes</Bullet>
                <Bullet>King wins the round by taking 4 duels → scores points equal to duels won</Bullet>
                <Bullet>Rebellion wins by taking 4 duels first → no points, crown resets</Bullet>
              </Section>

              <Section
                title="Lane Resolution"
                color="#c084fc"
                icon={<Scale size={15} color="#c084fc" strokeWidth={2.25} />}
              >
                <Bullet>Both played their element: higher rank wins, ties = draw</Bullet>
                <Bullet>Only one played element: that side wins</Bullet>
                <Bullet>Neither played element: higher rank wins, ties = draw</Bullet>
                <Bullet>Duel split 1-1-1 is itself a draw — no points awarded</Bullet>
              </Section>

              <Section
                title="Strategy"
                color="#86efac"
                icon={<Lightbulb size={15} color="#86efac" strokeWidth={2.25} />}
              >
                <Bullet>Save high element cards for tricks you really want to win</Bullet>
                <Bullet>If the King attacks with a non-element, ANY of your element cards wins</Bullet>
                <Bullet>Becoming King isn't always good — Rebellion can overthrow you</Bullet>
                <Bullet>Track the discard pile to count remaining trumps</Bullet>
              </Section>
            </ScrollView>

            <Pressable
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.gotItBtn, pressed && styles.pressed]}
            >
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Section({ title, color, icon, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        {icon}
        <Text style={[styles.sectionTitle, { color }, icon && styles.sectionTitleWithIcon]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Bullet({ children }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderColor: '#60a5fa',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  pressed: { opacity: 0.85 },

  backdrop: {
    flex: 1, backgroundColor: '#000000b3',
    justifyContent: 'center', paddingHorizontal: 16,
  },
  sheet: {
    flex: 1,
    backgroundColor: '#0f172a', borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  close: { color: COLORS.textDim, fontSize: 28, paddingHorizontal: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },

  section: { marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontWeight: '800', fontSize: 15 },
  sectionTitleWithIcon: { marginLeft: 6 },
  bulletRow: { flexDirection: 'row', marginBottom: 3, paddingRight: 8 },
  bulletDot: { color: COLORS.textMuted, marginRight: 6, fontSize: 12 },
  bulletText: { color: COLORS.textMuted, fontSize: 12, flex: 1, lineHeight: 17 },

  gotItBtn: {
    marginTop: 12, backgroundColor: '#334155',
    paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  gotItText: { color: '#fff', fontWeight: '800' },
});