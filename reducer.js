import { ELEMENTS, TARGET_SCORE, REBELLION_DUELS, XP_PER_RUN } from './constants';
import { rankLabel, sortHand } from './deck';
import { simultaneousWinner, resolveLane } from './rules';
import { aiPlayFFASimultaneous, aiRebelPlay } from './ai';
import {
  XP_PER_KING_WIN,
  initialState as baseInitialState,
  makeFFAPlayers,
  dealFFAHands,
  dealRebellionHands,
  kingDisplayName,
  clearRebellionFields,
} from './reducerHelpers';

export const initialState = { ...baseInitialState, skirmish: null };

export function getCardsWonBy(discardPile, playerIdx) {
  const byTrick = {};
  for (const entry of discardPile) {
    if (entry.phase !== 'FFA' && entry.phase !== 'Skirmish') continue;
    if (!byTrick[entry.label]) byTrick[entry.label] = { entries: [], winnerIdx: null };
    byTrick[entry.label].entries.push(entry);
    if (entry.isWinner) byTrick[entry.label].winnerIdx = entry.playerIdx;
  }
  const cards = [];
  for (const trick of Object.values(byTrick)) {
    if (trick.winnerIdx === playerIdx) {
      for (const e of trick.entries) cards.push({ ...e.card });
    }
  }
  return cards;
}

