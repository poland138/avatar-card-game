import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ELEMENTS, REBELLION_DUELS, COLORS } from './constants';
import { rankLabel } from './deck';
import { SAFE_TOP, SAFE_BOTTOM } from './safeArea';
import CardDisplay from './CardDisplay';
import MiniHand from './MiniHand';
import RebellionBackground from './RebellionBackground';
import DiscardPile from './DiscardPile';
import HintButton from './HintButton';
import EndTurnButton from './EndTurnButton';
import HandFan from './HandFan';

function getSeating({ kingIdx, isKingHuman, rebelOrder }) {
  if (kingIdx === null || rebelOrder.length !== 3) {
    return { topIdx: null, leftIdx: null, rightIdx: null };
  }
  if (isKingHuman) {
    return { topIdx: rebelOrder[1], leftIdx: rebelOrder[0], rightIdx: rebelOrder[2] };
  }
  const others = rebelOrder.filter(i => i !== 0);
  return { topIdx: kingIdx, leftIdx: others[0], rightIdx: others[1] };
}

export default function RebellionView({
  players,
  kingIdx,
  rebelOrder,
  kingLanes,
  rebelResponses,
  laneOutcomes,
  duelWins,
  duelNumber,
  scores,
  message,
  animating,
  selectedKingCards,
  setSelectedKingCards,
  onCommitKingCards,
  humanRebelSelection,
  onSelectRebelCard,
  onEndRebelTurn,
  rebellionStage,
  phase,
  onRestart,
  discardPile,
  waitingForContinue,
  onContinue,
  onSkipToGameOver,
  onReturnToFFA,
}) {
  const human = players[0];
  const myElement = human?.element;
  const isKingHuman = kingIdx === 0;
  const humanLaneIdx = rebelOrder.indexOf(0);
  const isWaitingForKingHuman =
    isKingHuman && rebellionStage === 'king-choosing' && !animating && !waitingForContinue;
  const isWaitingForHumanRebel =
    !isKingHuman &&
    humanLaneIdx >= 0 &&
    rebellionStage === 'rebels-responding' &&
    !rebelResponses[humanLaneIdx] &&
    !animating &&
    !waitingForContinue;

  const [selectedHandCard, setSelectedHandCard] = useState(null);
  const [hideOpponentCards, setHideOpponentCards] = useState(false);

  const { topIdx, leftIdx, rightIdx } = getSeating({ kingIdx, isKingHuman, rebelOrder });

  function tapHandCard(card) {
    if (!isWaitingForKingHuman) return;
    if (selectedHandCard?.id === card.id) setSelectedHandCard(null);
    else setSelectedHandCard(card);
  }

  function tapLaneSlot(laneIdx) {
    if (!isWaitingForKingHuman || !selectedHandCard) return;
    const newSelected = [...selectedKingCards];
    for (let i = 0; i < 3; i++) {
      if (newSelected[i]?.id === selectedHandCard.id) newSelected[i] = null;
    }
    newSelected[laneIdx] = selectedHandCard;
    setSelectedKingCards(newSelected);
    setSelectedHandCard(null);
  }

  function clearLane(laneIdx) {
    const newSelected = [...selectedKingCards];
    newSelected[laneIdx] = null;
    setSelectedKingCards(newSelected);
  }

  function commitSelected() {
    if (selectedKingCards.filter(c => c).length === 3) {
      onCommitKingCards(selectedKingCards);
      setSelectedHandCard(null);
    }
  }

  const allSelected = selectedKingCards.filter(c => c).length === 3;
  const usedIds = selectedKingCards.filter(c => c).map(c => c.id);
  const canEndTurn = (isWaitingForKingHuman && allSelected) || (isWaitingForHumanRebel && humanRebelSelection);
  const endTurnLabel = isWaitingForKingHuman ? 'Launch Attack' : 'Defend';
  const endTurnAction = isWaitingForKingHuman ? commitSelected : onEndRebelTurn;

  const kingSection = (
    <KingAttacksSection
      labelPosition={isKingHuman ? 'bottom' : 'top'}
      kingLanes={kingLanes}
      laneOutcomes={laneOutcomes}
      selectedKingCards={selectedKingCards}
      onLaneTap={tapLaneSlot}
      onClearLane={clearLane}
      isWaitingForKingHuman={isWaitingForKingHuman}
      selectedHandCard={selectedHandCard}
    />
  );
  const rebelSection = (
    <RebelDefensesSection
      labelPosition={isKingHuman ? 'top' : 'bottom'}
      players={players}
      rebelOrder={rebelOrder}
      rebelResponses={rebelResponses}
      laneOutcomes={laneOutcomes}
      kingLanes={kingLanes}
      humanRebelSelection={humanRebelSelection}
      isWaitingForHumanRebel={isWaitingForHumanRebel}
    />
  );
  const vsRow = <VsRow laneOutcomes={laneOutcomes} />;

  return (
    <View style={[styles.root, { paddingTop: SAFE_TOP + 8 }]}>
      <View style={styles.toolbar}>
        <DiscardPile
          discardPile={discardPile}
          players={players}
          rebelOrder={rebelOrder}
          kingIdx={kingIdx}
        />
        <HintButton />
        <Pressable
          onPress={() => setHideOpponentCards(v => !v)}
          style={({ pressed }) => [styles.toolBtn, pressed && styles.pressed]}
        >
          <Text style={styles.toolBtnText}>{hideOpponentCards ? '👁️' : '🙈'}</Text>
        </Pressable>
        {onReturnToFFA && (
          <Pressable
            onPress={onReturnToFFA}
            style={({ pressed }) => [styles.debugBtn, pressed && styles.pressed]}
          >
            <Text style={styles.debugBtnText}>🐛 FFA</Text>
          </Pressable>
        )}
        {onSkipToGameOver && (
          <Pressable
            onPress={onSkipToGameOver}
            style={({ pressed }) => [styles.debugBtn, pressed && styles.pressed]}
          >
            <Text style={styles.debugBtnText}>🐛 GG</Text>
          </Pressable>
        )}
      </View>

      <EndTurnButton
        enabled={waitingForContinue ? true : canEndTurn}
        onPress={waitingForContinue ? onContinue : endTurnAction}
        label={waitingForContinue ? 'Continue' : endTurnLabel}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Avatar: KotH</Text>
        <Text style={styles.subtitle}>👑 Duel {duelNumber}/{REBELLION_DUELS}</Text>
      </View>

      <ScoreStrip players={players} kingIdx={kingIdx} scores={scores} />
      <DuelTally duelWins={duelWins} />

      <View style={styles.messageBox}>
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {topIdx !== null && (
        <View style={styles.topOpponentRow}>
          <MiniHand
            player={players[topIdx]} idx={topIdx}
            scores={scores[topIdx]} kingIdx={kingIdx}
            hideCards={hideOpponentCards}
          />
        </View>
      )}

      <View style={styles.fieldRow}>
        <View style={styles.sideMini}>
          {leftIdx !== null && (
            <MiniHand
              player={players[leftIdx]} idx={leftIdx} orientation="left"
              scores={scores[leftIdx]} kingIdx={kingIdx}
              hideCards={hideOpponentCards}
            />
          )}
        </View>

        <View style={styles.field}>
          <RebellionBackground
            players={players} kingIdx={kingIdx}
            rebelOrder={rebelOrder} isKingHuman={isKingHuman}
          />
          <View style={styles.fieldInner}>
            {isKingHuman ? (
              <>{rebelSection}{vsRow}{kingSection}</>
            ) : (
              <>{kingSection}{vsRow}{rebelSection}</>
            )}
          </View>
        </View>

        <View style={styles.sideMini}>
          {rightIdx !== null && (
            <MiniHand
              player={players[rightIdx]} idx={rightIdx} orientation="right"
              scores={scores[rightIdx]} kingIdx={kingIdx}
              hideCards={hideOpponentCards}
            />
          )}
        </View>
      </View>

      {phase === 'rebellion' && (
        <PlayerHand
          human={human} myElement={myElement} isKingHuman={isKingHuman}
          isWaitingForKingHuman={isWaitingForKingHuman}
          isWaitingForHumanRebel={isWaitingForHumanRebel}
          selectedKingCards={selectedKingCards}
          usedIds={usedIds}
          selectedHandCard={selectedHandCard}
          onTapHandCard={tapHandCard}
          humanRebelSelection={humanRebelSelection}
          onSelectRebelCard={onSelectRebelCard}
        />
      )}

      {phase === 'gameover' && (
        <View style={[styles.gameoverPanel, { paddingBottom: SAFE_BOTTOM + 24 }]}>
          <Pressable
            onPress={onRestart}
            style={({ pressed }) => [styles.restartBtn, pressed && styles.pressed]}
          >
            <Text style={styles.restartText}>New Run</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ScoreStrip({ players, kingIdx, scores }) {
  return (
    <View style={styles.scoreStrip}>
      {players.map((p, idx) => {
        const elem = ELEMENTS[p.element];
        const isKing = kingIdx === idx;
        const displayName = idx === 0 ? 'You' : `${elem.name}bender`;
        return (
          <View
            key={idx}
            style={[styles.scoreTile, { backgroundColor: elem.bg }, isKing && styles.scoreTileKing]}
          >
            <Text style={styles.scoreName} numberOfLines={1}>
              {isKing ? '👑 ' : ''}{elem.symbol} {displayName}
            </Text>
            <Text style={styles.scoreValue}>⭐ {scores[idx]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function DuelTally({ duelWins }) {
  return (
    <View style={styles.duelTally}>
      <Text style={styles.duelKing}>👑 King: {duelWins.king}</Text>
      <Text style={styles.duelVs}>⚔️</Text>
      <Text style={styles.duelRebel}>Rebellion: {duelWins.rebellion}</Text>
      <Text style={styles.duelHint}>(first to 4)</Text>
    </View>
  );
}

function VsRow({ laneOutcomes }) {
  return (
    <View style={styles.vsRow}>
      {[0, 1, 2].map(laneIdx => {
        const outcome = laneOutcomes[laneIdx];
        let text = 'VS';
        let color = COLORS.textDim;
        if (outcome === 'king')  { text = '👑 King';   color = '#fde047'; }
        if (outcome === 'rebel') { text = '⚔️ Rebel';  color = '#fca5a5'; }
        if (outcome === 'draw')  { text = '⚖️ Draw';    color = '#c084fc'; }
        return <Text key={laneIdx} style={[styles.vsText, { color }]}>{text}</Text>;
      })}
    </View>
  );
}

function KingAttacksSection({
  labelPosition, kingLanes, laneOutcomes,
  selectedKingCards, onLaneTap, onClearLane,
  isWaitingForKingHuman, selectedHandCard,
}) {
  const label = <Text style={styles.sectionLabelKing}>👑 King's Attacks</Text>;
  const grid = (
    <View style={styles.laneGrid}>
      {[0, 1, 2].map(laneIdx => {
        const kingCard = kingLanes[laneIdx];
        const outcome = laneOutcomes[laneIdx];
        const selectedKingCard = selectedKingCards[laneIdx];
        const isHotSlot = isWaitingForKingHuman && selectedHandCard && !kingCard;
        return (
          <Pressable
            key={laneIdx}
            onPress={() => {
              if (kingCard) return;
              if (selectedKingCard) onClearLane(laneIdx);
              else if (isWaitingForKingHuman && selectedHandCard) onLaneTap(laneIdx);
            }}
            style={[styles.lane, outcomeBorder(outcome), isHotSlot && styles.laneHot]}
          >
            <View style={styles.laneContent}>
              {kingCard ? (
                <CardDisplay card={kingCard} highlighted={outcome === 'king'} />
              ) : selectedKingCard ? (
                <CardDisplay card={selectedKingCard} highlighted />
              ) : (
                <View
                  style={[
                    styles.lanePlaceholder,
                    isHotSlot && styles.lanePlaceholderActive,
                    isWaitingForKingHuman && !selectedHandCard && styles.lanePlaceholderHint,
                  ]}
                >
                  <Text style={styles.lanePlaceholderText}>
                    {isHotSlot ? 'Tap' : (isWaitingForKingHuman ? '+' : '...')}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={styles.section}>
      {labelPosition === 'top' && label}
      {grid}
      {labelPosition === 'bottom' && label}
    </View>
  );
}

function RebelDefensesSection({
  labelPosition, players, rebelOrder, rebelResponses,
  laneOutcomes, kingLanes, humanRebelSelection, isWaitingForHumanRebel,
}) {
  const label = <Text style={styles.sectionLabelRebel}>⚔️ Rebellion's Defense</Text>;
  const grid = (
    <View style={styles.laneGrid}>
      {rebelOrder.map((rebelIdx, laneIdx) => {
        const rebel = players[rebelIdx];
        const elem = ELEMENTS[rebel.element];
        const displayName = rebelIdx === 0 ? 'You' : `${elem.name}bender`;
        const rebelCard = rebelResponses[laneIdx];
        const outcome = laneOutcomes[laneIdx];
        const isHumanLane = rebelIdx === 0;
        const isSelectedHuman = isHumanLane && humanRebelSelection && !rebelCard;
        const kingCard = kingLanes[laneIdx];
        return (
          <View key={laneIdx} style={[styles.lane, outcomeBorder(outcome)]}>
            <Text style={[styles.rebelName, { color: elem.text }]} numberOfLines={1}>
              {elem.symbol} {displayName}
              {isHumanLane && isWaitingForHumanRebel ? ' (Defend!)' : ''}
            </Text>
            <View style={styles.laneContent}>
              {rebelCard ? (
                <CardDisplay card={rebelCard.card} highlighted={outcome === 'rebel'} />
              ) : isSelectedHuman ? (
                <CardDisplay card={humanRebelSelection} highlighted />
              ) : (
                <View
                  style={[
                    styles.lanePlaceholder,
                    isWaitingForHumanRebel && isHumanLane && styles.lanePlaceholderActive,
                  ]}
                >
                  <Text style={styles.lanePlaceholderText}>{kingCard ? '?' : '...'}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={styles.section}>
      {labelPosition === 'top' && label}
      {grid}
      {labelPosition === 'bottom' && label}
    </View>
  );
}

function PlayerHand({
  human, myElement, isKingHuman,
  isWaitingForKingHuman, isWaitingForHumanRebel,
  selectedKingCards, usedIds, selectedHandCard,
  onTapHandCard, humanRebelSelection, onSelectRebelCard,
}) {
  return (
    <View style={[styles.handPanel, { paddingBottom: SAFE_BOTTOM + 56 }]}>
      {isKingHuman ? (
        <>
          <View style={styles.handHeader}>
            <Text style={styles.handLabel}>
              King 👑 <Text style={{ color: ELEMENTS[myElement]?.text, fontWeight: '800' }}>
                {ELEMENTS[myElement]?.symbol} {ELEMENTS[myElement]?.name}
              </Text>
            </Text>
            {isWaitingForKingHuman && (
              <Text style={styles.handSelected}>
                {selectedHandCard
                  ? 'Tap a lane to place'
                  : `Pick a card (${selectedKingCards.filter(c => c).length}/3 placed)`}
              </Text>
            )}
          </View>
          <HandFan
            cards={human?.hand || []}
            selectedId={selectedHandCard?.id}
            disabled={!isWaitingForKingHuman}
            dimIds={usedIds}
            onPress={card => {
              const isUsed = usedIds.includes(card.id);
              if (!isUsed) onTapHandCard(card);
            }}
          />
        </>
      ) : (
        <>
          <View style={styles.handHeader}>
            <Text style={styles.handLabel}>
              Rebel <Text style={{ color: ELEMENTS[myElement]?.text, fontWeight: '800' }}>
                {ELEMENTS[myElement]?.symbol} {ELEMENTS[myElement]?.name}
              </Text>
            </Text>
            {humanRebelSelection && (
              <Text style={styles.handSelected}>
                {ELEMENTS[humanRebelSelection.suit].symbol} {rankLabel(humanRebelSelection.rank)}
              </Text>
            )}
            {!isWaitingForHumanRebel && <Text style={styles.waitingHint}>Waiting...</Text>}
          </View>
          <HandFan
            cards={human?.hand || []}
            selectedId={humanRebelSelection?.id}
            disabled={!isWaitingForHumanRebel}
            onPress={card => onSelectRebelCard(card)}
          />
        </>
      )}
    </View>
  );
}

function outcomeBorder(outcome) {
  if (outcome === 'king')  return { borderColor: '#facc15' };
  if (outcome === 'rebel') return { borderColor: '#f87171' };
  if (outcome === 'draw')  return { borderColor: '#c084fc' };
  return { borderColor: COLORS.borderDim };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bgDark, paddingHorizontal: 8 },
  toolbar: {
    flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap',
    gap: 6, marginBottom: 6,
  },
  toolBtn: {
    backgroundColor: '#475569', borderColor: '#64748b', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
  },
  toolBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  debugBtn: {
    backgroundColor: '#7e22ce', borderColor: '#c084fc', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
  },
  debugBtnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  pressed: { opacity: 0.85 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  title: { color: '#fde047', fontWeight: '800', fontSize: 16 },
  subtitle: { color: COLORS.textMuted, fontSize: 11 },

  scoreStrip: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  scoreTile: {
    flex: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  scoreTileKing: { borderColor: '#facc15', borderWidth: 2 },
  scoreName: { color: '#fff', fontWeight: '800', fontSize: 10, flex: 1 },
  scoreValue: {
    color: '#fff', fontSize: 10, backgroundColor: '#0f172a99',
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, overflow: 'hidden',
  },

  duelTally: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b99', borderRadius: 8, padding: 6, marginBottom: 6,
  },
  duelKing:  { color: '#fde047', fontWeight: '800', fontSize: 13 },
  duelVs:    { color: COLORS.textDim, fontSize: 14 },
  duelRebel: { color: '#fca5a5', fontWeight: '800', fontSize: 13 },
  duelHint:  { color: COLORS.textDim, fontSize: 10 },

  messageBox: {
    backgroundColor: '#1e293bb3', borderRadius: 8, padding: 8,
    marginBottom: 8, minHeight: 36, justifyContent: 'center',
  },
  messageText: { color: '#fde68a', textAlign: 'center', fontSize: 12, fontWeight: '600' },

  topOpponentRow: { alignItems: 'center', marginBottom: 6 },

  fieldRow: { flex: 1, flexDirection: 'row', gap: 4, marginBottom: 8 },
  sideMini: { width: 48 },
  field: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.bgDark },
  fieldInner: { flex: 1, padding: 8, justifyContent: 'space-between' },

  section: { width: '100%' },
  sectionLabelKing:  { textAlign: 'center', color: '#fde047', fontWeight: '800', fontSize: 11, marginVertical: 4 },
  sectionLabelRebel: { textAlign: 'center', color: '#fca5a5', fontWeight: '800', fontSize: 11, marginVertical: 4 },

  laneGrid: { flexDirection: 'row', gap: 6 },
  lane: {
    flex: 1, minHeight: 110,
    backgroundColor: '#0f172ab3', borderRadius: 10, borderWidth: 2,
    padding: 6, flexDirection: 'column', alignItems: 'stretch',
  },
  laneHot: { borderColor: '#facc15' },
  laneContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lanePlaceholder: {
    width: 50, height: 76, borderRadius: 8, borderWidth: 2,
    borderColor: COLORS.borderDim, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  lanePlaceholderActive: { borderColor: '#facc15', backgroundColor: '#facc1520' },
  lanePlaceholderHint:   { borderColor: '#64748b' },
  lanePlaceholderText: { color: COLORS.textDim, fontSize: 14, fontWeight: '700' },

  rebelName: { textAlign: 'center', fontSize: 10, fontWeight: '800', marginBottom: 4 },

  vsRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  vsText: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 11 },

  handPanel: { backgroundColor: '#1e293b80', borderRadius: 12, padding: 8 },
  handHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6, flexWrap: 'wrap',
  },
  handLabel: { color: COLORS.textMuted, fontSize: 11 },
  handSelected: { color: '#fde047', fontSize: 11, fontWeight: '700' },
  waitingHint: { color: COLORS.textDim, fontSize: 11, marginLeft: 'auto' },

  gameoverPanel: { alignItems: 'center', paddingTop: 16 },
  restartBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  restartText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});