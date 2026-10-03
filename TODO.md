# TODO — Avatar Card Game

Running list of things still to implement, polish, or revisit. Items get added here when discovered and removed when done (don't archive — git history is the archive).

## Persistence

- [ ] **Wire XP to AsyncStorage.** Today, `App.js` uses a module-level `let xpCache` so XP survives in-session re-renders but is wiped on app reload. `@react-native-async-storage/async-storage` is already a dependency. Replace the `useEffect` save/load pair in `App.js` with real `AsyncStorage.getItem('xp')` / `setItem('xp', JSON.stringify(state.xp))`. Keep the merge-with-`ZERO_XP` guard so adding a new element doesn't crash old saves.

## Polish / known rough edges

- [ ] FFA view and Rebellion view files are each ~20KB. Extract sub-components when natural seams appear; don't refactor for the sake of it.
- [ ] `UPGRADE_STUBS` in `constants.js` are placeholders — none of the effects are actually applied during play.
- [ ] No animations on card reveal / duel resolution (`TIMING.*` constants are mostly 0).

## Infra

- [ ] Web: persist XP in `localStorage` (the browser twin of the AsyncStorage TODO above).
- [ ] Decide on native release flow (EAS Build) when the Expo app is ready; the web build already deploys to GitHub Pages on every push to main.

## Open questions

- [ ] Sound effects? Background music?
- [ ] Multiplayer (local pass-and-play, or networked) — out of scope for now but worth noting if/when it comes up.
