# Web Port (three.js) — Design

Date: 2026-10-03
Status: Approved in brainstorming; revised after independent plan review (consensus reached)

## Goal

Make the Avatar Card Game playable in a browser, built with three.js, hosted on
GitHub Pages from a public repo so it can be edited with Claude Code on the web
and tested at a public URL, including a preview link for every pull request.
Along the way, rebuild the UI so spacing is consistent and nothing overlaps, and
make the turn flow easier to follow.

The existing Expo / React Native app is **kept** and continues to work. Both apps
share one copy of the game logic.

## Decisions

| Topic | Decision |
|---|---|
| Expo app | Keep. Shares game logic with the web app via `core/`. |
| Stack | React 19.3 + React Three Fiber 9 (three.js) + Vite 8. HUD is HTML/CSS. |
| Visual style | Flat 2.5D: top-down table like today, with depth, shadows, card flips and smooth movement. |
| Turn-flow features | Status banner + step guide, "why it won" callouts, phase intro screens. (Staged one-by-one reveals: not wanted.) |
| Debug / peek tools | Hidden dev mode, toggled by backtick key or `?debug` URL param. Collapsible bar below the game. |
| Screens | Responsive. Tested at 1280×720 (desktop), 390×844 (phone) and 390×664 (phone with browser chrome). |
| Hosting | Public repo. GitHub Pages served from the `gh-pages` branch: `main` deploys to the root, and every same-repo PR gets a preview at `/pr-preview/pr-N/`. |

## Architecture

```
avatar-card-game/                 repo root
├── core/                         shared pure game logic — no React, no RN imports
│   ├── constants.js deck.js rules.js ai.js
│   ├── reducer.js reducerHelpers.js
│   └── turnInfo.js               NEW
├── __tests__/                    Jest tests for core/ (existing + turnInfo)
├── App.js, *View.js, …           Expo app, unchanged except imports → ./core/…
├── metro.config.js               NEW: keeps Metro from crawling web/
├── web/                          NEW browser app, own package.json + node_modules
│   ├── index.html, vite.config.js (base './')
│   ├── src/App.jsx               useReducer(gameReducer) + timer effects (ported from Expo App.js)
│   ├── src/scene/                three.js (via @react-three/fiber)
│   ├── src/hud/                  HTML/CSS overlay components
│   └── tests/                    Playwright smoke + layout tests
└── .github/workflows/web.yml     test → deploy main to gh-pages; PR previews
```

### core/

- `constants.js`, `deck.js`, `rules.js`, `ai.js`, `reducer.js`, `reducerHelpers.js`
  move from the root into `core/` with no gameplay changes. The Expo app and
  `__tests__/` update their import paths. `elementIcons.js` stays with the Expo
  app since it renders RN components.
- The reducer keeps its existing contract (`state.phase`, `nextTransition`,
  `pending*` flags). Additive, protective changes:
  - `revealedTrick` gains `reason` (see below).
  - New field `lastRebellion = { kingIdx, held, duels: { king, rebellion }, points, xp } | null`
    is set when a rebellion ends and cleared by `START_GAME`, `DEAL_REBELLION`,
    `DEAL_FFA`, `RETURN_TO_FFA`, `SKIP_TO_FFA_END` and `SKIP_TO_GAMEOVER`. Intros read it to
    report points and XP earned.
  - `COMMIT_FFA_TURN` ignores the action while a trick is already revealed, so a
    double Play (for example, auto-play racing a keypress) can't play an extra trick.
- `getCardsWonBy` and `buildSkirmishState` stay in the reducer module.

### core/turnInfo.js (new, pure, unit-tested)

- `getStatus(state)` → `{ phaseLabel, progress, instruction }` for the banner, for example
  `{ phaseLabel: 'Free-for-all', progress: 'Trick 4 of 13', instruction: 'Pick a card to play.' }`.
  It covers every phase and sub-stage, including skirmish spectating.
- `explainTrick(trick, players)` → one-sentence reason. `rules.js` gains
  `resolveTrick(plays, players)` → `{ winner, reason }` (`simultaneousWinner`
  becomes a thin wrapper), and the reducer stores `reason` on `revealedTrick`.
  Reasons: only trump / highest trump / no trumps so highest rank / rank tie
  broken by defender element / tied trumps go to the earlier seat / random tiebreak.
- `explainLane({ kingCard, rebelCard, kingElement, rebelElement, kingName, rebelName })`
  → `{ result, text }`, built on a new `resolveLaneDetailed` in `rules.js`
  (`resolveLane` becomes a thin wrapper). `explainDuel(state)` maps it over all 3 lanes.
- `getPhaseIntro(prevState, state)` → `null` or `{ kind, title, body, rule }` when a
  phase boundary is crossed:
  - FFA start, or "King overthrown" with the duel score;
  - skirmish start, with who's tied and why;
  - rebellion start: King crowned, or crown held with "+N pts, +X XP", the human's role and lane, and the streak multiplier.
  Game over is its own screen.

Because each reason comes from the same function that picks the winner, an
explanation can never disagree with the actual result.

### web/src/scene (three.js)

- One `<Canvas>` with an orthographic camera (zoom 1, so 1 world unit = 1 CSS
  pixel) looking straight down at the table. `frameloop="demand"`: frames
  render only while something is moving.
- A pure `layoutTable(state, geometry, ui)` decides every card, slot and badge
  position. Card size is solved from the table's height and width. Hands over 13
  cards switch to two rows when one row would be too cramped to tap.
- `Card3D`: front and back planes with canvas-drawn textures (rank and element
  glyph). It flips by rotating over ~0.3s, slides toward its layout target, lifts
  when selected, glows when it wins, and dims when it loses.
