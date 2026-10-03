import React from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import CardDisplay from './CardDisplay';

// Bulletproof fan layout.
//
// Why this works where prior attempts didn't:
//   - The container has EXPLICIT width/height. RN cannot collapse it,
//     and an absolute child cannot escape it.
//   - Each card is position:'absolute' with an explicit `left`. Cards
//     literally cannot fail to overlap — their x positions are forced
//     by the step calculation, regardless of touch-target inflation,
//     flexbox quirks, Pressable padding, or anything else.
//
// Layering: natural left-to-right order. The right neighbor stacks on
// top of its left neighbor. When a card is selected we only nudge it
// upward (translateY) — we do NOT boost its zIndex. That way the right
// neighbors continue to overlap the raised card, and only the *left*
// half of the selected card pokes out above the fan.
//
// Opacity: full opacity even when disabled. The translateY raise is the
// only signal needed for "this is the card you've picked".

const SCREEN_W = Dimensions.get('window').width;
const AVAIL    = SCREEN_W - 40;
const CARD_W   = 56;
const CARD_H   = 84;
const RAISE    = Math.round(CARD_H / 3);

export default function HandFan({
  cards,
  selectedId,
  disabled,
  onPress,
  dimIds = [],
}) {
  const n = cards.length;
  if (n === 0) return <View style={{ height: CARD_H + RAISE }} />;

  const step =
    n <= 1
      ? 0
      : Math.min(CARD_W * 0.9, (AVAIL - CARD_W) / (n - 1));

  const totalWidth = CARD_W + step * (n - 1);

  return (
    <View
      style={{
        height: CARD_H + RAISE,
        width: totalWidth,
        alignSelf: 'center',
        position: 'relative',
      }}
    >
      {cards.map((card, i) => {
        const isSelected = card.id === selectedId;
        const isDim      = dimIds.includes(card.id);
        const tappable   = !disabled && !isDim;

        return (
          <Pressable
            key={card.id}
            onPress={() => tappable && onPress(card)}
            disabled={!tappable}
            style={{
              position: 'absolute',
              left: i * step,
              top: isSelected ? 0 : RAISE,
              width: CARD_W,
              height: CARD_H,
              // Natural left-to-right stacking. Selected card does NOT
              // jump above its right neighbors — it only raises.
              zIndex:    i,
              elevation: 3,
              opacity:   isDim ? 0.35 : 1,
            }}
          >
            <CardDisplay
              card={card}
              highlighted={isSelected}
              dim={isDim}
            />
          </Pressable>
        );
      })}
    </View>
  );
}