import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, Modal, StyleSheet } from 'react-native';
import { Trophy, Star, Swords, Bug, Eye, EyeOff, Gem } from 'lucide-react-native';
import { ELEMENTS, SUITS, COLORS } from './constants';
import { ElementIcon } from './elementIcons';
import { rankLabel } from './deck';
import { SAFE_TOP, SAFE_BOTTOM } from './safeArea';
import CardDisplay from './CardDisplay';
import MiniHand from './MiniHand';
import ElementalBackground from './ElementalBackground';
import DiscardPile from './DiscardPile';
import HintButton from './HintButton';
import EndTurnButton from './EndTurnButton';
import HandFan from './HandFan';
import { getCardsWonBy } from './reducer';

const TOTAL_TRICKS = 13;

export default function FreeForAllView({
  players,
  trickWins,
  scores,
  message,
  humanFFAPick,
  committedFFAPick,
  revealedTrick,
  trickNumber,
  onSelectCard,
  onEndTurn,
  animating,
  discardPile,
  aiPreviewPicks,
  waitingForContinue,
  skirmish,
  onContinue,
  onSkipToFFAEnd,
}) {
  const human = players[0];
  const myElement = human?.element;
  const isPicking = !committedFFAPick && !revealedTrick && !animating && !waitingForContinue;

  const activeIndices = skirmish ? skirmish.participants : [0, 1, 2, 3];
  const isHumanActive = activeIndices.includes(0);
  const canEndTurn = isPicking && (isHumanActive ? !!humanFFAPick : true);

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [hideOpponentCards, setHideOpponentCards] = useState(false);
  const [cardsWonModalIdx, setCardsWonModalIdx] = useState(null);

  const cardsWonByIdx = useMemo(() => {
    const out = {};
    for (let i = 0; i < players.length; i++) {
      out[i] = getCardsWonBy(discardPile, i);
    }
    return out;
  }, [discardPile, players.length]);

  const pointsWonByIdx = useMemo(() => {
    const out = {};
    for (const k of Object.keys(cardsWonByIdx)) {
      out[k] = cardsWonByIdx[k].reduce((s, c) => s + c.rank, 0);
    }
    return out;
  }, [cardsWonByIdx]);

  const [skirmishIntroSeen, setSkirmishIntroSeen] = useState(false);
  const skirmishKey = skirmish
    ? `${skirmish.participants.join(',')}-${skirmish.recursionLevel}`
    : null;
  useEffect(() => {
    setSkirmishIntroSeen(false);
  }, [skirmishKey]);
  const showSkirmishIntro =
    !!skirmish && !skirmishIntroSeen && trickNumber === 1 && !revealedTrick && !committedFFAPick;

  function getPlayedCard(idx) {
    if (revealedTrick) {
      const play = revealedTrick.plays.find(pl => pl.playerIdx === idx);
      return play?.card || null;
    }
    if (committedFFAPick) {
      if (!activeIndices.includes(idx)) return null;
      return { suit: '_back', rank: 0, id: `back-${idx}`, isBack: true };
    }
    return null;
  }

  return (
    <View style={[styles.root, { paddingTop: SAFE_TOP + 8 }]}>
      <View style={styles.toolbar}>
        <DiscardPile discardPile={discardPile} players={players} />
        <HintButton />
        <Pressable
          onPress={() => setHideOpponentCards(v => !v)}
          style={({ pressed }) => [styles.toolBtn, pressed && styles.pressed]}
        >
          {hideOpponentCards ? (
            <Eye size={12} color="#fff" strokeWidth={2.25} />
          ) : (
            <EyeOff size={12} color="#fff" strokeWidth={2.25} />
          )}
          <Text style={styles.toolBtnText}>{' '}{hideOpponentCards ? 'Show' : 'Hide'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowSkipModal(true)}
          style={({ pressed }) => [styles.debugBtn, pressed && styles.pressed]}
        >
          <Bug size={12} color="#fff" strokeWidth={2.25} />
          <Text style={styles.debugBtnText}>{' '}Skip</Text>
        </Pressable>
      </View>

      <SkipFFAModal
        visible={showSkipModal}
        players={players}
        onClose={() => setShowSkipModal(false)}
        onSubmit={wins => {
          setShowSkipModal(false);
          onSkipToFFAEnd(wins);
        }}
      />

      <CardsWonModal
        visible={cardsWonModalIdx !== null}
        player={cardsWonModalIdx !== null ? players[cardsWonModalIdx] : null}
        playerIdx={cardsWonModalIdx}
        cards={cardsWonModalIdx !== null ? cardsWonByIdx[cardsWonModalIdx] : []}
        points={cardsWonModalIdx !== null ? pointsWonByIdx[cardsWonModalIdx] : 0}
        onClose={() => setCardsWonModalIdx(null)}
      />

      <SkirmishIntroModal
        visible={showSkirmishIntro}
        skirmish={skirmish}
        players={players}
        trickWins={trickWins}
        isHumanActive={isHumanActive}
        onClose={() => setSkirmishIntroSeen(true)}
      />

      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      <View style={!activeIndices.includes(2) && styles.sitOut}>
        <MiniHand
          player={players[2]} idx={2}
          trickWins={trickWins[2]} scores={scores[2]}
          pointsWon={pointsWonByIdx[2]}
          isWinner={revealedTrick?.winner === 2}
          nextPlayId={!committedFFAPick && !revealedTrick ? aiPreviewPicks?.[2] : null}
          hideCards={hideOpponentCards}
          onPress={() => setCardsWonModalIdx(2)}
        />
      </View>

      <View style={styles.fieldRow}>
        <ElementalBackground players={players} activeIndices={activeIndices} />
        <View style={[styles.sideMini, !activeIndices.includes(1) && styles.sitOut]}>
          <MiniHand
            player={players[1]} idx={1} orientation="left"
            trickWins={trickWins[1]} scores={scores[1]}
            pointsWon={pointsWonByIdx[1]}
            isWinner={revealedTrick?.winner === 1}
            nextPlayId={!committedFFAPick && !revealedTrick ? aiPreviewPicks?.[1] : null}
            hideCards={hideOpponentCards}
            onPress={() => setCardsWonModalIdx(1)}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.fieldGrid}>
            <View style={styles.slotTop}>
              <PlayedCardSlot card={getPlayedCard(2)} winner={revealedTrick?.winner === 2} />
            </View>
            <View style={styles.slotMidRow}>
              <View style={styles.slotLeft}>
                <PlayedCardSlot card={getPlayedCard(1)} winner={revealedTrick?.winner === 1} />
              </View>
              <View style={styles.slotCenter}>
                <CenterStatus
                  humanFFAPick={humanFFAPick}
                  committedFFAPick={committedFFAPick}
                  revealedTrick={revealedTrick}
                  players={players}
                  isHumanActive={isHumanActive}
                />
              </View>
              <View style={styles.slotRight}>
                <PlayedCardSlot card={getPlayedCard(3)} winner={revealedTrick?.winner === 3} />
              </View>
            </View>
            <View style={styles.slotBottom}>
              <PlayedCardSlot card={getPlayedCard(0)} winner={revealedTrick?.winner === 0} />
            </View>
          </View>
        </View>

        <View style={[styles.sideMini, !activeIndices.includes(3) && styles.sitOut]}>
          <MiniHand
            player={players[3]} idx={3} orientation="right"
            trickWins={trickWins[3]} scores={scores[3]}
            pointsWon={pointsWonByIdx[3]}
            isWinner={revealedTrick?.winner === 3}
            nextPlayId={!committedFFAPick && !revealedTrick ? aiPreviewPicks?.[3] : null}
            hideCards={hideOpponentCards}
            onPress={() => setCardsWonModalIdx(3)}
          />
        </View>
      </View>

      <View style={[styles.handPanel, { paddingBottom: SAFE_BOTTOM }]}>
        <View style={styles.handHeader}>
          <View style={styles.handLabelRow}>
            <Text style={styles.handLabel}>You — </Text>
            <ElementIcon suit={myElement} size={12} color={ELEMENTS[myElement]?.text} />
            <Text style={[styles.handLabel, { color: ELEMENTS[myElement]?.text, fontWeight: '800' }]}>
              {' '}{ELEMENTS[myElement]?.name}
            </Text>
          </View>
          <View style={styles.handStat}>
            <Trophy size={11} color="#fff" strokeWidth={2.25} />
            <Text style={styles.handStatText}>{' '}{trickWins[0]}</Text>
          </View>
          <View style={styles.handScore}>
            <Star size={11} color="#fff" strokeWidth={2.25} />
            <Text style={styles.handStatText}>{' '}{scores[0]}</Text>
          </View>
          <Pressable
            onPress={() => setCardsWonModalIdx(0)}
            style={({ pressed }) => [styles.handPoints, pressed && styles.pressed]}
          >
            <Gem size={11} color="#fff" strokeWidth={2.25} />
            <Text style={styles.handStatText}>{' '}{pointsWonByIdx[0] ?? 0}</Text>
          </Pressable>
          {humanFFAPick && (
            <View style={styles.handLabelRow}>
              <ElementIcon suit={humanFFAPick.suit} size={12} color="#fde047" />
              <Text style={styles.handSelected}>{' '}{rankLabel(humanFFAPick.rank)}</Text>
            </View>
          )}
          {!isHumanActive && (
            <Text style={styles.sitOutLabel}>Sitting out skirmish</Text>
          )}
          <EndTurnButton
            style={styles.headerEndTurn}
            enabled={waitingForContinue ? true : canEndTurn}
            onPress={waitingForContinue ? onContinue : onEndTurn}
            label={waitingForContinue ? 'Continue' : 'End Turn'}
          />
        </View>
        <View style={styles.handCards}>
          <HandFan
            cards={human?.hand || []}
            selectedId={humanFFAPick?.id}
            disabled={!isPicking || !isHumanActive}
            onPress={card => isPicking && isHumanActive && onSelectCard(card)}
          />
        </View>
      </View>
    </View>
  );
}

