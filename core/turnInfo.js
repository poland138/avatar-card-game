import { ELEMENTS, REBELLION_DUELS } from './constants';
import { rankLabel } from './deck';
import { resolveLaneDetailed } from './rules';

const FFA_TRICKS = 13;

export function playerLabel(players, idx) {
  return idx === 0 ? 'You' : players[idx].name;
}

function wins(name) {
  return name === 'You' ? 'You win' : `${name} wins`;
}

export function cardLabel(card) {
  return `${ELEMENTS[card.suit].name} ${rankLabel(card.rank)}`;
}

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function getStatus(state) {
  switch (state.phase) {
    case 'element-select':
      return { phaseLabel: 'Choose your element', progress: '', instruction: 'Pick the element you will bend.' };
    case 'upgrades':
      return { phaseLabel: 'Prepare', progress: '', instruction: 'Review your upgrades, then press Begin Run.' };
    case 'freeforall':
      return ffaStatus(state);
    case 'score':
      return {
        phaseLabel: state.duelNumber > 0 ? 'Rebellion over' : 'King crowned',
        progress: '',
        instruction: 'Preparing the next round…',
      };
    case 'rebellion':
      return rebellionStatus(state);
    case 'gameover':
      return { phaseLabel: 'Game over', progress: '', instruction: 'Start a new game to play again.' };
    default:
      return { phaseLabel: '', progress: '', instruction: '' };
  }
}

function ffaStatus(state) {
  const sk = state.skirmish;
  let phaseLabel = 'Free-for-all';
  if (sk) phaseLabel = sk.recursionLevel > 0 ? `Skirmish (round ${sk.recursionLevel + 1})` : 'Skirmish';
  const total = sk ? sk.totalTricks : FFA_TRICKS;
  const progress = `Trick ${state.trickNumber} of ${total}`;
  const active = sk ? sk.participants : [0, 1, 2, 3];
  const humanActive = active.includes(0);

  let instruction;
  if (state.waitingForContinue) {
    if (!humanActive) {
      instruction = 'Watching the skirmish…';
    } else {
      const handsEmpty = active.every(i => state.players[i].hand.length === 0);
      instruction = handsEmpty
        ? 'Last trick played. Press Continue to see who is crowned.'
        : 'Trick over. Press Continue for the next one.';
    }
  } else if (state.revealedTrick || state.animating) {
    instruction = 'Revealing…';
  } else if (!humanActive) {
    instruction = 'You sit this skirmish out. Tricks play automatically.';
  } else if (state.humanFFAPick) {
    instruction = 'Press Play to reveal all cards at once.';
  } else {
    instruction = 'Pick a card to play.';
  }
  return { phaseLabel, progress, instruction };
}

function rebellionStatus(state) {
  const tally = state.pendingResolution?.newDuelWins ?? state.duelWins;
  const progress = `Duel ${state.duelNumber} of ${REBELLION_DUELS} · King ${tally.king} – Rebels ${tally.rebellion}`;
  const humanIsKing = state.kingIdx === 0;
  const humanLane = state.rebelOrder.indexOf(0);

  let instruction;
  if (state.waitingForContinue) {
    instruction = 'Duel over. Press Continue.';
  } else if (state.rebellionStage === 'king-choosing') {
    if (humanIsKing) {
      const placed = state.selectedKingCards.filter(Boolean).length;
      instruction = placed < 3
        ? `Place an attack card in each lane (${placed}/3): pick a card, then tap a lane.`
        : 'Press Attack to launch all three lanes.';
    } else {
      instruction = 'The King is choosing attacks…';
    }
  } else if (state.rebellionStage === 'rebels-responding') {
    if (humanLane >= 0 && !state.rebelResponses[humanLane]) {
      instruction = state.humanRebelSelection
        ? 'Press Defend to lock in your card.'
        : `Pick a card to defend lane ${humanLane + 1} against the King's ${cardLabel(state.kingLanes[humanLane])}.`;
    } else {
      instruction = 'Rebels are choosing defenses…';
    }
  } else {
    instruction = 'Resolving the duel…';
  }
  return { phaseLabel: humanIsKing ? 'Rebellion · You are King' : 'Rebellion', progress, instruction };
}

export function explainTrick(trick, players) {
  const winnerPlay = trick.plays.find(p => p.playerIdx === trick.winner);
  const who = wins(playerLabel(players, trick.winner));
  const card = cardLabel(winnerPlay.card);
  const winnerElement = ELEMENTS[players[trick.winner].element].name;
  switch (trick.reason) {
    case 'only-trump':
      return `${who}: ${card} was the only trump played.`;
    case 'highest-trump':
      return `${who}: ${card} is the highest trump.`;
    case 'highest-rank':
      return `${who}: no trumps were played, so the highest card (${card}) takes it.`;
    case 'tie-defender':
      return `${who} the tie: a tied card was ${winnerElement}, and ties go to the ${winnerElement} player.`;
    case 'tie-first-trump':
      return `${who} the tie: tied trumps go to the earlier seat.`;
    case 'tie-random':
      return `${who} the tie: equal cards with no element tiebreak, so it was a coin flip.`;
    default:
      return `${who} the trick.`;
  }
}

