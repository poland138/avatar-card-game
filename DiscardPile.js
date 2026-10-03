import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { Crown, Trash2 } from 'lucide-react-native';
import { ELEMENTS, SUITS, COLORS } from './constants';
import { ElementIcon } from './elementIcons';
import { rankLabel } from './deck';
import { SAFE_TOP, SAFE_BOTTOM } from './safeArea';

const { height: SCREEN_H } = Dimensions.get('window');

// 5 equally-sized columns share the row width. The card visual inside
// each column stays at a fixed size and is centered, so cards stay readable
// while the columns spread evenly across the full sheet width.
const CARD_SIZE = 40;
const ROW_HEIGHT = 48;

export default function DiscardPile({ discardPile, players, rebelOrder, kingIdx, style }) {
  const [open, setOpen] = useState(false);
  const isRebellion =
    Array.isArray(rebelOrder) && rebelOrder.length === 3 &&
    kingIdx !== null && kingIdx !== undefined;
  const rows = buildRows(discardPile);

  const headerSymbols = isRebellion
    ? [
        { suit: players[kingIdx]?.element, fallback: 'crown' },
        { suit: players[rebelOrder[0]]?.element, fallback: 'L' },
        { suit: players[rebelOrder[1]]?.element, fallback: 'M' },
        { suit: players[rebelOrder[2]]?.element, fallback: 'R' },
      ]
    : SUITS.map(s => ({ suit: s, fallback: null }));

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]}
      >
        <Trash2 size={12} color="#fff" strokeWidth={2.25} />
        <Text style={styles.btnText}>{' '}({discardPile.length})</Text>
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
              { height: SCREEN_H - (SAFE_TOP + SAFE_BOTTOM + 48) },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Discard Pile ({discardPile.length})
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            {/* Column header row — same 5-column structure. */}
            <View style={[styles.row, styles.headerRow]}>
              <View style={styles.col}>
                <View style={[styles.box, styles.headerBox]}>
                  <Text style={styles.headerText}>#</Text>
                </View>
              </View>
              {headerSymbols.map((sym, i) => (
                <View key={i} style={styles.col}>
                  <View style={[styles.box, styles.headerBox]}>
                    {ELEMENTS[sym.suit] ? (
                      <ElementIcon suit={sym.suit} size={16} />
                    ) : sym.fallback === 'crown' ? (
                      <Crown size={16} color="#fff" strokeWidth={2.25} />
                    ) : (
                      <Text style={styles.headerText}>{sym.fallback}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {rows.length === 0 ? (
              <Text style={styles.empty}>No cards played yet this phase</Text>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
              >
                {rows.map(row =>
                  isRebellion ? (
                    <RebellionRow
                      key={row.key}
                      row={row}
                      players={players}
                      rebelOrder={rebelOrder}
                      kingIdx={kingIdx}
                    />
                  ) : (
                    <FFARow key={row.key} row={row} players={players} />
                  )
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function buildRows(discardPile) {
  const seen = new Map();
  const order = [];
  for (const entry of discardPile) {
    const key = entry.label.replace('👑', '');
    if (!seen.has(key)) {
      seen.set(key, { key, entries: [] });
      order.push(key);
    }
    seen.get(key).entries.push(entry);
  }
  return order.map(k => seen.get(k));
}

function FFARow({ row, players }) {
  const byElement = {};
  let winnerElement = null;
  for (const entry of row.entries) {
    const elem = players[entry.playerIdx]?.element;
    if (elem) byElement[elem] = entry;
    if (entry.isWinner && elem) winnerElement = elem;
  }
  const labelBg = winnerElement ? ELEMENTS[winnerElement].bg : '#1e293b';

  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <View style={[styles.box, { backgroundColor: labelBg }]}>
          <Text style={styles.labelText} numberOfLines={1}>{row.key}</Text>
        </View>
      </View>
      {SUITS.map(suit => (
        <View key={suit} style={styles.col}>
          <CardBox entry={byElement[suit]} />
        </View>
      ))}
    </View>
  );
}

function RebellionRow({ row, players, rebelOrder, kingIdx }) {
  const byPlayerIdx = {};
  for (const entry of row.entries) {
    byPlayerIdx[entry.playerIdx] = entry;
  }
  const columnsByPlayerIdx = [kingIdx, rebelOrder[0], rebelOrder[1], rebelOrder[2]];

  const laneMatch = row.key.match(/L(\d)/);
  const laneNum = laneMatch ? parseInt(laneMatch[1], 10) : 0;
  const defenderIdx = laneNum >= 1 && laneNum <= 3 ? rebelOrder[laneNum - 1] : null;
  const defenderElement =
    defenderIdx !== null && defenderIdx !== undefined
      ? players[defenderIdx]?.element
      : null;
  const tintColor = defenderElement ? `${ELEMENTS[defenderElement].bg}80` : 'transparent';

  return (
    <View style={[styles.row, { backgroundColor: tintColor, borderRadius: 4 }]}>
      <View style={styles.col}>
        <View style={[styles.box, { backgroundColor: '#1e293b' }]}>
          <Text style={styles.labelText} numberOfLines={1}>{row.key}</Text>
        </View>
      </View>
      {columnsByPlayerIdx.map((pIdx, i) => (
        <View key={i} style={styles.col}>
          <CardBox entry={byPlayerIdx[pIdx]} />
        </View>
      ))}
    </View>
  );
}

function CardBox({ entry }) {
  if (!entry) {
    return (
      <View style={[styles.box, styles.emptyBox]}>
        <Text style={styles.emptyText}>—</Text>
      </View>
    );
  }
  const cardElem = ELEMENTS[entry.card.suit];
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: cardElem.bg, borderColor: cardElem.border, borderWidth: 1 },
        entry.isWinner && styles.winnerBox,
      ]}
    >
      <ElementIcon suit={entry.card.suit} size={13} />
      <Text style={styles.cardRank}>{rankLabel(entry.card.rank)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#334155',
    borderColor: '#64748b',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 11 },
  pressed: { opacity: 0.85 },

  backdrop: {
    flex: 1,
    backgroundColor: '#000000b3',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  close: { color: COLORS.textDim, fontSize: 28, paddingHorizontal: 4 },

  empty: { color: COLORS.textDim, textAlign: 'center', paddingVertical: 24 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    marginBottom: 3,
  },
  headerRow: {
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDim,
    paddingBottom: 4,
  },

  // Each column is an equal share of the row's width. The card box inside
  // is fixed-size and centered, giving even spacing across the screen
  // without resizing the cards themselves.
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  box: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerBox: { backgroundColor: '#1e293b' },
  headerText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  labelText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  emptyBox: { backgroundColor: '#0f172a', opacity: 0.1 },
  emptyText: { color: COLORS.textDim, fontSize: 11 },

  cardRank: { color: '#fff', fontWeight: '800', fontSize: 11 },

  winnerBox: { borderColor: '#ffffff', borderWidth: 3 },
});