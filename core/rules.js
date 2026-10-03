// Resolves a free-for-all trick where all 4 players reveal at once.
// Trump cards (cards matching the player's own element) beat non-trumps.
// Among trumps, highest rank wins; ties go to a defender holding their own
// element, then to the earliest own-element play, otherwise random.
// `reason` names the deciding branch so the UI can explain the result.
export function resolveTrick(plays, players) {
  const isTrump = p => players[p.playerIdx].element === p.card.suit;
  const trumpPlays = plays.filter(isTrump);
  const pool = trumpPlays.length > 0 ? trumpPlays : plays;
  const maxRank = Math.max(...pool.map(p => p.card.rank));
  const topPlays = pool.filter(p => p.card.rank === maxRank);

  if (topPlays.length === 1) {
    let reason = 'highest-rank';
    if (trumpPlays.length === 1) reason = 'only-trump';
    else if (trumpPlays.length > 1) reason = 'highest-trump';
    return { winner: topPlays[0].playerIdx, reason };
  }

  for (const p of topPlays) {
    const defender = topPlays.find(
      other => other.playerIdx !== p.playerIdx && players[other.playerIdx].element === p.card.suit
    );
    if (defender) return { winner: defender.playerIdx, reason: 'tie-defender' };
  }

  const ownElement = topPlays.find(isTrump);
  if (ownElement) return { winner: ownElement.playerIdx, reason: 'tie-first-trump' };

  const pick = topPlays[Math.floor(Math.random() * topPlays.length)];
  return { winner: pick.playerIdx, reason: 'tie-random' };
}

export function simultaneousWinner(plays, players) {
  return resolveTrick(plays, players).winner;
}

// Resolves a single lane in the Rebellion phase: King vs one Rebel.
export function resolveLaneDetailed(kingCard, rebelCard, kingElement, rebelElement) {
  const kingPlayedOwn = kingCard.suit === kingElement;
  const rebelPlayedOwn = rebelCard.suit === rebelElement;
  const kingCardIsRebelElement = kingCard.suit === rebelElement;
  const rebelCardIsKingElement = rebelCard.suit === kingElement;

  if (kingPlayedOwn && rebelPlayedOwn) {
    if (kingCard.rank > rebelCard.rank) return { result: 'king', reason: 'both-own' };
    if (rebelCard.rank > kingCard.rank) return { result: 'rebel', reason: 'both-own' };
    return { result: 'draw', reason: 'both-own' };
  }
  if (kingPlayedOwn) return { result: 'king', reason: 'king-own' };
  if (rebelPlayedOwn) return { result: 'rebel', reason: 'rebel-own' };

  if (kingCard.rank > rebelCard.rank) return { result: 'king', reason: 'higher-rank' };
  if (rebelCard.rank > kingCard.rank) return { result: 'rebel', reason: 'higher-rank' };

  // Equal-rank, neither played own element. If both played the opponent's
  // element, the cards cancel out symmetrically → draw. Otherwise whichever
  // side played in enemy territory loses.
  if (kingCardIsRebelElement && rebelCardIsKingElement) return { result: 'draw', reason: 'tie-both-enemy' };
  if (kingCardIsRebelElement) return { result: 'rebel', reason: 'tie-king-in-enemy' };
  if (rebelCardIsKingElement) return { result: 'king', reason: 'tie-rebel-in-enemy' };
  return { result: 'draw', reason: 'tie' };
}

// Returns 'king', 'rebel', or 'draw'.
export function resolveLane(kingCard, rebelCard, kingElement, rebelElement) {
  return resolveLaneDetailed(kingCard, rebelCard, kingElement, rebelElement).result;
}