export function explainLane({ kingCard, rebelCard, kingElement, rebelElement, kingName, rebelName }) {
  if (!rebelCard) return { result: 'draw', text: 'Draw: no defender in this lane.' };
  const { result, reason } = resolveLaneDetailed(kingCard, rebelCard, kingElement, rebelElement);
  const k = cardLabel(kingCard);
  const r = cardLabel(rebelCard);
  const winnerName = result === 'king' ? kingName : rebelName;
  const winnerCard = result === 'king' ? k : r;
  const rebelIsYou = rebelName === 'You';

  let text;
  switch (reason) {
    case 'both-own':
      text = result === 'draw'
        ? `Draw: both played their own element at the same rank (${k} vs ${r}).`
        : `${wins(winnerName)}: both played their own element, and ${winnerCard} is higher.`;
      break;
    case 'king-own':
      text = `${wins(kingName)}: the King's own-element ${k} beats the off-element ${r}.`;
      break;
    case 'rebel-own':
      text = `${wins(rebelName)}: own-element ${r} beats the King's off-element ${k}.`;
      break;
    case 'higher-rank':
      text = `${wins(winnerName)}: neither played their own element, and ${winnerCard} is higher.`;
      break;
    case 'tie-both-enemy':
      text = "Draw: same rank, and both played into the other's element.";
      break;
    case 'tie-king-in-enemy':
      text = `${wins(rebelName)}: same rank, but the King played ${rebelIsYou ? 'your' : "the rebel's"} element.`;
      break;
    case 'tie-rebel-in-enemy':
      text = `${wins(kingName)}: same rank, but ${rebelIsYou ? 'you' : rebelName} played the King's element.`;
      break;
    default:
      text = 'Draw: same rank with no element advantage.';
  }
  return { result, text };
}

export function explainDuel(state) {
  const kingElement = state.players[state.kingIdx].element;
  const kingName = playerLabel(state.players, state.kingIdx);
  return state.rebelOrder.map((rebelIdx, laneIdx) => {
    const rebelName = playerLabel(state.players, rebelIdx);
    return {
      laneIdx,
      rebelName,
      ...explainLane({
        kingCard: state.kingLanes[laneIdx],
        rebelCard: state.rebelResponses[laneIdx]?.card ?? null,
        kingElement,
        rebelElement: state.players[rebelIdx].element,
        kingName,
        rebelName,
      }),
    };
  });
}

const FFA_RULE = 'Cards of your own element are trumps: any trump beats every non-trump. Otherwise the highest card wins.';
const LANE_RULE = 'Own element beats off-element. If both cards are the same kind, the higher rank wins.';

export function getPhaseIntro(prev, state) {
  if (!prev || prev === state) return null;
  const sk = state.skirmish;
  if (state.phase === 'freeforall' && sk && (!prev.skirmish || prev.skirmish.recursionLevel !== sk.recursionLevel)) {
    return skirmishIntro(prev, state);
  }
  if (state.phase === 'freeforall' && !sk && prev.phase !== 'freeforall') return ffaIntro(prev);
  if (state.phase === 'rebellion' && prev.phase !== 'rebellion') return rebellionIntro(prev, state);
  return null;
}

// Only a real rebellion ending (score phase with a recorded result) counts;
// debug Return to FFA comes straight from the rebellion phase.
function finishedRebellion(prev) {
  return prev.phase === 'score' ? prev.lastRebellion ?? null : null;
}

function ffaIntro(prev) {
  const last = finishedRebellion(prev);
  if (last && !last.held) {
    const fallen = last.kingIdx === 0 ? 'You were' : `${prev.players[last.kingIdx].name} was`;
    return {
      kind: 'ffa-start',
      title: `${fallen} overthrown!`,
      body: `The rebels won ${last.duels.rebellion}–${last.duels.king}. A new free-for-all decides the next King.`,
      rule: FFA_RULE,
    };
  }
  return {
    kind: 'ffa-start',
    title: 'Free-for-all',
    body: 'Everyone plays one card at the same time. Win the most of the 13 tricks to become King.',
    rule: FFA_RULE,
  };
}

function skirmishIntro(prev, state) {
  const sk = state.skirmish;
  const names = sk.participants.map(i => playerLabel(state.players, i));
  const tied = prev.trickWins[sk.participants[0]];
  const sitOut = sk.participants.includes(0) ? '' : ' You sit this one out and watch.';
  return {
    kind: 'skirmish-start',
    title: sk.recursionLevel > 0 ? 'Still tied!' : 'Skirmish!',
    body: `${joinNames(names)} tied with ${tied} tricks each. They replay a mini free-for-all using only the cards they won.${sitOut}`,
    rule: 'Whoever wins the most skirmish tricks is crowned King.',
  };
}

function rebellionIntro(prev, state) {
  const k = state.kingIdx;
  const kingName = playerLabel(state.players, k);
  const last = finishedRebellion(prev);
  const held = !!(last && last.held && last.kingIdx === k);

  let title;
  let lead;
  if (held) {
    title = k === 0 ? 'You hold the crown!' : `${kingName} holds the crown!`;
    lead = `${kingName} won ${last.duels.king}–${last.duels.rebellion}: +${last.points} pts, +${last.xp} XP. `;
  } else {
    title = k === 0 ? 'You are King!' : `${kingName} is King!`;
    lead = k === 0 ? 'You won the most tricks and take the crown. ' : `${kingName} won the most tricks and takes the crown. `;
  }
  const role = k === 0
    ? 'Each duel you attack all 3 lanes with cards from your 21-card hand. Win 4 of 7 duels to keep the crown and score points.'
    : `You are a rebel defending lane ${state.rebelOrder.indexOf(0) + 1}. Each duel, answer the King's attack in your lane. The rebels win by taking 4 duels.`;
  const streak = state.kingStreak > 0 ? ` Streak ×${2 ** state.kingStreak}: points and XP are multiplied.` : '';
  return { kind: 'rebellion-start', title, body: lead + role + streak, rule: LANE_RULE };
}
