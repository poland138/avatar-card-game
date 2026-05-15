// Free-for-all AI: roughly 35% play a mid-rank trump, 30% dump a low non-trump,
// 35% throw a high non-trump. Stochastic on purpose so the human can't read it.
export function aiPlayFFASimultaneous(hand, myElement) {
  const elements = hand.filter(c => c.suit === myElement);
  const nonElements = hand.filter(c => c.suit !== myElement);
  const sorted = [...hand].sort((a, b) => a.rank - b.rank);
  const r = Math.random();

  if (r < 0.35 && elements.length > 0) {
    const sortedTrumps = [...elements].sort((a, b) => a.rank - b.rank);
    return sortedTrumps[Math.floor(sortedTrumps.length / 2)];
  } else if (r < 0.65) {
    if (nonElements.length > 0) return [...nonElements].sort((a, b) => a.rank - b.rank)[0];
    return sorted[0];
  } else {
    if (nonElements.length > 0) return [...nonElements].sort((a, b) => b.rank - a.rank)[0];
    return sorted[sorted.length - 1];
  }
}

// King AI: pick three mid-range cards (avoids burning the top of the hand on
// duel 1) and shuffle them across lanes so the rebel can't pattern-match.
// "Power" = element bonus (+13) + rank, so own-element cards rank above
// non-element Aces.
export function aiKingPlay(hand, kingElement) {
  const ranked = [...hand].sort((a, b) => {
    const aPower = (a.suit === kingElement ? 13 : 0) + a.rank;
    const bPower = (b.suit === kingElement ? 13 : 0) + b.rank;
    return bPower - aPower;
  });
  const mid = ranked.slice(Math.min(2, ranked.length - 3), Math.min(5, ranked.length));
  while (mid.length < 3) mid.push(ranked[mid.length] || ranked[0]);
  return mid.slice(0, 3).sort(() => Math.random() - 0.5);
}

// Rebel AI: try to win the lane as cheaply as possible, otherwise dump the
// worst card. If the King played their own element we have to over-trump or
// concede; if they didn't, our own element auto-wins.
export function aiRebelPlay(hand, kingLaneCard, rebelElement, kingElement) {
  if (hand.length === 0) return null;
  const kingPlayedElement = kingLaneCard.suit === kingElement;
  const myElements = hand.filter(c => c.suit === rebelElement);

  if (kingPlayedElement) {
    const winningTrumps = myElements.filter(c => c.rank > kingLaneCard.rank);
    if (winningTrumps.length > 0) return winningTrumps.reduce((a, b) => (a.rank < b.rank ? a : b));

    const tieTrumps = myElements.filter(c => c.rank === kingLaneCard.rank);
    if (tieTrumps.length > 0) return tieTrumps[0];

    // Can't win — dump our cheapest non-element first, save trumps for later.
    const nonElement = hand.filter(c => c.suit !== rebelElement);
    if (nonElement.length > 0) return nonElement.reduce((a, b) => (a.rank < b.rank ? a : b));
    return hand.reduce((a, b) => (a.rank < b.rank ? a : b));
  }

  // King played a non-element: ANY of our element cards wins automatically.
  if (myElements.length > 0) return myElements.reduce((a, b) => (a.rank < b.rank ? a : b));

  const higher = hand.filter(c => c.rank > kingLaneCard.rank);
  if (higher.length > 0) return higher.reduce((a, b) => (a.rank < b.rank ? a : b));

  const tie = hand.filter(c => c.rank === kingLaneCard.rank);
  if (tie.length > 0) return tie[0];

  return hand.reduce((a, b) => (a.rank < b.rank ? a : b));
}
