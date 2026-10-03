# Avatar Card Game — Strategy Reference

A working strategy doc for the current ruleset, with notes on how each strategy holds up as the game becomes a roguelike (progressive difficulty + player progression + optional difficulty levels).

---

## 1. Mechanics recap (the load-bearing rules)

### FFA — 13 simultaneous tricks
All four players reveal one card at the same time. Resolution (`rules.js:simultaneousWinner`):

1. If **anyone** trumped (played their own element), only trumps compete. Non-trumps are dead cards.
2. Highest rank in the competing pool wins.
3. Tiebreaker chain: a "defender" holding their own element among tied players wins → then any own-element player → then random.

> Most-tricks-won = King. Ties trigger Skirmish.

### Skirmish — the rule that quietly reshapes FFA strategy
Tied players replay an FFA with **only the cards they won during FFA**. Recursive on continued ties.

This means *what* you win during FFA matters as much as *how many* you win. A skirmish hand built from low off-element tricks is junk; one built from high own-element tricks is dominant.

### Card Points — meta currency
Every trick you win during **FFA or Skirmish** credits you with the **sum of all four cards' ranks** played in that trick. Per-element pool (tracked separately for Water / Fire / Earth / Air), persisted across runs alongside XP.

Two strategic consequences:
- **Trick quality now matters as much as trick count.** Winning a trick where everyone played 13/14s is worth ~4× a trick where opponents dumped 2s and 3s. Trick-hunting where opponents are forced to commit becomes valuable.
- **Card Points add a long-tail reward for winning runs you wouldn't have qualified as King.** Even a 4-trick FFA still banks points — you're never grinding for nothing.

Use is downstream — Card Points feed either bonus XP, minor-upgrade currency, or both (TBD).

### Rebellion — 7 duels, first to 4
King has 21 cards, plays 3 cards (one per lane) per duel. Each rebel defends one assigned lane (the human, if rebel, is always middle lane). Lane resolution (`rules.js:resolveLane`):

| King \ Rebel | Own-element | Non-own |
|---|---|---|
| Own-element | Higher rank wins; tie = draw | King wins |
| Non-own | Rebel wins | Higher rank wins; equal rank + both played enemy element = draw; equal rank + one played enemy = enemy-player loses |

