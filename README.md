# Avatar Card Game

An elemental twist on Hearts. Four benders (Water, Fire, Earth, Air) battle in a
free-for-all to become King, then the other three rebel. First to 21 points wins the war.

**Play in your browser:** https://poland138.github.io/avatar-card-game/

## Project layout

| Folder | What it is |
|---|---|
| `core/` | Game rules, AI, deck and the reducer. Plain JavaScript shared by both apps. |
| `web/` | Browser version: React + three.js (React Three Fiber) + Vite. Deployed to GitHub Pages. |
| repo root | Original Expo / React Native mobile app. |

## Making changes and testing them in the browser

1. Make changes on a branch and open a pull request. Claude Code on the web does this for you.
2. Within about 3 minutes, a bot comments on the PR with a **preview link**
   (`…/avatar-card-game/pr-preview/pr-<number>/`). Play-test there.
3. Merge the PR. About 3 minutes later the live site updates. If you still see
   the old version, hard-refresh (Ctrl+Shift+R).

Every push runs all tests. The live site only updates when they pass.

## Run the browser version locally

```bash
cd web
npm install
npm run dev        # http://localhost:5173/
```

Add `?debug` to the URL, or press the backtick key, for developer tools.

## Tests

```bash
npx jest                        # core logic (repo root, after npm install there)
cd web && npm test              # layout + button logic (Vitest)
cd web && npx playwright test   # real-browser tests at desktop + two phone sizes
cd web && npm run shot          # screenshots of key screens (needs npm run dev running)
```

## Run the mobile (Expo) version

```bash
npm install
npm start
```

## Disclaimer

A non-commercial fan project. *Avatar: The Last Airbender* and related names
belong to Nickelodeon / Paramount; this project is not affiliated with or
endorsed by them.
