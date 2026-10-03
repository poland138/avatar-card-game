import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ELEMENTS, COLORS } from './constants';
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

  const kingHalf = (
    <KingHalfRow
      kingMini={!isKingHuman && kingIdx !== null ? (
        <MiniHand
          player={players[kingIdx]} idx={kingIdx}
          scores={scores[kingIdx]} kingIdx={kingIdx}
          hideCards={hideOpponentCards}
        />
      ) : null}
      kingLanes={kingLanes}
      laneOutcomes={laneOutcomes}
      selectedKingCards={selectedKingCards}
      onLaneTap={tapLaneSlot}
      onClearLane={clearLane}
      isWaitingForKingHuman={isWaitingForKingHuman}
      selectedHandCard={selectedHandCard}
    />
  );
  const rebelStrips = (
    <RebelStripRow
      miniPosition={isKingHuman ? 'top' : 'bottom'}
      players={players}
      rebelOrder={rebelOrder}
      scores={scores}
      kingIdx={kingIdx}
      hideOpponentCards={hideOpponentCards}
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

      <DuelTally duelWins={duelWins} />

      {kingIdx !== null && (
        <View style={styles.battlefield}>
          <RebellionBackground
            players={players} kingIdx={kingIdx}
            rebelOrder={rebelOrder} isKingHuman={isKingHuman}
          />
          <View style={styles.battlefieldInner}>
            {isKingHuman ? (
              <>{rebelStrips}{vsRow}{kingHalf}</>
            ) : (
              <>{kingHalf}{vsRow}{rebelStrips}</>
            )}
          </View>
        </View>
      )}

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
          waitingForContinue={waitingForContinue}
          canEndTurn={canEndTurn}
          endTurnLabel={endTurnLabel}
          endTurnAction={endTurnAction}
          onContinue={onContinue}
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

function KingHalfRow({
  kingMini, kingLanes, laneOutcomes,
  selectedKingCards, onLaneTap, onClearLane,
  isWaitingForKingHuman, selectedHandCard,
}) {
  return (
    <View style={styles.kingHalf}>
      {kingMini && <View style={styles.kingMiniWrap}>{kingMini}</View>}
      <View style={styles.kingAttackRow}>
        {[0, 1, 2].map(laneIdx => (
          <KingAttackSlot
            key={laneIdx}
            laneIdx={laneIdx}
            kingCard={kingLanes[laneIdx]}
            outcome={laneOutcomes[laneIdx]}
            selectedKingCard={selectedKingCards[laneIdx]}
            isWaitingForKingHuman={isWaitingForKingHuman}
            selectedHandCard={selectedHandCard}
            onLaneTap={onLaneTap}
            onClearLane={onClearLane}
          />
        ))}
      </View>
    </View>
  );
}

function KingAttackSlot({
  laneIdx, kingCard, outcome, selectedKingCard,
  isWaitingForKingHuman, selectedHandCard, onLaneTap, onClearLane,
}) {
  const isHotSlot = isWaitingForKingHuman && selectedHandCard && !kingCard;
  return (
    <Pressable
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
}

function RebelStripRow({
  miniPosition, players, rebelOrder, scores, kingIdx, hideOpponentCards,
  rebelResponses, laneOutcomes, kingLanes,
  humanRebelSelection, isWaitingForHumanRebel,
}) {
  return (
    <View style={styles.zoneStrips}>
      {rebelOrder.map((rebelIdx, laneIdx) => {
        const rebel = players[rebelIdx];
        const showMini = rebelIdx !== 0;
        const mini = showMini ? (
          <MiniHand
            player={rebel} idx={rebelIdx}
            scores={scores[rebelIdx]} kingIdx={kingIdx}
            hideCards={hideOpponentCards}
          />
        ) : null;
        return (
          <View key={laneIdx} style={styles.zoneStripCol}>
            {miniPosition === 'top' && mini}
            <RebelDefenseSlot
              laneIdx={laneIdx}
              rebelIdx={rebelIdx}
              rebelCard={rebelResponses[laneIdx]}
              outcome={laneOutcomes[laneIdx]}
              kingCard={kingLanes[laneIdx]}
              humanRebelSelection={humanRebelSelection}
              isWaitingForHumanRebel={isWaitingForHumanRebel}
            />
            {miniPosition === 'bottom' && mini && (
              <View style={styles.zoneStripColBottomMini}>{mini}</View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function RebelDefenseSlot({
  rebelIdx, rebelCard, outcome, kingCard,
  humanRebelSelection, isWaitingForHumanRebel,
}) {
  const isHumanLane = rebelIdx === 0;
  const isSelectedHuman = isHumanLane && humanRebelSelection && !rebelCard;
  return (
    <View style={[styles.lane, outcomeBorder(outcome)]}>
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
}

function PlayerHand({
  human, myElement, isKingHuman,
  isWaitingForKingHuman, isWaitingForHumanRebel,
  selectedKingCards, usedIds, selectedHandCard,
  onTapHandCard, humanRebelSelection, onSelectRebelCard,
  waitingForContinue, canEndTurn, endTurnLabel, endTurnAction, onContinue,
}) {
  const endTurn = (
    <EndTurnButton
      style={styles.headerEndTurn}
      enabled={waitingForContinue ? true : canEndTurn}
      onPress={waitingForContinue ? onContinue : endTurnAction}
      label={waitingForContinue ? 'Continue' : endTurnLabel}
    />
  );

  return (
    <View style={[styles.handPanel, { paddingBottom: SAFE_BOTTOM }]}>
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
            {endTurn}
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
            {endTurn}
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
  if (outcome === 'king')  return styles.laneOutcomeKing;
  if (outcome === 'rebel') return styles.laneOutcomeRebel;
  if (outcome === 'draw')  return styles.laneOutcomeDraw;
  return null;
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

  duelTally: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b99', borderRadius: 8, padding: 6, marginBottom: 6,
  },
  duelKing:  { color: '#fde047', fontWeight: '800', fontSize: 13 },
  duelVs:    { color: COLORS.textDim, fontSize: 14 },
  duelRebel: { color: '#fca5a5', fontWeight: '800', fontSize: 13 },
  duelHint:  { color: COLORS.textDim, fontSize: 10 },

  battlefield: {
    flex: 1, marginBottom: 8,
    marginHorizontal: -8,
    position: 'relative',
    overflow: 'hidden',
  },
  battlefieldInner: { flex: 1, justifyContent: 'space-between' },

  zoneStrips: { flex: 1, flexDirection: 'row' },
  zoneStripCol: { flex: 1, alignItems: 'center', padding: 6 },
  zoneStripColBottomMini: { marginTop: 'auto' },

  kingHalf: {
    flex: 1, padding: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  kingMiniWrap: { marginBottom: 6 },
  kingAttackRow: {
    flexDirection: 'row', gap: 6,
    alignSelf: 'stretch',
  },

  lane: {
    flex: 1, minHeight: 110,
    padding: 6, flexDirection: 'column', alignItems: 'stretch',
    borderRadius: 10,
  },
  laneHot: { borderWidth: 2, borderColor: '#facc15' },
  laneOutcomeKing:  { borderWidth: 2, borderColor: '#facc15' },
  laneOutcomeRebel: { borderWidth: 2, borderColor: '#f87171' },
  laneOutcomeDraw:  { borderWidth: 2, borderColor: '#c084fc' },
  laneContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lanePlaceholder: {
    width: 50, height: 76, borderRadius: 8, borderWidth: 2,
    borderColor: COLORS.borderDim, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  lanePlaceholderActive: { borderColor: '#facc15', backgroundColor: '#facc1520' },
  lanePlaceholderHint:   { borderColor: '#64748b' },
  lanePlaceholderText: { color: COLORS.textDim, fontSize: 14, fontWeight: '700' },

  vsRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  vsText: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 11 },

  handPanel: { backgroundColor: '#1e293b80', borderRadius: 12, padding: 8 },
  handHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 6, flexWrap: 'wrap',
  },
  headerEndTurn: { marginLeft: 'auto' },
  handLabel: { color: COLORS.textMuted, fontSize: 11 },
  handSelected: { color: '#fde047', fontSize: 11, fontWeight: '700' },
  waitingHint: { color: COLORS.textDim, fontSize: 11 },

  gameoverPanel: { alignItems: 'center', paddingTop: 16 },
  restartBtn: {
    backgroundColor: '#ea580c',
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12,
  },
  restartText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});