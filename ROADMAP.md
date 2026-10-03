# Avatar Card Game — Roadmap

Tracks what's built, what's next, and the order it should land in. Companion to `STRATEGY.md` (which covers gameplay strategy and design decisions).

---

## ✅ Implemented

### Core game loop
- Full phase cycle: **Element Select → Upgrades → FFA → (Skirmish on tie) → Rebellion → Game Over → restart**
- Single `useReducer` in `App.js` orchestrating phase transitions via `state.phase`, `state.nextTransition`, and `pending*` flags
- 52-card deck, shuffle, sort, rank labels (`deck.js`)

### FFA phase
- 13 simultaneous tricks, 4 players, one card revealed at a time
- Trump rule + tie-break chain (`rules.js:simultaneousWinner`)
- Win-tricks-not-points scoring; King = most tricks

### Skirmish
- Tied players replay an FFA-style mini-round
- **Skirmish hands inherit from cards won during FFA** — the load-bearing rule
- Recursive on continued ties (`skirmish.recursionLevel`)

### Rebellion
- King's 21-card hand, 7 duels, 3 lanes per duel, first-to-4-wins
- Lane resolution including the "enemy-element tiebreaker" rule (`rules.js:resolveLane`)
- Rebel seating: human rebel always in middle lane (`rebelOrder[1]`)
- King-keeps-crown on successful defense; `kingStreak` doubles points and XP

### AI
- Three stochastic policies (`ai.js`):
  - `aiPlayFFASimultaneous` — 35/30/35 split between mid trump / low junk / high non-element
  - `aiKingPlay` — picks mid-power cards, shuffled across lanes
  - `aiRebelPlay` — cheapest winning trump or dump cheapest

### Elements (cosmetic only right now)
- 4 elements with colors, names, flavor text (`constants.js:ELEMENTS`)
- Element icons (`elementIcons.js`)
- Element-themed backgrounds (`ElementalBackground.js`, `RebellionBackground.js`)
- Mechanically identical across elements (intentional — identity will come from upgrades)

### UI / views
- `ElementSelectView`, `UpgradeView`, `FreeForAllView`, `RebellionView`
- `MiniHand` with rotated side renderings + the absolute-positioned inner wrapper so layout doesn't crush content when cards are hidden
- `HandFan` for player hand
- `CardDisplay`, `DiscardPile`, `HintButton`, `EndTurnButton`
- Hide/show opponent cards toggle (per phase view)
- Score strip, duel tally, message box, top opponent row in Rebellion
- Player info now renders **below** the hand (after recent fix); panel sized to clear floating End Turn / Continue button

### Meta progression (placeholder)
- `UpgradeView` exists and is reachable in the phase flow
- 5 upgrade stubs in `constants.js:UPGRADE_STUBS` — `starter` is unlocked, the rest are placeholder/locked
- XP tracking in `App.js` via an in-memory `xpCache` (NOT persisted; resets on app restart)

### Debug affordances
- `onSkipToFFAEnd` (configurable trick wins via SkipFFAModal)
- `onSkipToGameOver`
- `onReturnToFFA`
- These are intentional dev tools, not dead code

### Tests
- Pure-logic Jest tests for `deck`, `rules`, `ai`, and reducer transitions
- No UI/component tests

---

## 🛠 Planned — phase 1: foundation

Pre-req for any meta-progression. Without these, the run loop doesn't actually loop across sessions.

### 1. AsyncStorage persistence + per-element record
- Replace the in-memory `xpCache` in `App.js` with `@react-native-async-storage/async-storage` (already a dependency)
- Broaden the cache to a **full per-element record**:
  ```
  {
    water: { xp, cardPoints, unlockedUpgrades: [...] },
    fire:  { xp, cardPoints, unlockedUpgrades: [...] },
    earth: { xp, cardPoints, unlockedUpgrades: [...] },
    air:   { xp, cardPoints, unlockedUpgrades: [...] },
  }
  ```
- Load on app boot, save on XP gain / Card Points gain / upgrade purchase
- Migration path: empty storage → default state (matches current behavior)

### 2. Card Points tracking
- **What:** Sum of all 4 cards' ranks per trick won during **FFA + Skirmish** (Rebellion does NOT contribute).
- **Where in reducer:** Hook into FFA trick resolution and Skirmish trick resolution. When a winner is decided, add `sum(ranks of all 4 plays)` to that player's element pool.
- **Surfacing:** Display end-of-FFA Card Points earned (toast / score screen). Long-term display in `UpgradeView` alongside XP.
- **Spend:** TBD — either bonus XP, currency for minor upgrades, or both. Decision can defer until upgrade catalog grows.

