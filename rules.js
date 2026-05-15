// Resolves a free-for-all trick where all 4 players reveal at once.
// Trump cards (cards matching the player's own element) beat non-trumps.
// Among trumps, highest rank wins; ties go to a defender holding their own
// element, otherwise random among tied top plays.
export function simultaneousWinner(plays, players) {
  const trumpPlays = plays.filter(p => players[p.playerIdx].element === p.card.suit);
  const pool = trumpPlays.length > 0 ? trumpPlays : plays;
  const maxRank = Math.max(...pool.map(p => p.card.rank));
  const topPlays = pool.filter(p => p.card.rank === maxRank);

  if (topPlays.length === 1) return topPlays[0].playerIdx;

  for (const p of topPlays) {
    const defender = topPlays.find(
      other => other.playerIdx !== p.playerIdx && players[other.playerIdx].element === p.card.suit
    );
    if (defender) return defender.playerIdx;
  }

  const ownElement = topPlays.find(p => players[p.playerIdx].element === p.card.suit);
  if (ownElement) return ownElement.playerIdx;

  return topPlays[Math.floor(Math.random() * topPlays.length)].playerIdx;
}

// Resolves a single lane in the Rebellion phase: King vs one Rebel.
// Returns 'king', 'rebel', or 'draw'.
export function resolveLane(kingCard, rebelCard, kingElement, rebelElement) {
  const kingPlayedOwn = kingCard.suit === kingElement;
  const rebelPlayedOwn = rebelCard.suit === rebelElement;
  const kingCardIsRebelElement = kingCard.suit === rebelElement;
  const rebelCardIsKingElement = rebelCard.suit === kingElement;

  if (kingPlayedOwn && rebelPlayedOwn) {
    if (kingCard.rank > rebelCard.rank) return 'king';
    if (rebelCard.rank > kingCard.rank) return 'rebel';
    return 'draw';
  }
  if (kingPlayedOwn) return 'king';
  if (rebelPlayedOwn) return 'rebel';

  if (kingCard.rank > rebelCard.rank) return 'king';
  if (rebelCard.rank > kingCard.rank) return 'rebel';

  // Equal-rank, neither played own element. If both played the opponent's
  // element, the cards cancel out symmetrically → draw. Otherwise whichever
  // side played in enemy territory loses.
  if (kingCardIsRebelElement && rebelCardIsKingElement) return 'draw';
  if (kingCardIsRebelElement) return 'rebel';
  if (rebelCardIsKingElement) return 'king';
  return 'draw';
}
