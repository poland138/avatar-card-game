import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ELEMENTS } from './core/constants';

const NEUTRAL = '#1e293b';

export default function ElementalBackground({ players, activeIndices }) {
  const active = activeIndices || [0, 1, 2, 3];

  function colorFor(idx) {
    if (!active.includes(idx)) return NEUTRAL;
    return ELEMENTS[players[idx]?.element]?.bg || NEUTRAL;
  }

  const top    = colorFor(2);
  const right  = colorFor(3);
  const bottom = colorFor(0);
  const left   = colorFor(1);

  const [size, setSize] = useState({ w: 0, h: 0 });

  return (
    <View
      style={styles.fill}
      pointerEvents="none"
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
      }}
    >
      {size.w > 0 && size.h > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderLeftWidth:   size.w / 2,
            borderRightWidth:  size.w / 2,
            borderTopWidth:    size.h / 2,
            borderBottomWidth: size.h / 2,
            borderTopColor:    top,
            borderRightColor:  right,
            borderBottomColor: bottom,
            borderLeftColor:   left,
            opacity: 0.55,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
