# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is an Expo / React Native project. All commands run from the `avatar-card-game/` directory.

- `npm install` — install dependencies
- `npm start` — launch Expo dev server (QR code for Expo Go on device)
- `npm run android` / `npm run ios` / `npm run web` — start on a specific target
- `npm test` — run Jest tests (preset: `jest-expo`)
- `npm run test:watch` — Jest in watch mode
- Run a single test file: `npx jest __tests__/rules.test.js`
- Run tests matching a name: `npx jest -t "highest rank wins"`
- No linter or typecheck script is configured.

Origin: `https://github.com/poland138/avatar-card-game.git` (main branch).

The project was originally a Snack (web-based Expo playground). It has no `node_modules/`, `.expo/`, or generated `ios/`/`android/` folders yet — first action in a fresh clone is `npm install`.

## Architecture

The game is an elemental Hearts variant: 4 players (1 human, 3 AI), each bound to one of the four elements (water/fire/earth/air). The game cycles between two main phases — Free-For-All and Rebellion — with a Skirmish tiebreak in between.

### State flow

A single `useReducer` in `App.js` owns the whole game. `reducer.js` exports `gameReducer` and `initialState`. Phase transitions are driven by:

- `state.phase` — `'element-select' | 'upgrades' | 'freeforall' | 'score' | 'rebellion' | 'gameover'`
- `state.nextTransition` — queued follow-up action `{ type, delay, ...payload }` that `App.js` fires via `setTimeout`. This is how the reducer schedules deferred dispatches without coupling to React.
- `state.pending*` flags (`pendingAckReveal`, `pendingAiRebels`, `pendingDuelResolve`) — each has a matching `useEffect` in `App.js` that fires a follow-up action after a `TIMING.*` delay.

If you need to add a new async/animated transition, follow the same pattern: reducer sets a `pending*` flag or `nextTransition`, `App.js` watches it and dispatches.

### Game logic split

- `constants.js` — elements, suits, colors, targets, XP, upgrade stubs
- `deck.js` — 52-card deck, shuffle, sort, rank labels
- `rules.js` — `simultaneousWinner` (FFA trick resolution with trump rule) and `resolveLane` (Rebellion king-vs-rebel lane resolution)
- `ai.js` — three AI policies: `aiPlayFFASimultaneous`, `aiKingPlay`, `aiRebelPlay`
- `reducer.js` — orchestration of all actions; also contains an inline `buildSkirmishState` + `getCardsWonBy`
- `reducerHelpers.js` — `initialState`, player factory, deal functions, XP constants
- Skirmish logic lives inline in `reducer.js` (`buildSkirmishState`, `getCardsWonBy`) — tied players replay a mini FFA with the cards they won. There used to be an alternative war-style implementation in `skirmish.js`/`SkirmishView.js`; those were deleted as stale.

### Phase semantics

- **FFA** — 13 tricks, all 4 players play one card simultaneously. Winner of most tricks becomes King. Ties trigger a Skirmish.
- **Skirmish** — tied players replay an FFA with only the cards they won. If still tied, recursive skirmish (tracked by `skirmish.recursionLevel`).
- **Rebellion** — King gets a 21-card hand and plays 3 attack cards per duel across 3 lanes. The 3 rebels each defend one lane. The rebel order is fixed so the human (if rebel) is always in `rebelOrder[1]` (middle lane). 7 duels per rebellion; first side to 4 wins. King keeps the crown on a successful defense and earns `kingStreak`-doubled points and XP.
- **XP** persistence is currently an in-memory `xpCache` module variable in `App.js`, NOT AsyncStorage, even though `@react-native-async-storage/async-storage` is in dependencies. Wiring up AsyncStorage is a known TODO.

### View layer

Views are flat files at the project root (not in a `components/` folder despite the empty `components/AssetExample.js` placeholder). Each phase has a top-level view:

- `ElementSelectView`, `UpgradeView`, `FreeForAllView`, `RebellionView`
- Shared widgets: `CardDisplay`, `HandFan`, `MiniHand`, `DiscardPile`, `EndTurnButton`, `HintButton`, `ElementalBackground`, `RebellionBackground`

Styling uses inline `StyleSheet.create` per file and the shared `COLORS` palette from `constants.js`. There is no Tailwind / styled-components / theme provider despite `react-native-paper` being in deps. `safeArea.js` provides hand-rolled safe-area insets — react-native-safe-area-context is not installed.

`FreeForAllView` and `RebellionView` are ~20KB each and contain debug shortcuts (`onSkipToFFAEnd`, `onSkipToGameOver`, `onReturnToFFA`) that the reducer accepts as actions. Keep these — they're development affordances, not dead code.

## Working in this codebase

### Token management and scope

This is a hobbyist game project being iteratively polished. To keep sessions efficient:

- **Read selectively.** The two view files are large; prefer `Grep`/`Glob` over reading full files unless you're editing them.
- **Don't re-explore each turn.** The architecture above is stable. Trust it unless you observe a contradiction.
- **Summarize-and-restart on long sessions.** If a single conversation has accumulated more than ~30 large tool results or is approaching a context-limit warning, pause, write a short handoff summary (what was changed, what's pending, any open questions), and ask the user to start a fresh session from that summary. Don't try to power through a degraded context.
- **One concern per change.** The reducer is the hot spot; touching it forces re-reading. Group related reducer edits, but don't piggyback unrelated refactors.

### When to ask vs. when to act

Ask the user before:

- Deleting or rewriting `skirmish.js` / `SkirmishView.js` (orphaned — intent unclear)
- Replacing `xpCache` with AsyncStorage persistence (touches save/load semantics)
- Adding TypeScript, a linter, or tests (none exist; introducing them is a project-level decision)
- Renaming actions, phases, or `state.*` fields (cascades across views and reducer)
- Adding dependencies — the project deliberately runs on a small Expo stack

Act without asking for:

- Bug fixes localized to one view or one reducer case
- Style/layout tweaks
- Extracting clearly-duplicated helpers
- Adding new actions or `pending*` flags that follow the existing reducer pattern

### Conventions worth preserving

- AI hands are intentionally left unsorted; only the human's hand at `players[0]` is sorted via `sortHand`. Don't sort AI hands "for consistency" — it makes diffs noisy and isn't visible to the user.
- `id` on cards is always `"${suit}-${rank}"` for real cards, `"phantom-..."` for debug-injected ones, and `"back-${idx}"` for face-down placeholders. Don't reuse these prefixes.
- The reducer is pure; all side effects (timers, persistence) live in `App.js` effects keyed off `pending*` / `nextTransition` flags. Maintain this separation.
- Comments in this codebase are sparse and only explain *why* (e.g. the rebel-order forcing in `dealRebellionHands`). Match that style — don't add narration.

### Testing strategy

Tests live in `__tests__/` and target **pure logic only** — `deck`, `rules`, `ai`, and reducer transitions. There are no UI/component tests yet; React Native Testing Library can be added later if visual regressions become an issue, but logic is where game bugs hide.

When adding a new rule, AI policy, or reducer action, add or extend a test in the matching file. Keep tests deterministic — the AI and deck modules use `Math.random()`, so either assert membership/length properties (as `ai.test.js` does) or mock `Math.random` for a single test, never both in the same case.

### Things that look broken but aren't

- `App.js` `TIMING.*` values are mostly `0` — animations are minimal; this is intentional for the current iteration, not a bug.
- `skirmish.js`'s `START_SKIRMISH` action referenced in a comment doesn't exist in the reducer. The orphaned-file caveat above applies.
- Empty `components/` directory (only `AssetExample.js`) — leftover from Expo scaffold; safe to leave alone.