### 3. Upgrade application pipeline
- Wire `state.unlockedUpgrades` (or similar) into the reducer
- Pass active upgrades down to rules / AI / deal functions so they can affect mechanics
- Currently upgrades only exist as visual stubs; need a hook point for each upgrade to mutate behavior

---

## 🛠 Planned — phase 2: first real upgrade

Prove the upgrade pipeline end-to-end with a single working upgrade before scaling out.

### 3. Sharper Strikes (`+1 rank to all element cards`)
- Smallest mechanical surface area; doesn't touch core flow
- Lives in deal logic or rank-compare logic
- Validates that the upgrade can affect:
  - FFA trick resolution (own-element cards get +1)
  - Rebellion lane resolution
  - AI evaluation (AI should respect player's boosted ranks)
- After this works, the remaining upgrades are mostly the same shape

---

## 🛠 Planned — phase 3: depth

### 4. AI difficulty tiers
Tiered AI policies in `ai.js` selected by a `state.difficulty` field:
- **Easy** — current stochastic AI
- **Normal** — AI tracks remaining trumps per suit (counts revealed cards)
- **Hard** — AI tracks individual played cards and reads player tendencies within the run
- **Nightmare** — AI plays optimally against the player's revealed pattern

Each tier ships when its underlying logic is ready, not all at once.

### 5. Remaining baseline upgrades
- **Hidden Reserve** — +1 card per round (deal-function change)
- **Elemental Mastery** — own-element trumps win ties (rules-resolution change)
- **Avatar State** — once per run, treat any card as own element (player-action change + run-state tracking)

Each is a different "shape" of upgrade — exercising the pipeline in distinct ways validates the design.

---

## 🛠 Planned — phase 4: variety

### 6. Encounter modifier system
Per-encounter rule wrinkles that scale the difficulty space without numerical inflation:
- Reducer reads a `state.modifiers` array when resolving FFA tricks / lane resolution / deal
- Modifier examples to scaffold:
  - **Coup** — lowest tricks crowns King (also satisfies "upgrades/modifiers can swap King role")
  - **Bloodied** — draws count as rebel wins
  - **Loaded** — King plays 4 lanes instead of 3
  - **First Strike** — element-trumped-first loses the trick
- Display modifier in UI before encounter starts; user opts in or accepts
- Modifier selection becomes part of the roguelike run shape

### 7. King role swap mechanics
- Specific upgrades that flip the FFA-decides default (e.g. a "Refuse the Crown" relic, or as part of the Coup modifier)
- Reducer hook in the FFA → Rebellion transition

---

## 🛠 Planned — phase 5: identity & polish

### 8. Element-specific passives via upgrades
Once the upgrade pipeline is proven, each element gets a signature upgrade path that makes its flavor real:
- **Water — Adaptive defender:** rebel-side bonuses, trump-on-trump rank +1
- **Fire — Aggressive attacker:** bonus when leading first / playing highest rank
- **Earth — Stalwart defender:** loss-to-draw conversion, rank floor
- **Air — Evasive trickster:** information / re-pick / swap mechanics

Once these land, `STRATEGY.md` forks per-element instead of being one symmetric doc.

### 9. UI / component tests
The codebase has logic tests but no UI tests. Worth adding once the feature set stabilizes — React Native Testing Library would slot in cleanly.

---

## Dependency graph (informal)

```
[1] AsyncStorage  ──────►  [2] Upgrade pipeline  ──┬──►  [3] Sharper Strikes
                                                   │
                                                   ├──►  [5] Other upgrades
                                                   │
                                                   └──►  [8] Element passives
[4] AI tiers (parallel)
[6] Modifier system  ──────►  [7] King role swap
```

`[1] → [2] → [3]` is the critical path. After [3] is shipped, [4] / [5] / [6] can move in any order. [7] is a special case of [6]. [8] is the longest-tail item — meaningful only after several upgrades exist.

---

## Known follow-ups (not planned, just noted)

- `skirmish.js` / `SkirmishView.js` — orphaned legacy files; decision needed on whether to delete or keep as reference
- Some `TIMING.*` constants in `App.js` are `0` — intentional for now, may want real animations later
- `react-native-paper` is in dependencies but unused — candidate for removal if no near-term plans
- Empty `components/` directory left over from Expo scaffold