function buildSkirmishState(state, participants, handsByIdx, savedScores, recursionLevel) {
  const totalTricks = handsByIdx[participants[0]].length;
  // The human (idx 0) needs their hand sorted suit-then-rank so the
  // hand-fan UI looks the same as during regular FFA. AI hands are left
  // unsorted — the AI doesn't care and unsorted is fine for sit-out players.
  const newPlayers = state.players.map((p, i) => {
    if (!participants.includes(i)) return { ...p, hand: [] };
    const rawHand = handsByIdx[i];
    return { ...p, hand: i === 0 ? sortHand(rawHand) : rawHand };
  });
  return {
    ...state,
    players: newPlayers,
    trickWins: [0, 0, 0, 0],
    humanFFAPick: null,
    committedFFAPick: null,
    revealedTrick: null,
    trickNumber: 1,
    discardPile: [],
    aiPreviewPicks: {},
    waitingForContinue: false,
    pendingResolution: null,
    pendingAckReveal: false,
    animating: false,
    skirmish: { participants, savedScores, totalTricks, recursionLevel },
    phase: 'freeforall',
    message: recursionLevel === 0
      ? `Skirmish! ${participants.length}-way tiebreak. Play it out.`
      : `Still tied! Re-skirmish (round ${recursionLevel + 1}).`,
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_XP':
      return { ...state, xp: action.xp };

    case 'SELECT_ELEMENT':
      return { ...state, chosenElement: action.element, phase: 'upgrades' };

    case 'BACK_TO_SELECT':
      return { ...state, chosenElement: null, phase: 'element-select' };

    case 'START_GAME': {
      const players = makeFFAPlayers(state.chosenElement);
      return {
        ...state,
        players,
        trickWins: [0, 0, 0, 0],
        scores: [0, 0, 0, 0],
        kingIdx: null,
        kingStreak: 0,
        humanFFAPick: null,
        committedFFAPick: null,
        revealedTrick: null,
        trickNumber: 1,
        discardPile: [],
        skirmish: null,
        phase: 'freeforall',
        message: 'Free-for-all! Tap a card to select, then End Turn to reveal.',
      };
    }

    case 'RESTART':
      return { ...initialState, xp: state.xp };

    case 'SET_AI_PREVIEW_PICKS':
      return { ...state, aiPreviewPicks: action.picks };

    case 'SELECT_FFA_CARD':
      return { ...state, humanFFAPick: action.card };

    case 'COMMIT_FFA_TURN': {
      const humanCard = state.humanFFAPick;
      const isHumanActive = state.skirmish ? state.skirmish.participants.includes(0) : true;
      if (isHumanActive && !humanCard) return state;

      const activeIndices = state.skirmish ? state.skirmish.participants : [0, 1, 2, 3];
      const aiPicks = [];
      const newPlayers = state.players.map((p, i) => {
        if (!activeIndices.includes(i)) return p;
        if (i === 0 && isHumanActive) {
          return { ...p, hand: p.hand.filter(c => c.id !== humanCard.id) };
        }
        let card = p.hand.find(c => c.id === state.aiPreviewPicks[i]);
        if (!card) card = aiPlayFFASimultaneous(p.hand, p.element);
        aiPicks.push({ playerIdx: i, card });
        return { ...p, hand: p.hand.filter(c => c.id !== card.id) };
      });

      const allPlays = [];
      if (isHumanActive) allPlays.push({ playerIdx: 0, card: humanCard });
      allPlays.push(...aiPicks);

      const winnerIdx = simultaneousWinner(allPlays, newPlayers);
      const phaseLabel = state.skirmish ? 'Skirmish' : 'FFA';
      const trickLabel = state.skirmish
        ? `S${state.skirmish.recursionLevel + 1}T${state.trickNumber}`
        : `T${state.trickNumber}`;
      const newDiscards = allPlays.map(p => ({
        card: p.card,
        playerIdx: p.playerIdx,
        phase: phaseLabel,
        label: trickLabel,
        isWinner: p.playerIdx === winnerIdx,
      }));
      const newWins = [...state.trickWins];
      newWins[winnerIdx]++;

      return {
        ...state,
        players: newPlayers,
        trickWins: newWins,
        humanFFAPick: null,
        committedFFAPick: humanCard || aiPicks[0]?.card || null,
        revealedTrick: { plays: allPlays, winner: winnerIdx },
        discardPile: [...state.discardPile, ...newDiscards],
        animating: true,
        pendingAckReveal: true,
      };
    }

    case 'ACK_FFA_REVEAL':
      return {
        ...state,
        pendingAckReveal: false,
        waitingForContinue: true,
        pendingResolution: { type: 'POST_FFA_TRICK' },
      };

    case 'SET_SELECTED_KING_CARDS':
      return { ...state, selectedKingCards: action.cards };

    case 'COMMIT_KING_CARDS': {
      const cardsByLane = action.cards;
      if (!cardsByLane || cardsByLane.some(c => !c)) return state;
      const usedIds = cardsByLane.map(c => c.id);
      const newPlayers = state.players.map((p, i) =>
        i === state.kingIdx ? { ...p, hand: p.hand.filter(c => !usedIds.includes(c.id)) } : p
      );
      const isKingHuman = state.kingIdx === 0;
      const humanLaneIdx = state.rebelOrder.indexOf(0);
      const message = humanLaneIdx >= 0
        ? `King attacked! Choose your defense card. King's attack on you: ${ELEMENTS[cardsByLane[humanLaneIdx].suit].name} ${rankLabel(cardsByLane[humanLaneIdx].rank)}`
        : 'Rebels are choosing defenses simultaneously...';
      return {
        ...state,
        players: newPlayers,
        kingLanes: cardsByLane,
        selectedKingCards: [null, null, null],
        rebellionStage: 'rebels-responding',
        humanRebelSelection: null,
        pendingAiRebels: isKingHuman,
        message,
      };
    }

    case 'SELECT_REBEL_CARD':
      return { ...state, humanRebelSelection: action.card };

    case 'COMMIT_REBEL_TURN': {
      const humanLaneIdx = state.rebelOrder.indexOf(0);
      if (humanLaneIdx < 0 || !state.humanRebelSelection) return state;
      const responses = [...state.rebelResponses];
      const updatedPlayers = [...state.players];
      const kingElement = updatedPlayers[state.kingIdx].element;
      responses[humanLaneIdx] = { card: state.humanRebelSelection, playerIdx: 0 };
      updatedPlayers[0] = {
        ...updatedPlayers[0],
        hand: updatedPlayers[0].hand.filter(c => c.id !== state.humanRebelSelection.id),
      };
      state.rebelOrder.forEach((rebelIdx, laneIdx) => {
        if (rebelIdx === 0) return;
        const rebel = updatedPlayers[rebelIdx];
        const chosen = aiRebelPlay(rebel.hand, state.kingLanes[laneIdx], rebel.element, kingElement);
        if (chosen) {
          responses[laneIdx] = { card: chosen, playerIdx: rebelIdx };
          updatedPlayers[rebelIdx] = { ...rebel, hand: rebel.hand.filter(c => c.id !== chosen.id) };
        }
      });
      return { ...state, players: updatedPlayers, rebelResponses: responses, humanRebelSelection: null, pendingDuelResolve: true };
    }

    case 'AI_REBELS_RESPOND': {
      const responses = [...state.rebelResponses];
      const updatedPlayers = [...state.players];
      const kingElement = updatedPlayers[state.kingIdx].element;
      state.rebelOrder.forEach((rebelIdx, laneIdx) => {
        const rebel = updatedPlayers[rebelIdx];
        const chosen = aiRebelPlay(rebel.hand, state.kingLanes[laneIdx], rebel.element, kingElement);
        if (chosen) {
          responses[laneIdx] = { card: chosen, playerIdx: rebelIdx };
          updatedPlayers[rebelIdx] = { ...rebel, hand: rebel.hand.filter(c => c.id !== chosen.id) };
        }
      });
      return { ...state, players: updatedPlayers, rebelResponses: responses, pendingAiRebels: false, pendingDuelResolve: true };
    }

    case 'RESOLVE_DUEL': {
      const kingElement = state.players[state.kingIdx].element;
      const outcomes = state.rebelResponses.map((rr, laneIdx) => {
        if (!rr) return 'draw';
        const rebelIdx = state.rebelOrder[laneIdx];
        return resolveLane(state.kingLanes[laneIdx], rr.card, kingElement, state.players[rebelIdx].element);
      });
      const newDiscards = [];
      state.kingLanes.forEach((kc, laneIdx) => {
        newDiscards.push({
          card: kc, playerIdx: state.kingIdx, phase: 'Rebellion',
          label: `D${state.duelNumber}L${laneIdx + 1}👑`, isWinner: outcomes[laneIdx] === 'king',
        });
        if (state.rebelResponses[laneIdx]) {
          newDiscards.push({
            card: state.rebelResponses[laneIdx].card, playerIdx: state.rebelOrder[laneIdx],
            phase: 'Rebellion', label: `D${state.duelNumber}L${laneIdx + 1}`, isWinner: outcomes[laneIdx] === 'rebel',
          });
        }
      });
      const kw = outcomes.filter(o => o === 'king').length;
      const rw = outcomes.filter(o => o === 'rebel').length;
      const duelWinner = kw > rw ? 'king' : rw > kw ? 'rebellion' : 'draw';
      const newDuelWins = {
        king: state.duelWins.king + (duelWinner === 'king' ? 1 : 0),
        rebellion: state.duelWins.rebellion + (duelWinner === 'rebellion' ? 1 : 0),
      };
      const message = duelWinner === 'draw'
        ? `Duel ${state.duelNumber}: Draw! ${kw}-${rw}, no winner.`
        : `Duel ${state.duelNumber}: ${duelWinner === 'king' ? 'King' : 'Rebellion'} wins ${duelWinner === 'king' ? kw : rw}-${duelWinner === 'king' ? rw : kw}!`;
      return {
        ...state,
        laneOutcomes: outcomes,
        discardPile: [...state.discardPile, ...newDiscards],
        rebellionStage: 'resolving',
        pendingDuelResolve: false,
        animating: true,
        waitingForContinue: true,
        pendingResolution: { type: 'POST_DUEL', newDuelWins },
        message,
      };
    }

    case 'CONTINUE': {
      if (!state.pendingResolution) return state;

      if (state.pendingResolution.type === 'POST_FFA_TRICK') {
        const cleared = {
          ...state,
          revealedTrick: null,
          committedFFAPick: null,
          animating: false,
          waitingForContinue: false,
          pendingResolution: null,
        };

        const isSkirmish = !!state.skirmish;
        const activeIndices = isSkirmish ? state.skirmish.participants : [0, 1, 2, 3];
        const allHandsEmpty = activeIndices.every(i => state.players[i].hand.length === 0);

        if (!allHandsEmpty) {
          return { ...cleared, trickNumber: state.trickNumber + 1 };
        }

        const counts = activeIndices.map(i => ({ idx: i, wins: state.trickWins[i] }));
        const maxWins = Math.max(...counts.map(c => c.wins));
        const topIndices = counts.filter(c => c.wins === maxWins).map(c => c.idx);

        if (isSkirmish) {
          if (topIndices.length === 1) {
            const newKing = topIndices[0];
            const kingName = newKing === 0
              ? 'You are'
              : `${ELEMENTS[state.players[newKing].element].name}bender is`;
            return {
              ...cleared,
              scores: state.skirmish.savedScores,
              skirmish: null,
              kingIdx: newKing,
              kingStreak: 0,
              phase: 'score',
              message: `${kingName} crowned King via skirmish! Preparing the Rebellion...`,
              nextTransition: { type: 'DEAL_REBELLION', kingIdx: newKing },
            };
          }
          const handsByIdx = {};
          for (const i of topIndices) {
            handsByIdx[i] = getCardsWonBy(state.discardPile, i);
          }
          return buildSkirmishState(cleared, topIndices, handsByIdx, state.skirmish.savedScores, state.skirmish.recursionLevel + 1);
        }

        if (topIndices.length === 1) {
          const newKing = topIndices[0];
          const kingName = newKing === 0
            ? 'You are'
            : `${ELEMENTS[state.players[newKing].element].name}bender is`;
          return {
            ...cleared,
            kingIdx: newKing,
            kingStreak: 0,
            phase: 'score',
            message: `${kingName} crowned King with ${maxWins} tricks! Preparing the Rebellion...`,
            nextTransition: { type: 'DEAL_REBELLION', kingIdx: newKing },
          };
        }

        const handsByIdx = {};
        for (const i of topIndices) {
          handsByIdx[i] = getCardsWonBy(state.discardPile, i);
        }
        return buildSkirmishState(cleared, topIndices, handsByIdx, state.scores, 0);
      }

      if (state.pendingResolution.type === 'POST_DUEL') {
        const newDuelWins = state.pendingResolution.newDuelWins;
        const cleared = {
          ...state,
          duelWins: newDuelWins,
          animating: false,
          waitingForContinue: false,
          pendingResolution: null,
        };

        if (newDuelWins.king >= 4) {
          const multiplier = Math.pow(2, state.kingStreak);
          const pointsEarned = newDuelWins.king * multiplier;
          const xpEarned = XP_PER_KING_WIN * multiplier;
          const newScores = [...state.scores];
          newScores[state.kingIdx] += pointsEarned;
          const kingElement = state.players[state.kingIdx].element;
          const newXp = { ...state.xp, [kingElement]: (state.xp[kingElement] || 0) + xpEarned };
          const ended = newScores.some(s => s >= TARGET_SCORE);
          const kingName = state.kingIdx === 0 ? 'You held' : `${ELEMENTS[state.players[state.kingIdx].element].name}bender held`;
          const multBadge = multiplier > 1 ? ` (×${multiplier})` : '';
          return {
            ...cleared,
            scores: newScores,
            xp: newXp,
            kingStreak: state.kingStreak + 1,
            phase: 'score',
            message: `${kingName} the hill${multBadge}! ${newDuelWins.king} duels won, +${pointsEarned} pts, +${xpEarned} XP!`,
            nextTransition: ended ? { type: 'GAME_OVER' } : { type: 'DEAL_REBELLION', kingIdx: state.kingIdx },
          };
        }

        if (newDuelWins.rebellion >= 4) {
          const ended = state.scores.some(s => s >= TARGET_SCORE);
          const kingName = state.kingIdx === 0 ? 'You were' : `${ELEMENTS[state.players[state.kingIdx].element].name}bender was`;
          return {
            ...cleared,
            kingStreak: 0,
            phase: 'score',
            message: `${kingName} overthrown! Rebellion wins ${newDuelWins.rebellion}-${newDuelWins.king}. No points.`,
            nextTransition: ended ? { type: 'GAME_OVER' } : { type: 'DEAL_FFA' },
          };
        }

        return {
          ...cleared,
          kingLanes: [null, null, null],
          rebelResponses: [null, null, null],
          laneOutcomes: [null, null, null],
          duelNumber: state.duelNumber + 1,
          rebellionStage: 'king-choosing',
          message: `Duel ${state.duelNumber + 1} of ${REBELLION_DUELS}. ${state.kingIdx === 0 ? 'Choose 3 cards.' : 'King is choosing attacks...'}`,
        };
      }

      return state;
    }

    case 'DEAL_REBELLION': {
      const { newPlayers, rebelOrder } = dealRebellionHands(state.players, action.kingIdx);
      const mult = Math.pow(2, state.kingStreak);
      const streakLine = state.kingStreak >= 1 ? ` Streak ×${mult} — points & XP doubled!` : '';
      return {
        ...state,
        players: newPlayers,
        rebelOrder,
        kingIdx: action.kingIdx,
        kingLanes: [null, null, null],
        rebelResponses: [null, null, null],
        laneOutcomes: [null, null, null],
        duelWins: { king: 0, rebellion: 0 },
        duelNumber: 1,
        selectedKingCards: [null, null, null],
        humanRebelSelection: null,
        rebellionStage: 'king-choosing',
        discardPile: [],
        skirmish: null,
        phase: 'rebellion',
        nextTransition: null,
        message: `${kingDisplayName(state, action.kingIdx)} King!${streakLine} 7 duels — King attacks 3 lanes per duel.`,
      };
    }

    case 'DEAL_FFA': {
      const newPlayers = dealFFAHands(state.players);
      return {
        ...state,
        ...clearRebellionFields(),
        players: newPlayers,
        trickWins: [0, 0, 0, 0],
        humanFFAPick: null,
        committedFFAPick: null,
        revealedTrick: null,
        trickNumber: 1,
        kingIdx: null,
        kingStreak: 0,
        discardPile: [],
        skirmish: null,
        phase: 'freeforall',
        nextTransition: null,
        message: 'New free-for-all round! Element cards trump non-elements.',
      };
    }

    case 'GAME_OVER': {
      const winnerIdx = state.scores.indexOf(Math.max(...state.scores));
      const winnerName = winnerIdx === 0 ? 'You win' : `${ELEMENTS[state.players[winnerIdx].element].name}bender wins`;
      const elemKey = state.chosenElement;
      return {
        ...state,
        phase: 'gameover',
        nextTransition: null,
        message: `${winnerName} the war with ${state.scores[winnerIdx]} points!`,
        xp: elemKey ? { ...state.xp, [elemKey]: state.xp[elemKey] + XP_PER_RUN } : state.xp,
      };
    }

    case 'SKIP_TO_FFA_END': {
      const wins = action.wins;
      const totalTricks = wins.reduce((a, b) => a + b, 0);
      if (totalTricks !== 13) return state;
      const allRanks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      const suits = state.players.map(p => p.element);
      const phantomPile = [];
      let trickNum = 1;
      for (let pIdx = 0; pIdx < wins.length; pIdx++) {
        for (let w = 0; w < wins[pIdx]; w++) {
          for (let q = 0; q < 4; q++) {
            const rank = allRanks[(trickNum * 7 + q + pIdx) % allRanks.length];
            phantomPile.push({
              card: { suit: suits[q], rank, id: `phantom-T${trickNum}-${q}` },
              playerIdx: q,
              phase: 'FFA',
              label: `T${trickNum}`,
              isWinner: q === pIdx,
            });
          }
          trickNum++;
        }
      }
      const emptiedPlayers = state.players.map(p => ({ ...p, hand: [] }));
      return {
        ...state,
        players: emptiedPlayers,
        trickWins: wins,
        humanFFAPick: null,
        committedFFAPick: null,
        revealedTrick: null,
        discardPile: phantomPile,
        animating: false,
        pendingAckReveal: false,
        waitingForContinue: true,
        pendingResolution: { type: 'POST_FFA_TRICK' },
        message: 'Debug: FFA simulated. Tap Continue to crown / skirmish.',
      };
    }

    case 'SKIP_TO_GAMEOVER': {
      const newScores = [...state.scores];
      newScores[0] = TARGET_SCORE;
      const elemKey = state.chosenElement;
      return {
        ...state,
        ...clearRebellionFields(),
        scores: newScores,
        phase: 'gameover',
        animating: false,
        waitingForContinue: false,
        pendingResolution: null,
        pendingAckReveal: false,
        nextTransition: null,
        message: `You win the war with ${TARGET_SCORE} points! (debug)`,
        xp: elemKey ? { ...state.xp, [elemKey]: state.xp[elemKey] + XP_PER_RUN } : state.xp,
      };
    }

    case 'RETURN_TO_FFA': {
      const newPlayers = dealFFAHands(state.players);
      return {
        ...state,
        ...clearRebellionFields(),
        players: newPlayers,
        trickWins: [0, 0, 0, 0],
        humanFFAPick: null,
        committedFFAPick: null,
        revealedTrick: null,
        trickNumber: 1,
        kingIdx: null,
        kingStreak: 0,
        discardPile: [],
        skirmish: null,
        phase: 'freeforall',
        animating: false,
        waitingForContinue: false,
        pendingResolution: null,
        pendingAckReveal: false,
        nextTransition: null,
        message: 'New free-for-all round (debug bail from rebellion). No points awarded.',
      };
    }

    default:
      return state;
  }
}