Two non-obvious consequences:
- **Trumping always at least draws.** Playing your own element can never lose to a non-own-element card.
- **Playing into "enemy territory" (the opponent's element suit) is punished on ties.** Don't ladder up with the enemy's suit unless you can clearly out-rank.

---

## 2. FFA strategies

### A. Trump Sweeper — lead with mid/high own-element cards
- **Useful when:** Hand has ≥ 4 own-element cards, especially A/K. You need to drive trick count.
- **Weak when:** You're already ahead. Burning trumps early invites bigger trumps from opponents in later tricks.
- **Roguelike note:** Gets stronger with *Sharper Strikes* (+1 element rank) — your trumps reach further. Becomes nearly mandatory at high difficulty if AI hoards trumps better.

### B. Junk Dumper — throw lowest off-element when you can afford to lose
- **Useful when:** You don't need this trick, and want to preserve trumps. Safe behind a comfortable lead.
- **Weak when:** You're behind. Junk almost never wins.
- **Roguelike note:** Loses value if AI starts tracking cards (i.e. "hard" AI that knows your remaining trumps). Junk plays become readable.

### C. Skirmish Stocker — *win the tricks you win using your high cards*
The single most-overlooked strategy because the skirmish rule isn't obvious from the UI.
- **Useful when:** Score is close enough that a tie is plausible. Aces sunk into low-value tricks come back to bite you in skirmish.
- **Weak when:** You're miles ahead or hopelessly behind — no tie incoming.
- **Roguelike note:** Becomes more important at higher difficulty if tie probability is engineered up (e.g., AI biased toward your trick count).

### D. Trump Bait — lead a high non-element (e.g. off-suit Ace)
- **Useful when:** You've watched opponents burn their own-element cards; trumps are exhausted.
- **Weak when:** Multiple opponents still hold their own element. Any trump beats your non-element Ace.
- **Roguelike note:** Especially dangerous against smarter AI that holds trumps to punish exactly this play.

### E. Heavyweight Reaper — trump tricks where opponents committed high cards
Card Points are the sum of *all four* cards in a won trick. The math: winning a trick where the field played [A, K, A, K] is worth 54 points; a trick of [2, 3, 2, 4] is worth 11. ~5× difference.
- **Useful when:** You can identify tricks where opponents are likely to commit (forced to dump high cards, last trick to clear a long suit, etc.). Reading hand exhaustion matters.
- **Weak when:** You're behind on tricks and need *any* win — chasing point quality over count can cost you the King qualification.
- **Roguelike note:** Reinforces the same skill that Skirmish Stocker rewards. Both want you to win the *right* tricks, not the most.

---

## 3. Skirmish strategies

Skirmish IS FFA with smaller, biased hands. The strategic work happens *upstream* in FFA. Two reliable patterns:

1. **Win with strength, lose with weakness.** Convert your high own-element cards into won tricks late in FFA. This loads up your skirmish reserve.
2. **Don't over-collect.** Hoarding too many wins still means you might win 5/13 — fine for King qualification, but you also handed yourself a 5-card skirmish hand built from whatever you trumped. Quality > quantity once you've crossed the tie threshold.

---

## 4. Rebellion strategies (King)

### E. Power Spread — distribute mid-high own-element across all 3 lanes
- **Useful when:** Hand is element-heavy. Equal pressure forces all rebels to spend trumps.
- **Weak when:** Hand skews to non-element top-rank cards (off-suit Aces). You'll lose those to any rebel trump.
- **Roguelike note:** This is what the current King AI does (`ai.js:aiKingPlay`). It's a *good* baseline strategy; smarter human play means deviating thoughtfully.

### F. Sacrificial Lane — concede one lane, push hard on two
- **Useful when:** 2/3 lanes wins the duel. Save your premium cards for future duels.
- **Weak when:** You've already lost duels and need to come back hard.
- **Roguelike note:** Identifying *which* lane to sacrifice gets harder if rebel positions become asymmetric (e.g. rebels get unique abilities later).

### G. Trump Wall — lead every lane with own-element, cheap
- **Useful when:** Late in rebellion, rebels are likely empty on own-element.
- **Weak when:** Duels 1–3. Rebels still have ~3 own-element cards on average and will eat low trumps.
- **Roguelike note:** *Sharper Strikes* (+1 rank) makes even your low trumps competitive earlier, shifting Trump Wall viability from duel 5+ to duel 3+.

---

## 5. Rebellion strategies (Rebel)

### H. Cheap Defense — beat the king's lane with your *lowest* winning own-element
- **Useful when:** Routine duels, especially mid-rebellion. Conserve high cards for later.
- **Weak when:** Final duel — no future to save for; just play your best winner.
- **Roguelike note:** Exactly what `ai.js:aiRebelPlay` does. Human rebel play differentiates by knowing when to *break* this pattern.

### I. Sacrifice Lane — dump cheapest non-element when you can't win
- **Useful when:** King played own-element A or K and you don't have an over-trump. Spending high cards here is waste.
- **Weak when:** You miscount the king's effective rank (forget element bonus). Always re-check: is the king's card actually unbeatable, or just intimidating?

### J. Draw Pressure — match king's rank when you can't beat it
- The lane resolution lets even-rank-neither-own → draw. A draw is a half-save.
- **Useful when:** Lane score is tight; preventing a loss matters more than scoring a win.
- **Weak when:** Game-deciding duel; you need a win, not a salvage.
- **Roguelike note:** *Elemental Mastery* (trumps win ties) would kill Draw Pressure as a rebel — but make it free as the king. Strategy flips depending on who has the upgrade.

---

## 6. Elemental identity — current vs. aspirational

Mechanically, all four elements behave identically in `rules.js`. The flavor in `constants.js` is aspirational:

| Element | Flavor | Strategic identity if developed |
|---|---|---|
| Water | Adaptive defender, strong counters | Reactive bonuses (e.g. trump-on-trump rank +1) |
| Fire  | Aggressive attacker | Bonuses when leading first or playing highest rank |
| Earth | Stalwart defender | Defense conversion (turn losses into draws, rank floor) |
| Air   | Evasive trickster | Information / disruption (peek, re-pick, swap) |

**Right now:** picking an element is cosmetic. Strategy advice is element-agnostic. This is the single biggest lever for making progression feel meaningful — once elements diverge mechanically, strategies stop being symmetric and the cheat sheet below has to fork by element.

---

## 7. How the strategy landscape moves under roguelike pressure

### As the run gets harder
| Difficulty knob | Strategies it weakens | Strategies it strengthens |
|---|---|---|
| Smarter AI (card tracking, pattern reads) | B Junk Dumper, D Trump Bait | C Skirmish Stocker, A Trump Sweeper |
| AI stat boosts (+1 element rank for enemies) | A Trump Sweeper at low player ranks | F Sacrificial Lane (concede gracefully) |
| Asymmetric: rebels buffed | G Trump Wall, E Power Spread | F Sacrificial Lane (king side) |
| Longer rebellion (more duels) | H Cheap Defense → must conserve harder | J Draw Pressure (draws stack up) |
| Forced skirmishes / tie nudging | A pure Trump Sweeper, B Junk | C Skirmish Stocker |

### As the player gets stronger (matching the existing upgrade stubs)
| Upgrade | Effect on strategy mix |
|---|---|
| **Sharper Strikes** (+1 rank to element cards) | Trump Sweeper + Trump Wall dominate. Junk Dumper loses ground; trumps are *always* the better play. |
| **Hidden Reserve** (+1 card/round) | More junk to dump, more trumps to hold. Junk Dumper + Skirmish Stocker both rise; Sacrificial Lane safer (you have spare). |
| **Elemental Mastery** (trumps win ties) | Draw Pressure dies as a rebel strategy; Cheap Defense gets safer (ties no longer cost). King's low-rank trumps become reliable. |
| **Avatar State** (any card → own element, 1×/run) | A panic button. Reserve it for either: (a) a must-win final rebellion duel, or (b) an FFA trick that will swing skirmish qualification. |

### Difficulty levels — design principle
**Don't make harder difficulties duplicate upgrades.** If "Hard" is just "AI gets +1 rank," it's the same lever as Sharper Strikes inverted, and the strategy space doesn't actually widen.

Better: difficulty changes *what the AI knows*, not what it has.
- **Easy:** current stochastic AI (`aiPlayFFASimultaneous` is 35/30/35 random).
- **Normal:** AI tracks remaining trumps in each suit.
- **Hard:** AI tracks individual played cards and reads player tendencies.
- **Nightmare:** AI plays optimally against player's revealed pattern within the run.

That way every upgrade unlock genuinely changes the matchup, instead of just inflating numbers on both sides.

---

## 8. Cheat sheet

| Situation | Best | Worst |
|---|---|---|
| FFA, element-heavy hand | Trump Sweeper | Junk Dumper |
| FFA, balanced hand, close score | Skirmish Stocker | Trump Bait |
| FFA, comfortable lead | Junk Dumper | Burn an off-suit Ace |
| FFA, ahead and grinding card points | Heavyweight Reaper (trump big tricks) | Trump tricks where everyone dumped junk |
| Skirmish looming | Win tricks WITH your high cards | Win tricks with low cards (junk skirmish hand) |
| Rebellion King, duel 1 | Power Spread | Lead three off-suit Aces |
| Rebellion King, behind on duels | Trump Wall | Sacrificial Lane (no slack to give) |
| Rebellion Rebel, king played own-element A in your lane | Sacrifice Lane | Burn your high trump |
| Rebellion Rebel, king played non-element | Cheap Defense, lowest winning own-element | Spend an Ace |
| Final duel, tied | Highest winner available | Save anything |

---

## 9. Design decisions (locked in)

1. **Element identity comes from upgrades, not baseline.** Elements stay mechanically symmetric out of the box. The upgrade tree (current stubs + future) is what carves Water/Fire/Earth/Air into distinct play patterns. → Strategy doc stays element-agnostic at the baseline; element-specific advice gets added per-upgrade as those upgrades land.
2. **Difficulty drivers (three, in priority order):**
   - **Smarter AI** as the run progresses (memory, card tracking, pattern reads).
   - **Statted-up enemies** (rank boosts, extra cards).
   - **Per-encounter modifiers** (rule wrinkles that flip strategy for one fight).
   - *Not pursuing:* longer/stacked runs as a difficulty axis.
3. **Persistence: XP + unlocked upgrades + Card Points only.** Each run starts from baseline plus owned upgrades. Card Points (sum of all 4 ranks per won FFA/Skirmish trick) accrue per-element across runs and feed bonus XP / minor-upgrade currency. Implication: the in-memory `xpCache` in `App.js` needs to become AsyncStorage-backed and broadened to a full per-element record.
4. **Element choice: free pick per run.** Players can swap elements between runs, learn all four. No locking, no random assignment.
5. **King role: FFA result by default, but upgrades/modifiers can swap.** "Specific upgrades / modifiers can flip the role" — e.g. a Coup modifier where lowest tricks crowns instead, or an upgrade that lets you challenge a King run. Baseline mechanic unchanged.
