# Web Port (three.js) — Design

Date: 2026-10-03
Status: Approved in brainstorming, pending written-spec review

## Goal

Make the Avatar Card Game playable in a browser, built with three.js, hosted on
GitHub Pages from a public repo so it can be edited with Claude Code on the web
and tested at a public URL. Along the way, rebuild the UI so spacing is
consistent and nothing overlaps, and make the turn flow easier to follow.

The existing Expo / React Native app is **kept** and continues to work. Both apps
share one copy of the game logic.

## Decisions

| Topic | Decision |
|---|---|
| Expo app | Keep. Shares game logic with the web app via `core/`. |
| Stack | React 19 + React Three Fiber (three.js) + Vite. HUD is HTML/CSS. |
| Visual style | Flat 2.5D: top-down table like today, with depth, shadows, card flips and smooth movement. |
| Turn-flow features | Status banner + step guide, "why it won" callouts, phase intro screens. (Staged one-by-one reveals: not wanted.) |
| Debug / peek tools | Hidden dev mode, toggled by backtick key or `?debug` URL param. |
| Screens | Responsive: desktop landscape and phone portrait. |
| Hosting | Repo made public; GitHub Actions deploys `web/` to GitHub Pages on push to `main`. |

## Architecture

```
avatar-card-game/                 repo root
├── core/                         shared pure game logic — no React, no RN imports
│   ├── constants.js deck.js rules.js ai.js
│   ├── reducer.js reducerHelpers.js
│   └── turnInfo.js               NEW
├── __tests__/                    Jest tests for core/ (existing + turnInfo)
├── App.js, *View.js, …           Expo app, unchanged except imports → ./core/…
├── web/                          NEW browser app, own package.json + node_modules
│   ├── index.html, vite.config.js
│   ├── src/main.jsx, src/App.jsx  useReducer(gameReducer) + timer effects (ported from Expo App.js)
│   ├── src/scene/                three.js (via @react-three/fiber, @react-three/drei)
│   ├── src/hud/                  HTML/CSS overlay components
│   └── tests/                    Playwright smoke + layout tests
└── .github/workflows/web.yml     test → build → deploy to Pages
```

### core/

- `constants.js`, `deck.js`, `rules.js`, `ai.js`, `reducer.js`, `reducerHelpers.js`
  move from the root into `core/` with no behavior changes. The Expo app and
  `__tests__/` update their import paths. `elementIcons.js` stays with the Expo
  app since it renders RN components.
- The reducer keeps its existing contract: `state.phase`, `nextTransition`,
  `pending*` flags. The web `App.jsx` reproduces the timer effects from the Expo
  `App.js` (AI preview picks, ACK_FFA_REVEAL, AI king think, AI rebels respond,
  resolve duel, nextTransition).
- `getCardsWonBy` and `buildSkirmishState` stay in the reducer module.

### core/turnInfo.js (new, pure, unit-tested)

- `getStatus(state)` → `{ phaseLabel, progress, instruction }` for the banner, for example
  `{ phaseLabel: 'Free-for-all', progress: 'Trick 4 of 13', instruction: 'Pick a card, then press Play' }`.
  It covers every phase and sub-stage: picking, revealed/awaiting Continue,
  skirmish (and whether the human sits out), king choosing (human or AI),
  rebels responding, resolving, game over.
- `explainTrick(plays, players, winnerIdx)` → one-sentence reason, mirroring the
  branches of `simultaneousWinner`:
  only trump / highest trump / no trumps so highest rank / rank tie broken by
  defender element / rank tie broken by own element / random tiebreak.
- `explainLane(kingCard, rebelCard, kingElement, rebelElement, outcome)` → one
  sentence per lane, mirroring the branches of `resolveLane`.
