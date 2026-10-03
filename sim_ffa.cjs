// Standalone FFA simulator. Ports rules.js + ai.js logic and pits four
// human-strategies against the game's AI to measure win rates.

const SUITS = ['water', 'fire', 'earth', 'air'];
const NUM_TRICKS = 13;

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Ported from rules.js
function simultaneousWinner(plays, players) {
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

// Ported from ai.js
function aiPlayFFASimultaneous(hand, myElement) {
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

// ---------- Candidate strategies for player 0 (the human seat) ----------

// A) Conservative-trump: dump lowest non-trump until late tricks, then
//    spend trumps from the top down.
function stratConservativeTrump(hand, myElement, trickIdx) {
  const trumps = hand.filter(c => c.suit === myElement);
  const nonTrumps = hand.filter(c => c.suit !== myElement);
  const late = trickIdx >= 9; // tricks 10-13 (0-indexed 9-12)
  if (!late && nonTrumps.length > 0) {
    return [...nonTrumps].sort((a, b) => a.rank - b.rank)[0];
  }
  if (trumps.length > 0) {
    return [...trumps].sort((a, b) => b.rank - a.rank)[0]; // highest trump
  }
  return [...hand].sort((a, b) => a.rank - b.rank)[0];
}

// B) Opposite: blast high non-trumps early, dribble low trumps late.
function stratOpposite(hand, myElement, trickIdx) {
  const trumps = hand.filter(c => c.suit === myElement);
  const nonTrumps = hand.filter(c => c.suit !== myElement);
  const early = trickIdx < 7;
  if (early && nonTrumps.length > 0) {
    return [...nonTrumps].sort((a, b) => b.rank - a.rank)[0]; // highest non-trump
  }
  if (trumps.length > 0) {
    return [...trumps].sort((a, b) => a.rank - b.rank)[0]; // lowest trump
  }
  return [...hand].sort((a, b) => b.rank - a.rank)[0];
}

// C) Always-highest (power = +13 if trump, else 0, plus rank).
function stratAlwaysHighest(hand, myElement) {
  return [...hand].sort((a, b) => {
    const ap = (a.suit === myElement ? 13 : 0) + a.rank;
    const bp = (b.suit === myElement ? 13 : 0) + b.rank;
    return bp - ap;
  })[0];
}

// D) Random AI (same policy as opponents).
function stratRandomAI(hand, myElement) {
  return aiPlayFFASimultaneous(hand, myElement);
}

// E) Greedy-low: always play lowest card, full stop.
function stratAlwaysLowest(hand) {
  return [...hand].sort((a, b) => a.rank - b.rank)[0];
}

const ascRank = (a, b) => a.rank - b.rank;
const descRank = (a, b) => b.rank - a.rank;

// F) Cheap-trump late: same as A but plays the LOWEST trump in late game,
//    not the highest. Any trump beats any non-trump, so a 2 is enough most
//    of the time — save Aces for trump-vs-trump duels.
function stratCheapTrumpLate(hand, myElement, trickIdx) {
  const trumps = hand.filter(c => c.suit === myElement);
  const nonTrumps = hand.filter(c => c.suit !== myElement);
  const late = trickIdx >= 9;
  if (!late && nonTrumps.length > 0) {
    return [...nonTrumps].sort(ascRank)[0];
  }
  if (trumps.length > 0) return [...trumps].sort(ascRank)[0];
  return [...hand].sort(ascRank)[0];
}

// G) Tracking: count cards played per suit. Three smart adjustments:
//   1. If opponents are out of their trumps (all played), the highest
//      non-trump remaining wins safely — play it.
//   2. In trump-vs-trump duels, the highest opposing trump still possible
//      tells us whether our trump-2 is enough or we need the Ace.
//   3. Late game, play the cheapest trump that beats any plausible threat.
function stratTracking(hand, myElement, trickIdx, ctx) {
  const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
  const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
  const oppElements = SUITS.filter(s => s !== myElement);

  // For each opponent (idx 1..3), how many of their own-element cards
  // (their trumps) could still be in their hand?
  const enemyTrumpsLeft = ctx.players
    .slice(1)
    .map(p => {
      const myCount = hand.filter(c => c.suit === p.element).length;
      const playedCount = ctx.playedBySuit[p.element];
      return Math.max(0, 13 - myCount - playedCount);
    });
  const totalEnemyTrumps = enemyTrumpsLeft.reduce((a, b) => a + b, 0);

  // 1) If no enemy trumps remain anywhere, high non-trump is safe.
  if (totalEnemyTrumps === 0 && nonTrumps.length > 0) {
    return nonTrumps[nonTrumps.length - 1];
  }

  const tricksLeft = NUM_TRICKS - trickIdx;
  const late = trickIdx >= 9 || trumps.length >= tricksLeft;

  // 2) Early/mid: dump cheapest non-trump if we have one.
  if (!late && nonTrumps.length > 0) return nonTrumps[0];

  // 3) Late: play the cheapest trump that should survive. If enemy trumps
  //    are scarce (<=1 expected), the low trump is enough. Otherwise spend
  //    the Ace.
  if (trumps.length > 0) {
    if (totalEnemyTrumps <= 1) return trumps[0]; // lowest trump
    // If we're trailing badly relative to tricks left, fire the Ace.
    const maxOther = Math.max(ctx.wins[1], ctx.wins[2], ctx.wins[3]);
    const trailingBig = ctx.wins[0] + tricksLeft < maxOther + tricksLeft - 1;
    if (trailingBig) return trumps[trumps.length - 1];
    return trumps[0];
  }
  return [...hand].sort(ascRank)[0];
}

// H) Counter-AI specifically tuned against aiPlayFFASimultaneous.
//   The AI plays high non-trumps ~35% of the time. Cheap trumps reliably
//   beat those. Strategy: in any trick where we hold both a low trump and
//   a low non-trump, fire the low trump if expected enemy trumps are low.
function stratCounterAI(hand, myElement, trickIdx, ctx) {
  const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
  const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
  const enemyTrumpsLeft = ctx.players
    .slice(1)
    .map(p => {
      const myCount = hand.filter(c => c.suit === p.element).length;
      const playedCount = ctx.playedBySuit[p.element];
      return Math.max(0, 13 - myCount - playedCount);
    });
  const tricksLeft = NUM_TRICKS - trickIdx;
  // Expected enemy trumps PER trick = sum / tricksLeft. Below ~0.5 means
  // a single low trump usually scoops.
  const expEnemyTrumpsPerTrick = enemyTrumpsLeft.reduce((a, b) => a + b, 0) / Math.max(1, tricksLeft);

  // Late + cheap trump available + enemy trumps thin = pick cheap trump.
  if (trickIdx >= 6 && trumps.length > 0 && expEnemyTrumpsPerTrick < 0.6) {
    return trumps[0];
  }
  // Otherwise: dump cheapest non-trump first.
  if (nonTrumps.length > 0) return nonTrumps[0];
  // Forced to play trump: lowest.
  if (trumps.length > 0) return trumps[0];
  return [...hand].sort(ascRank)[0];
}

// ---------- Game loop ----------

// strategies: array of 4 strategy functions, one per player seat. Each
// receives (hand, myElement, trickIdx, ctx). Strategies that don't need ctx
// just ignore it. Non-AI-style strategies (those expecting ctx) can read
// playedBySuit and other per-player state.
function playOneFFA(strategies) {
  const deck = createDeck();
  const players = SUITS.map((el, i) => ({ element: el, idx: i }));
  const hands = [0, 1, 2, 3].map(i => deck.slice(i * 13, (i + 1) * 13));
  const wins = [0, 0, 0, 0];
  const playedBySuit = { water: 0, fire: 0, earth: 0, air: 0 };
  const opponentPlaysBySuit = [0, 1, 2, 3].map(() => ({ water: 0, fire: 0, earth: 0, air: 0 }));

  for (let t = 0; t < NUM_TRICKS; t++) {
    const plays = [];
    for (let i = 0; i < 4; i++) {
      const card = strategies[i](hands[i], players[i].element, t, {
        playedBySuit,
        opponentPlaysBySuit,
        players,
        wins,
        myIdx: i,
      });
      const idx = hands[i].findIndex(c => c.suit === card.suit && c.rank === card.rank);
      hands[i].splice(idx, 1);
      plays.push({ playerIdx: i, card });
    }
    const winner = simultaneousWinner(plays, players);
    wins[winner]++;
    for (const p of plays) {
      playedBySuit[p.card.suit]++;
      opponentPlaysBySuit[p.playerIdx][p.card.suit]++;
    }
  }
  return wins;
}

function runBatch(label, strategies, n) {
  // strategies = single fn (becomes [strat, ai, ai, ai]) or array of 4 fns.
  const strats = Array.isArray(strategies)
    ? strategies
    : [strategies, stratRandomAI, stratRandomAI, stratRandomAI];
  const outright = [0, 0, 0, 0];
  const topFinish = [0, 0, 0, 0];
  const totalTricks = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const wins = playOneFFA(strats);
    for (let j = 0; j < 4; j++) totalTricks[j] += wins[j];
    const max = Math.max(...wins);
    const topCount = wins.filter(w => w === max).length;
    for (let j = 0; j < 4; j++) {
      if (wins[j] === max) {
        topFinish[j]++;
        if (topCount === 1) outright[j]++;
      }
    }
  }
  const pct = x => ((x / n) * 100).toFixed(2) + '%';
  const avg = j => (totalTricks[j] / n).toFixed(2);
  console.log(label);
  for (let j = 0; j < 4; j++) {
    console.log(
      `  P${j}: outright=${pct(outright[j]).padStart(7)}  top=${pct(topFinish[j]).padStart(7)}  avgTricks=${avg(j)}`
    );
  }
}

const N = parseInt(process.argv[2] || '20000', 10);
console.log(`Running ${N} FFA games per strategy (player 0 = human seat)\n`);
console.log('outright = strict majority of tricks (no tie at top)');
console.log('top      = tied-or-alone at most tricks (would reach Skirmish)');
console.log('avgTricks= mean tricks won out of 13\n');
// H2: more aggressive — play cheap trump anytime expected enemy trumps per
//     remaining trick is below 0.9 (matches the ~3 trumps × 3 opponents / 13
//     baseline). Last trick: spend Ace if we still hold one.
function stratCounterAI2(hand, myElement, trickIdx, ctx) {
  const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
  const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
  const enemyTrumpsLeft = ctx.players.slice(1).map(p => {
    const myCount = hand.filter(c => c.suit === p.element).length;
    return Math.max(0, 13 - myCount - ctx.playedBySuit[p.element]);
  });
  const tricksLeft = NUM_TRICKS - trickIdx;
  const totalEnemy = enemyTrumpsLeft.reduce((a, b) => a + b, 0);
  const expPerTrick = totalEnemy / Math.max(1, tricksLeft);

  if (tricksLeft === 1 && trumps.length > 0) {
    return trumps[trumps.length - 1]; // burn the Ace on the very last trick
  }
  if (totalEnemy === 0 && nonTrumps.length > 0) {
    return nonTrumps[nonTrumps.length - 1]; // free high non-trump
  }
  if (trumps.length > 0 && expPerTrick < 0.9) {
    return trumps[0];
  }
  if (nonTrumps.length > 0) return nonTrumps[0];
  if (trumps.length > 0) return trumps[0];
  return [...hand].sort(ascRank)[0];
}

// H3: per-opponent threat assessment. Only spend a low trump when the
//     MAX opponent trump count remaining is small (they can't out-trump us
//     with rank). Late game we also use the cheap trump if many tricks are
//     left and we have many trumps to dump.
function stratCounterAI3(hand, myElement, trickIdx, ctx) {
  const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
  const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
  const enemyTrumpsLeft = ctx.players.slice(1).map(p => {
    const myCount = hand.filter(c => c.suit === p.element).length;
    return Math.max(0, 13 - myCount - ctx.playedBySuit[p.element]);
  });
  const tricksLeft = NUM_TRICKS - trickIdx;
  const maxEnemy = Math.max(...enemyTrumpsLeft);
  const totalEnemy = enemyTrumpsLeft.reduce((a, b) => a + b, 0);

  if (tricksLeft === 1 && trumps.length > 0) {
    return trumps[trumps.length - 1];
  }
  if (totalEnemy === 0 && nonTrumps.length > 0) {
    return nonTrumps[nonTrumps.length - 1];
  }
  // Pressure to use trumps: many trumps relative to tricks left.
  const trumpPressure = trumps.length >= tricksLeft - 1;
  if (trumps.length > 0 && (maxEnemy <= 1 || trumpPressure)) {
    return trumps[0];
  }
  if (nonTrumps.length > 0) return nonTrumps[0];
  if (trumps.length > 0) return trumps[0];
  return [...hand].sort(ascRank)[0];
}

// H4: rank-aware — when playing a trump, pick the lowest rank that we
//     believe beats the likely highest enemy trump on this trick. The
//     expected highest enemy trump = roughly the median of remaining
//     trumps. So if avg remaining enemy trump rank is ~8, send our 9+.
function stratCounterAI4(hand, myElement, trickIdx, ctx) {
  const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
  const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
  const enemyTrumpsLeft = ctx.players.slice(1).map(p => {
    const myCount = hand.filter(c => c.suit === p.element).length;
    return Math.max(0, 13 - myCount - ctx.playedBySuit[p.element]);
  });
  const tricksLeft = NUM_TRICKS - trickIdx;
  const totalEnemy = enemyTrumpsLeft.reduce((a, b) => a + b, 0);
  const expPerTrick = totalEnemy / Math.max(1, tricksLeft);

  if (tricksLeft === 1 && trumps.length > 0) {
    return trumps[trumps.length - 1];
  }
  if (totalEnemy === 0 && nonTrumps.length > 0) {
    return nonTrumps[nonTrumps.length - 1];
  }
  // Rough estimate of the highest trump opponents will throw this trick:
  // if expPerTrick < 1, often nobody trumps — our trump-2 is safe.
  if (trumps.length > 0 && expPerTrick < 0.9) {
    return trumps[0];
  }
  // If trump duels are likely, find lowest trump > expected mid-rank ~8.
  const safeTrump = trumps.find(c => c.rank >= 9);
  if (trumps.length > 0 && expPerTrick >= 0.9 && safeTrump) {
    return safeTrump;
  }
  if (nonTrumps.length > 0) return nonTrumps[0];
  if (trumps.length > 0) return trumps[0];
  return [...hand].sort(ascRank)[0];
}

// H5/H6/H7: variants of H4 with different safe-rank thresholds.
function makeRankAware(safeRank, threshold) {
  return function (hand, myElement, trickIdx, ctx) {
    const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
    const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
    const enemyTrumpsLeft = ctx.players.slice(1).map(p => {
      const myCount = hand.filter(c => c.suit === p.element).length;
      return Math.max(0, 13 - myCount - ctx.playedBySuit[p.element]);
    });
    const tricksLeft = NUM_TRICKS - trickIdx;
    const totalEnemy = enemyTrumpsLeft.reduce((a, b) => a + b, 0);
    const expPerTrick = totalEnemy / Math.max(1, tricksLeft);
    if (tricksLeft === 1 && trumps.length > 0) return trumps[trumps.length - 1];
    if (totalEnemy === 0 && nonTrumps.length > 0) return nonTrumps[nonTrumps.length - 1];
    if (trumps.length > 0 && expPerTrick < threshold) return trumps[0];
    const safe = trumps.find(c => c.rank >= safeRank);
    if (trumps.length > 0 && expPerTrick >= threshold && safe) return safe;
    if (nonTrumps.length > 0) return nonTrumps[0];
    if (trumps.length > 0) return trumps[0];
    return [...hand].sort(ascRank)[0];
  };
}

// H8: estimate the highest enemy trump still in play from observed plays.
//     For each opponent we know how many trumps they've burned. The AI
//     plays middle trumps first, then low/high — so unseen trumps include
//     the Ace ~half the time. Use that to set the safe rank dynamically.
function stratCounterAI8(hand, myElement, trickIdx, ctx) {
  const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
  const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
  const tricksLeft = NUM_TRICKS - trickIdx;
  const enemyTrumpsLeft = ctx.players.slice(1).map(p => {
    const myCount = hand.filter(c => c.suit === p.element).length;
    return Math.max(0, 13 - myCount - ctx.playedBySuit[p.element]);
  });
  const totalEnemy = enemyTrumpsLeft.reduce((a, b) => a + b, 0);
  const expPerTrick = totalEnemy / Math.max(1, tricksLeft);

  if (tricksLeft === 1 && trumps.length > 0) return trumps[trumps.length - 1];
  if (totalEnemy === 0 && nonTrumps.length > 0) return nonTrumps[nonTrumps.length - 1];

  // Cheap trump if duels unlikely.
  if (trumps.length > 0 && expPerTrick < 0.85) return trumps[0];

  // Otherwise: lowest trump that beats the rank we'd expect an opponent
  // to throw if they trump. AI threshold suggests their mid trump avg ~7.
  // Aim safe rank slightly above: 9.
  if (trumps.length > 0) {
    const safe = trumps.find(c => c.rank >= 9);
    if (safe) return safe;
    return trumps[0]; // no safe trump, throw cheapest
  }
  if (nonTrumps.length > 0) return nonTrumps[0];
  return [...hand].sort(ascRank)[0];
}

// H9: same shape as makeRankAware but explicitly saves the Ace until the
//     final 2 tricks (never plays rank-14 unless tricksLeft <= 2).
function makeRankAwareSaveAce(safeRank, threshold) {
  return function (hand, myElement, trickIdx, ctx) {
    const trumps = [...hand].filter(c => c.suit === myElement).sort(ascRank);
    const nonTrumps = [...hand].filter(c => c.suit !== myElement).sort(ascRank);
    const enemyTrumpsLeft = ctx.players.slice(1).map(p => {
      const myCount = hand.filter(c => c.suit === p.element).length;
      return Math.max(0, 13 - myCount - ctx.playedBySuit[p.element]);
    });
    const tricksLeft = NUM_TRICKS - trickIdx;
    const totalEnemy = enemyTrumpsLeft.reduce((a, b) => a + b, 0);
    const expPerTrick = totalEnemy / Math.max(1, tricksLeft);
    if (tricksLeft === 1 && trumps.length > 0) return trumps[trumps.length - 1];
    if (totalEnemy === 0 && nonTrumps.length > 0) return nonTrumps[nonTrumps.length - 1];
    if (trumps.length > 0 && expPerTrick < threshold) return trumps[0];
    // Find lowest trump with rank >= safeRank AND don't burn Ace early.
    const playable = trumps.filter(c => tricksLeft <= 2 || c.rank < 14);
    const safe = playable.find(c => c.rank >= safeRank);
    if (trumps.length > 0 && expPerTrick >= threshold && safe) return safe;
    if (nonTrumps.length > 0) return nonTrumps[0];
    if (trumps.length > 0) return trumps[0];
    return [...hand].sort(ascRank)[0];
  };
}

const H12 = makeRankAwareSaveAce(11, 0.9);

console.log('--- Baseline: P0 uses strategy, P1-P3 use random AI ---');
runBatch('Random AI (all 4)', stratRandomAI, N);
runBatch('H12 vs 3 AI', H12, N);

console.log('\n--- Symmetry: all 4 players use H12 ---');
runBatch('All H12', [H12, H12, H12, H12], N);

console.log('\n--- Mixed: H12 vs 3 A (Conservative) ---');
runBatch('H12 vs 3 A', [H12, stratConservativeTrump, stratConservativeTrump, stratConservativeTrump], N);

console.log('\n--- Control: all 4 players use A (Conservative) ---');
runBatch('All A (Conservative)', [stratConservativeTrump, stratConservativeTrump, stratConservativeTrump, stratConservativeTrump], N);

console.log('\n--- One AI mole in an H12 lobby ---');
runBatch('H12 vs 2 H12 + 1 AI', [H12, H12, H12, stratRandomAI], N);
