# Math Quest — Agent Guide

3D math game for 7-year-olds (Grade 1 & 2). React + Vite + Three.js (react-three-fiber) + GSAP.

## Run
```bash
npm install
npm run dev      # http://localhost:8888 (port set in vite.config.js)
npm run build    # verify after every change
```

## Architecture
- `src/App.jsx` — dashboard + global state (`useReducer`). Views: dashboard, mathquest3d, sandbox, classic-labs, stats, shop3d, graduation, mini-*. localStorage keys use `toy_land_` prefix. Admin password: `12345`.
- `src/components/MathQuest3D.jsx` — the 3D game. 8 puzzle types: `bridge, hill, sub_bridge, area, electricity, clock, fraction, pattern`. `PuzzleScene` renders each; `checkAnswer` runs win/lose animations.
- `src/components/Hero3D.jsx` — robot character. Gear index 0–23 maps 1:1 to `FEATURE_NAMES` (keep them aligned). Shop items use string ids.
- `src/components/RunnerGame.jsx` — endless runner between stages. Teleporter portals trigger an arithmetic `QuizModal` (reward = +coins, +shield, unlock a hero gear); crash → solve-to-continue or finish. Props: `level, features, unlockedFeatures, petColor, petAccessory, onEarnReward(coins, featureIdxs[]), onExit`.
- `src/components/MiniGames.jsx` — Cookie/SeeSaw/Alligator mini-games.
- `src/utils/mathQuestState.js` — 24 static stage configs (`getStageParams`), `FEATURE_NAMES`, `EVOLUTION_TITLES`, hints, praise, `calculateStars`.
- `src/utils/sound.js` — synth sounds: `click, pop, sad, whoosh, chime, coin, buzz`.
- `public/legacy-vanilla/` — 14 classic 2D games loaded via iframe (`?game=labX`).

## Rules
- All stage `clicks` are STATIC and the target must be reachable; never randomize.
- Themes by tier: stages 1–8 forest, 9–16 lava, 17–24 space (`getThemeForStage`).
- Keep gameplay/feedback non-revealing (don't tell the child the remaining amount).
- Water/fall + crocodile only on `bridge/hill/sub_bridge`; other stages cheer/stumble in place.
- Run `npm run build` to verify; clean up temp files.

## .agent/
- `plan.md` — append-only plan log (never trim).
- `todo.md` — current prioritized tasks.
- `changelog.md` — short per-change notes.