- `getPhaseIntro(prevState, state)` → `null` or `{ kind, title, body, rule }` when a
  phase boundary is crossed: FFA start, skirmish start (with who's tied and
  why), king crowned, rebellion start (human's role and lane), game over.

`explainTrick` must agree with `simultaneousWinner` for every case. The tests
assert this directly by running both on the same inputs.

### web/src/scene (three.js)

- One `<Canvas>` with an orthographic or very shallow perspective camera looking
  down at the table (2.5D).
- `Card3D`: a thin box with front texture (rank + element color/icon drawn to a
  canvas texture) and a back texture. Flip is a rotation animated over ~0.3s.
  Selected cards lift, the winner glows, losing cards dim.
- `TrickArea` (FFA/skirmish): 4 slots, N/E/S/W. `LaneArea` (rebellion): 3 lanes,
  King card on top, rebel card below, result badge between them.
- `PlayerHand`: the human's fan. Card spacing is computed from available width
  so it never overflows. Hover/tap selects, and the selected card lifts.
- Opponent hands render as small face-down stacks with a count. Face-up only in dev mode.
- Animation uses a small tween helper driven by `useFrame` (no physics engine).

### web/src/hud (HTML/CSS)

- Layout is a CSS grid with named areas. The canvas sits in the center area,
  and every HUD element lives in its own grid area, so nothing can overlap.
  - Wide (landscape, ≥ 900px): banner across the top; opponent plates left/top/right;
    scoreboard left column; hand + primary button across the bottom.
  - Narrow (portrait): banner, compact opponent row, table, hand, primary
    button, scoreboard strip — stacked.
- `StatusBanner` renders `getStatus(state)`.
- `OpponentPlate`: name, element icon, tricks won, score, card count.
- `PrimaryButton`: one action button in its own grid area (never floating over cards) whose label changes:
  Play / Continue / Attack / Defend / New game. It is disabled with a reason
  when the action isn't available.
- `Callout`: shows `explainTrick` / `explainLane` text under the table after a
  reveal, until Continue.
- `PhaseIntro`: modal card from `getPhaseIntro`, dismissed by tap/click/Enter.
- `Scoreboard`, `DiscardLog` (cards played so far), `RulesHelp` (replaces HintButton).
- `DevPanel`: hidden unless dev mode. Toggles opponent hands face-up and the AI
  next-card highlight, and exposes the debug actions Skip to FFA end (with trick
  wins input), Skip to game over, and Return to FFA.
- Screens before play (element select, upgrades) are plain HTML pages styled to
  match. The three.js canvas is only mounted during play.
- Colors come from `core/constants.js` (`ELEMENTS`, `COLORS`) exposed as CSS
  variables. One spacing scale (4/8/12/16/24/32px) is used everywhere.

### Input and accessibility

- Mouse, touch, and keyboard: arrow keys move the selection through the hand,
  Enter/Space presses the primary button, Esc closes modals.
- HUD text is real HTML, so it scales with browser zoom and works with screen readers.

## Data flow

```
user input ─▶ dispatch(action) ─▶ core/reducer ─▶ state
                                                     │
            ┌────────────────────────────────────────┼──────────────────────┐
            ▼                                        ▼                      ▼
  timer effects (App.jsx)               scene/ (three.js reads state)   hud/ (reads state
  pending* / nextTransition ─▶ dispatch                                  + turnInfo selectors)
```

The three.js layer only reads state and reports clicks. It never decides game
outcomes. Animations are visual only; the reducer state is the source of truth.

## Error handling

- The reducer already ignores invalid actions (for example, commit with no card
  selected). The web UI also disables the primary button in those cases and
  shows why.
- If WebGL is unavailable, show a plain HTML message ("Your browser doesn't
  support WebGL") instead of a blank page.
- A React error boundary around the app shows a "Something went wrong — New
  game" screen instead of a white page.

## Testing

- **Unit (Jest, repo root):** all existing core tests pass after the move.
  New `turnInfo.test.js` covers `getStatus` for each phase and stage,
  `explainTrick` agreeing with `simultaneousWinner` (including tie-break
  branches, with `Math.random` mocked for the random branch), `explainLane` for
  every row of the lane table, and `getPhaseIntro` transitions.
- **Browser (Playwright, `web/tests`):**
  - Smoke: load the page, pick an element, start, select a card, press Play,
    see a callout, press Continue, with no console errors.
  - Layout: at 1280×720 and 390×844, assert that the bounding boxes of the HUD
    regions (banner, opponent plates, scoreboard, hand area, primary button) do
    not intersect, and that nothing overflows the viewport horizontally.
  - Dev-mode: `?debug` shows the dev panel; skip to FFA end works.
- **CI:** `.github/workflows/web.yml` runs the Jest + Playwright tests, builds
  `web/` with `base: '/avatar-card-game/'`, and deploys to GitHub Pages. Deploy
  only runs if tests pass.
- The Expo app has no automated UI tests (unchanged). After the `core/` move, it
  is checked by running the Jest suite and starting `npm run web` in Expo once.

## Repo / GitHub

1. Commit outstanding work (done).
2. Secrets scan of the working tree and history (done: none found).
3. Make `poland138/avatar-card-game` public; enable Pages with source "GitHub Actions".
4. Replace the Snack boilerplate `README.md` with a real one: what the game is,
   the play link, how to run the web and Expo versions, and how to test.
5. Update `CLAUDE.md` for the new layout (`core/`, `web/`, commands) so
   Claude Code sessions on the web pick it up.

## Build order

1. Repo: public + Pages enabled.
2. Move logic to `core/`; update imports; Jest green; Expo web boots.
3. `core/turnInfo.js` + tests.
4. `web/` scaffold: Vite + R3F, element select + upgrades screens, reducer wiring.
5. Scene: table, Card3D, hand, trick area, lanes, opponent stacks.
6. HUD: grid layout, banner, plates, scoreboard, primary button, callouts, intros, dev panel.
7. Playwright smoke + layout tests.
8. CI workflow → first Pages deploy; verify the live URL.
9. README + CLAUDE.md updates.

## Out of scope

- Staged one-by-one reveals, immersive 3D environment, particle effects.
- Sound, multiplayer, AsyncStorage/localStorage XP persistence (XP stays
  in-memory for now, as in the Expo app).
- Gameplay or AI rule changes.
- Changes to the Expo app's UI.
