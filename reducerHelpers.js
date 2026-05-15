import { ELEMENTS, SUITS, ZERO_XP } from './constants';
import { createDeck, sortHand } from './deck';

export const XP_PER_KING_WIN = 5;

export const initialState = {
  phase: 'element-select',
  chosenElement: null,
  message: '',
  players: [],
  trickWins: [0, 0, 0, 0],
  scores: [0, 0, 0, 0],
  kingIdx: null,
  discardPile: [],
  kingStreak: 0,
  humanFFAPick: null,
  committedFFAPick: null,
  revealedTrick: null,
  trickNumber: 0,
  aiPreviewPicks: {},
  rebelOrder: [],
  kingLanes: [null, null, null],
  rebelResponses: [null, null, null],
  duelWins: { king: 0, rebellion: 0 },
  duelNumber: 0,
  selectedKingCards: [null, null, null],
  humanRebelSelection: null,
  laneOutcomes: [null, null, null],
  rebellionStage: 'king-choosing',
  waitingForContinue: false,
  pendingResolution: null,
  pendingAckReveal: false,
  pendingAiRebels: false,
  pendingDuelResolve: false,
  nextTransition: null,
  animating: false,
  xp: ZERO_XP,
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeFFAPlayers(chosenElement) {
  const others = shuffleInPlace(SUITS.filter(s => s !== chosenElement));
  const elements = [chosenElement, ...others];
  const deck = createDeck();
  return [
    { name: 'You', element: elements[0], hand: sortHand(deck.slice(0, 13)), isHuman: true },
    { name: `${ELEMENTS[elements[1]].name}bender`, element: elements[1], hand: deck.slice(13, 26), isHuman: false },
    { name: `${ELEMENTS[elements[2]].name}bender`, element: elements[2], hand: deck.slice(26, 39), isHuman: false },
    { name: `${ELEMENTS[elements[3]].name}bender`, element: elements[3], hand: deck.slice(39, 52), isHuman: false },
  ];
}

export function dealFFAHands(players) {
  const deck = createDeck();
  return players.map((p, i) => ({
    ...p,
    hand: i === 0 ? sortHand(deck.slice(i * 13, (i + 1) * 13)) : deck.slice(i * 13, (i + 1) * 13),
  }));
}

// Human is forced to rebelOrder[1] when they're a rebel so their card
// lands in the middle battlefield lane.
export function dealRebellionHands(players, kingIdx) {
  const deck = createDeck();
  let rebels = [0, 1, 2, 3].filter(i => i !== kingIdx);
  if (rebels.includes(0)) {
    const others = rebels.filter(i => i !== 0);
    rebels = [others[0], 0, others[1]];
  }
  const newPlayers = players.map((p, i) => {
    if (i === kingIdx) {
      const hand = deck.slice(0, 21);
      return { ...p, hand: i === 0 ? sortHand(hand) : hand };
    }
    const rebelOrderIdx = rebels.indexOf(i);
    const start = 21 + rebelOrderIdx * 7;
    const hand = deck.slice(start, start + 7);
    return { ...p, hand: i === 0 ? sortHand(hand) : hand };
  });
  return { newPlayers, rebelOrder: rebels };
}

export function kingDisplayName(state, idx) {
  return idx === 0 ? 'You are' : `${ELEMENTS[state.players[idx].element].name}bender is`;
}

export function clearRebellionFields() {
  return {
    rebelOrder: [],
    kingLanes: [null, null, null],
    rebelResponses: [null, null, null],
    laneOutcomes: [null, null, null],
    duelWins: { king: 0, rebellion: 0 },
    duelNumber: 0,
    selectedKingCards: [null, null, null],
    humanRebelSelection: null,
    rebellionStage: 'king-choosing',
    pendingAiRebels: false,
    pendingDuelResolve: false,
  };
}