- `TrickArea` slots (FFA/skirmish): 4 seats. Rebellion: 3 lanes, King card on
  top, rebel card below, KING/REBEL/DRAW badge between them.
- Opponent hands are not drawn on the table. Their card counts live in the HTML
  opponent plates; in dev mode the plates list the cards face-up.

### web/src/hud (HTML/CSS)

- Layout is a CSS grid with named areas. The canvas sits in the table area
  (minimum 240px tall), and every HUD element owns its own area, so nothing can
  overlap.
  - Wide (≥ 900px and landscape): banner across the top; left column = scoreboard
    above the west plate; north plate above the table; right column = east plate;
    callout and action button below the table.
  - Narrow: banner, a row of three compact plates, table, callout, action button,
    then a one-line score strip.
- `StatusBanner` renders `getStatus(state)` and holds the Rules / Log buttons.
- `OpponentPlate`: element glyph, name, role tag (King / Lane N / Out), tricks,
  cards and points on one line.
- `PrimaryButton`: one action button in its own grid area (never floating over
  cards) whose label changes: Play / Continue / Attack / Defend. It is disabled
  with a reason when the action isn't available.
- `Callout`: the `explainTrick` sentence, or the duel headline. Per-lane reasons
  show inline on wide screens and behind a "Why?" button on narrow screens.
- `PhaseIntro`: modal card from `getPhaseIntro`, dismissed by tap/click/Enter.
- `Scoreboard`, `LogModal` (cards played so far), `RulesModal`.
- `DevPanel`: hidden unless dev mode. When on, a 32px "Dev ▸" bar sits below the
  game grid. Expanding it shows toggles for face-up opponent hands and the AI
  next-card highlight, and the debug actions Skip to FFA end, Skip to game over
  and Return to FFA. It collapses again after each debug action.
- While an intro or any modal is open, AI timers pause.
- When the human sits out a skirmish, its tricks auto-play (Play after 0.9s,
  Continue after 1.5s), so the human just watches.
- Screens before play (element select, upgrades) and after (game over) are plain
  HTML pages styled to match. The canvas is only mounted during play.
- CSS colour tokens mirror `core/constants.js` `COLORS` by hand. Element colours
  are injected per element as CSS custom properties. One spacing scale
  (4/8/12/16/24/32px) is used everywhere.

### Input and accessibility

- Mouse, touch, and keyboard: arrow keys move the selection through the hand,
  1/2/3 place the King's selected card in a lane, Enter/Space presses the primary
  button, Esc closes modals.
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

- The reducer already ignores invalid actions, and `COMMIT_FFA_TURN` now also
  ignores repeats. The web UI disables the primary button and shows why.
- If WebGL is unavailable, show a plain HTML message instead of a blank page.
  The check runs once per page load and releases its probe context.
- A React error boundary shows a "Something went wrong — New game" screen
  instead of a white page.

## Testing

- **Unit (Jest, repo root):** all existing core tests pass after the move. New and extended tests cover:
  - every `resolveTrick` and `resolveLaneDetailed` reason;
  - the `COMMIT_FFA_TURN` guard and the `lastRebellion` lifecycle;
  - `getStatus` for every phase and stage;
  - `explainTrick` for every reason, and `explainLane` for all 9 lane reasons plus "no defender";
  - `explainDuel` agreeing with the reducer's `laneOutcomes`;
  - `getPhaseIntro` transitions, including that debug Return to FFA does not say "overthrown".
- **Unit (Vitest, web):** `layoutTable` puts every card, slot and badge inside the
  table with no overlaps. This is checked at 374×200, 374×260, 374×430 and 780×470,
  for FFA, a human-King duel, and 21- and 24-card hands. `getPrimaryAction` is
  covered for every state.
- **Browser (Playwright, `web/tests`):** desktop, phone and short-phone projects.
  - Smoke: play a trick with the keyboard and confirm the canvas renders. Rules and Log open and close. No console errors.
  - Layout: the HUD regions never intersect or leave the viewport, and the page never scrolls.
  - Dev mode: skip to the Rebellion as King and play a duel with the keyboard. Lane explanations appear (inline or via Why?). The table stays at least 240px tall.
- **CI:** `.github/workflows/web.yml` runs Jest, Vitest and Playwright.
  - `main`: deploys the build to the `gh-pages` root only if everything passes.
  - Same-repo PRs: get a preview deploy and a PR comment with the link. Closing the PR removes the preview.
  - Test screenshots are uploaded as an artifact on every run.
- **Expo app:** checked after the `core/` move and again after `web/` exists, using
  `npx expo export --platform android`. `react-native-web` isn't installed, so
  Expo web isn't a check.

## Repo / GitHub

1. Commit outstanding work (done).
2. Secrets scan of the working tree and history (done: none found).
3. The user chooses a license (`package.json` already says 0BSD; no LICENSE file
   exists) and acknowledges the fan-project IP note. Then the repo is made public.
4. The first `main` deploy creates the `gh-pages` branch. Then Pages is enabled
   with source = `gh-pages` branch, root, and `.nojekyll` is shipped in the build.
5. Replace the Snack boilerplate `README.md` with a real one: what the game is,
   the play link, how PR previews work, and how to run and test both versions.
6. Update `CLAUDE.md` for the new layout so Claude Code sessions on the web pick it
   up. It also tells them to rely on PR CI and preview links when the sandbox
   can't run Playwright.

## Out of scope

- Staged one-by-one reveals, immersive 3D environment, particle effects.
- Sound, multiplayer, persisting XP (stays in-memory, as in the Expo app).
- Gameplay or AI rule changes.
- Changes to the Expo app's UI.
