import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ELEMENTS, SUITS, COLORS } from './constants';
import { rankLabel } from './deck';

export default function MiniHand({
  player,
  idx,
  orientation = 'horizontal',
  trickWins,
  scores,
  kingIdx,
  isWinner,
  nextPlayId,
  hideCards = false,
}) {
  if (!player) return null;
  const elem = ELEMENTS[player.element];
  if (!elem) return null;

  const isKing = kingIdx === idx;
  const displayName = idx === 0 ? 'You' : `${elem.name}bender`;
  const sorted = [...player.hand].sort(
    (a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank
  );
  const isSide = orientation === 'left' || orientation === 'right';
  const rotation = orientation === 'left' ? '-90deg' : orientation === 'right' ? '90deg' : '0deg';

  const pill = (
    <View style={[styles.pill, isWinner && styles.winnerBorder]}>
      <View style={styles.topRow}>
        <View style={styles.label}>
          {isKing && <Text style={styles.crown}>👑</Text>}
          <Text style={styles.symbol}>{elem.symbol}</Text>
          <Text style={[styles.name, { color: elem.text }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        {(trickWins !== undefined || scores !== undefined) && (
          <View style={styles.stats}>
            {trickWins !== undefined && (
              <Text style={styles.statBadge}>🏆 {trickWins}</Text>
            )}
            {scores !== undefined && (
              <Text style={styles.scoreBadge}>⭐ {scores}</Text>
            )}
          </View>
        )}
      </View>

      {!hideCards && (
        <View style={styles.cards}>
          {sorted.map(c => {
            const isNext = c.id === nextPlayId;
            const cardElem = ELEMENTS[c.suit];
            return (
              <View
                key={c.id}
                style={[
                  styles.miniCard,
                  {
                    backgroundColor: cardElem.bg,
                    borderColor: isNext ? '#fde047' : cardElem.border,
                  },
                ]}
              >
                <Text style={styles.miniCardText}>{rankLabel(c.rank)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  if (!isSide) {
    return <View style={styles.topWrapper}>{pill}</View>;
  }

  return (
    <View style={styles.sideWrapper}>
      <View style={{ transform: [{ rotate: rotation }] }}>{pill}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topWrapper: { alignItems: 'center' },
  sideWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  pill: {
    backgroundColor: '#0f172ab3',
    borderColor: COLORS.borderDim,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 4,
    justifyContent: 'center',
  },
  winnerBorder: { borderColor: '#fde047', borderWidth: 2 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  label: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  crown: { fontSize: 11 },
  symbol: { fontSize: 11 },
  name: { fontWeight: '800', fontSize: 11 },

  stats: { flexDirection: 'row', gap: 4 },
  statBadge: {
    color: '#fff', backgroundColor: '#1e293b', fontSize: 10,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden',
  },
  scoreBadge: {
    color: '#fff', backgroundColor: '#a16207cc', fontSize: 10,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden',
  },

  cards: { flexDirection: 'row', gap: 1 },
  miniCard: {
    borderWidth: 1, borderRadius: 2,
    paddingHorizontal: 2, paddingVertical: 0,
    minWidth: 14, alignItems: 'center',
  },
  miniCardText: { color: '#fff', fontWeight: '800', fontSize: 9 },
});