function PlayedCardSlot({ card, winner }) {
  if (!card) {
    return <View style={styles.cardPlaceholder} />;
  }
  if (card.isBack) {
    return (
      <View style={styles.cardBack}>
        <Text style={styles.cardBackText}>?</Text>
      </View>
    );
  }
  return <CardDisplay card={card} small highlighted={winner} />;
}

function CenterStatus({ humanFFAPick, committedFFAPick, revealedTrick, players, isHumanActive }) {
  let text = isHumanActive ? 'Pick a card' : 'Watching...';
  let color = COLORS.textMuted;
  if (humanFFAPick && !committedFFAPick) {
    text = 'Tap End Turn'; color = COLORS.accentText;
  } else if (committedFFAPick && !revealedTrick) {
    text = 'Revealing...'; color = COLORS.accentText;
  } else if (revealedTrick) {
    text = revealedTrick.winner === 0
      ? 'You win!'
      : `${ELEMENTS[players[revealedTrick.winner]?.element]?.name}bender wins!`;
    color = COLORS.accentText;
  }
  return (
    <View style={styles.centerStatus}>
      <Text style={[styles.centerStatusText, { color }]}>{text}</Text>
    </View>
  );
}

function CardsWonModal({ visible, player, playerIdx, cards, points, onClose }) {
  if (!player) return null;
  const elem = ELEMENTS[player.element];
  const name = playerIdx === 0 ? 'You' : `${elem.name}bender`;
  const sorted = [...cards].sort(
    (a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
          <View style={styles.cwTitleRow}>
            <ElementIcon suit={player.element} size={18} color={elem.text} />
            <Text style={[styles.modalTitle, { marginLeft: 6, marginBottom: 0 }]}>
              {name} — Cards Won
            </Text>
          </View>
          <Text style={styles.modalSubtitle}>
            {sorted.length} card{sorted.length === 1 ? '' : 's'} captured this phase
          </Text>

          {sorted.length === 0 ? (
            <Text style={styles.cwEmpty}>No tricks won yet.</Text>
          ) : (
            <View style={styles.cwFanWrap}>
              <HandFan cards={sorted} disabled onPress={() => {}} />
            </View>
          )}

          <View style={styles.cwTotalRow}>
            <Gem size={14} color="#67e8f9" strokeWidth={2.25} />
            <Text style={styles.cwTotalText}>{' '}Total points: {points}</Text>
          </View>

          <View style={styles.modalButtonRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalContinue, pressed && styles.pressed]}
            >
              <Text style={styles.modalContinueText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SkirmishIntroModal({ visible, skirmish, players, trickWins, isHumanActive, onClose }) {
  if (!skirmish) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalTitleRow}>
            <Swords size={18} color="#fde047" strokeWidth={2.25} />
            <Text style={styles.modalTitle}>{' '}Skirmish!</Text>
          </View>
          <Text style={styles.modalSubtitle}>
            {skirmish.recursionLevel === 0
              ? `${skirmish.participants.length}-way tie. Tied players replay with the cards they won.`
              : `Still tied after ${skirmish.recursionLevel} round${skirmish.recursionLevel > 1 ? 's' : ''}. Going again!`}
          </Text>

          <View style={styles.tallyGrid}>
            {players.map((p, idx) => {
              const elem = ELEMENTS[p.element];
              const isParticipant = skirmish.participants.includes(idx);
              const name = idx === 0 ? 'You' : `${elem.name}bender`;
              return (
                <View
                  key={idx}
                  style={[
                    styles.tallyRow,
                    { backgroundColor: elem.bg },
                    !isParticipant && styles.tallyRowOut,
                  ]}
                >
                  <View style={styles.tallyNameRow}>
                    <ElementIcon suit={p.element} size={14} />
                    <Text style={styles.tallyName} numberOfLines={1}>
                      {' '}{name}
                    </Text>
                  </View>
                  <Text style={styles.tallyValue}>
                    {isParticipant ? `${trickWins[idx]} tricks` : 'sitting out'}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.modalNote}>
            {isHumanActive
              ? `You're playing. Each participant gets ${skirmish.totalTricks} cards — play them all to decide the King.`
              : `Tap Continue to watch it play out, or Skip to jump to the result.`}
          </Text>

          <View style={styles.modalButtonRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalContinue, pressed && styles.pressed]}
            >
              <Text style={styles.modalContinueText}>
                {isHumanActive ? "Let's play" : 'Continue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SkipFFAModal({ visible, players, onClose, onSubmit }) {
  const [values, setValues] = useState(['7', '2', '2', '2']);

  useEffect(() => {
    if (visible) setValues(['7', '2', '2', '2']);
  }, [visible]);

  function setAt(i, str) {
    const cleaned = str.replace(/[^0-9]/g, '');
    const next = [...values];
    next[i] = cleaned;
    setValues(next);
  }

  const numericValues = values.map(v => parseInt(v || '0', 10));
  const total = numericValues.reduce((a, b) => a + b, 0);
  const remaining = TOTAL_TRICKS - total;
  const canSubmit = total === TOTAL_TRICKS;

  function applyPreset(preset) {
    setValues(preset.map(n => String(n)));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Simulate End of FFA</Text>
          <Text style={styles.modalSubtitle}>
            Distribute {TOTAL_TRICKS} tricks among the players.
          </Text>

          <View style={styles.inputList}>
            {players.map((p, i) => {
              const elem = ELEMENTS[p.element];
              const name = i === 0 ? 'You' : `${elem.name}bender`;
              return (
                <View key={i} style={[styles.inputRow, { backgroundColor: elem.bg }]}>
                  <View style={styles.inputLabelRow}>
                    <ElementIcon suit={p.element} size={14} />
                    <Text style={styles.inputLabel} numberOfLines={1}>
                      {' '}{name}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={values[i]}
                    onChangeText={s => setAt(i, s)}
                    maxLength={2}
                  />
                </View>
              );
            })}
          </View>

          <Text
            style={[
              styles.tally,
              { color: total === TOTAL_TRICKS ? '#86efac' : '#fca5a5' },
            ]}
          >
            Total: {total} / {TOTAL_TRICKS}
            {remaining !== 0 && ` (${remaining > 0 ? '+' : ''}${remaining})`}
          </Text>

          <View style={styles.presetRow}>
            <PresetBtn label="Solo win" onPress={() => applyPreset([13, 0, 0, 0])} />
            <PresetBtn label="2-way tie" onPress={() => applyPreset([5, 5, 2, 1])} />
            <PresetBtn label="3-way tie" onPress={() => applyPreset([4, 4, 4, 1])} />
            <PresetBtn label="4-way tie" onPress={() => applyPreset([4, 3, 3, 3])} />
          </View>

          <View style={styles.modalButtonRow}>
            <Pressable
              onPress={() => canSubmit && onSubmit(numericValues)}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.modalContinue,
                !canSubmit && styles.modalContinueDisabled,
                pressed && canSubmit && styles.pressed,
              ]}
            >
              <Text style={styles.modalContinueText}>Continue</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PresetBtn({ label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.presetBtn, pressed && styles.pressed]}
    >
      <Text style={styles.presetBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDark, paddingHorizontal: 8 },
  toolbar: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 6,
    marginBottom: 6,
  },
  toolBtn: {
    backgroundColor: '#475569', borderColor: '#64748b', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  toolBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  debugBtn: {
    backgroundColor: '#7e22ce', borderColor: '#c084fc', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  debugBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  pressed: { opacity: 0.85 },

  messageBox: {
    backgroundColor: '#1e293bb3', borderRadius: 8, padding: 8,
    marginBottom: 8, minHeight: 36, justifyContent: 'center',
  },
  messageText: { color: '#fde68a', textAlign: 'center', fontSize: 12, fontWeight: '600' },

  fieldRow: {
    flex: 1, flexDirection: 'row', gap: 4, marginBottom: 8,
    marginHorizontal: -8, // bleed the elemental X to screen edges
    position: 'relative',
    overflow: 'hidden',
  },
  sideMini: { width: 48 },
  sitOut: { opacity: 0.3 },

  field: { flex: 1 },
  fieldGrid: { flex: 1, justifyContent: 'space-between', padding: 6 },
  slotTop: { alignItems: 'center' },
  slotBottom: { alignItems: 'center' },
  slotMidRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  slotLeft: { flex: 1, alignItems: 'flex-end', paddingRight: 4 },
  slotCenter: { flex: 1.4, alignItems: 'center', justifyContent: 'center' },
  slotRight: { flex: 1, alignItems: 'flex-start', paddingLeft: 4 },

  centerStatus: {
    backgroundColor: '#0f172ab3',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  centerStatusText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  cardBack: {
    width: 44, height: 64, borderRadius: 8,
    backgroundColor: '#5b21b6', borderColor: '#a78bfa', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBackText: { color: '#ddd6fe', fontSize: 24 },

  // Translucent dashed-border placeholder showing where each player's card will land.
  cardPlaceholder: {
    width: 44, height: 64, borderRadius: 8,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#ffffff55',
    backgroundColor: '#00000033',
  },

  handPanel: { backgroundColor: '#1e293b80', borderRadius: 12, padding: 8 },
  handHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6, flexWrap: 'wrap',
  },
  headerEndTurn: { marginLeft: 'auto' },
  handLabel: { color: COLORS.textMuted, fontSize: 11 },
  handLabelRow: { flexDirection: 'row', alignItems: 'center' },
  handStat: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  handScore: {
    backgroundColor: '#a16207cc',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  handPoints: {
    backgroundColor: '#0e7490cc',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  handStatText: { color: '#fff', fontSize: 10 },
  handSelected: { color: '#fde047', fontSize: 11, fontWeight: '700' },
  sitOutLabel: { color: COLORS.textDim, fontSize: 11, fontStyle: 'italic' },
  handCards: { paddingTop: 4 },

  modalBackdrop: {
    flex: 1, backgroundColor: '#000000b3',
    justifyContent: 'center', paddingHorizontal: 16,
  },
  modalSheet: {
    backgroundColor: '#0f172a', borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 14, padding: 14,
  },
  modalTitle: { color: '#fde047', fontWeight: '800', fontSize: 18, marginBottom: 4, textAlign: 'center' },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  modalNote: { color: COLORS.textMuted, fontSize: 11, marginVertical: 10, textAlign: 'center' },

  cwTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  cwEmpty: {
    color: COLORS.textDim, fontSize: 12, textAlign: 'center',
    paddingVertical: 18, fontStyle: 'italic',
  },
  cwFanWrap: { alignItems: 'center', paddingVertical: 8 },
  cwTotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0e7490cc', borderRadius: 8,
    paddingVertical: 8, marginTop: 12, marginBottom: 4,
  },
  cwTotalText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  tallyGrid: { gap: 6 },
  tallyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  tallyRowOut: { opacity: 0.4 },
  tallyNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  tallyName: { color: '#fff', fontWeight: '800', fontSize: 13, flexShrink: 1 },
  tallyValue: { color: '#fff', fontWeight: '700', fontSize: 12 },

  inputList: { gap: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  inputLabel: { color: '#fff', fontWeight: '800', fontSize: 13, flexShrink: 1 },
  input: {
    backgroundColor: '#0f172a',
    color: '#fff',
    width: 60,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },

  tally: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },

  presetRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  presetBtn: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  presetBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  modalButtonRow: { flexDirection: 'row', gap: 8 },
  modalContinue: {
    flex: 1,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalContinueDisabled: { backgroundColor: '#475569', opacity: 0.5 },
  modalContinueText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalCancel: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
