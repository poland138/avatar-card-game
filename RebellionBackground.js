import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ELEMENTS } from './core/constants';

const NEUTRAL = '#334155';

// Rebellion layout: field is split horizontally. The viewer (idx 0) always
// sees themselves on the bottom half:
//   - If YOU are the king: king-half (solid your color) on bottom,
//     3 rebel columns on top.
//   - If you are a REBEL: king's solid color on top, 3 rebel columns
//     (yours plus the other two) on bottom.
export default function RebellionBackground({ players, kingIdx, rebelOrder, isKingHuman }) {
  const kingColor = ELEMENTS[players[kingIdx]?.element]?.bg || NEUTRAL;
  return (
    <View style={styles.fill} pointerEvents="none">
      {isKingHuman ? (
        <>
          <RebelColumns players={players} rebelOrder={rebelOrder} position="top" />
          <KingHalf color={kingColor} position="bottom" />
        </>
      ) : (
        <>
          <KingHalf color={kingColor} position="top" />
          <RebelColumns players={players} rebelOrder={rebelOrder} position="bottom" />
        </>
      )}
      <View style={styles.divider} />
    </View>
  );
}

function KingHalf({ color, position }) {
  return (
    <View
      style={[
        styles.half,
        { backgroundColor: color },
        position === 'top' ? styles.halfTop : styles.halfBottom,
      ]}
    />
  );
}

function RebelColumns({ players, rebelOrder, position }) {
  return (
    <View
      style={[
        styles.columns,
        position === 'top' ? styles.halfTop : styles.halfBottom,
      ]}
    >
      {rebelOrder.map((rebelIdx, i) => (
        <View
          key={i}
          style={[
            styles.column,
            { backgroundColor: ELEMENTS[players[rebelIdx]?.element]?.bg || NEUTRAL },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  half: { position: 'absolute', left: 0, right: 0, height: '50%', opacity: 0.55 },
  halfTop: { top: 0 },
  halfBottom: { bottom: 0 },
  columns: {
    position: 'absolute', left: 0, right: 0, height: '50%',
    flexDirection: 'row',
  },
  column: { flex: 1, opacity: 0.55 },
  divider: {
    position: 'absolute', left: 0, right: 0, top: '50%',
    height: 2, backgroundColor: '#ffffff33',
  },
});
