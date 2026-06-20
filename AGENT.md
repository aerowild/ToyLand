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
- `src/components/RunnerGame.jsx` — endless runner woven between stages. `StaticWorld` (memoized) renders the colorful city once and scrolls it via refs; an imperative `engine` ref drives lanes/jump/duck, spawning, collision, power-ups, and checkpoints (re-renders only on item spawn/despawn + 10/s HUD ticks). Obstacles: car/bike/bicycle/pedestrian/animal/barrier with `behavior` (oncoming / cross) and overhead (duck-under) gates. Power-ups: magnet, jetpack, boost, double, shield. Teleporters → `QuizModal` (sometimes timed). Checkpoints (~900m) make you cross one of the 8 math levels (`MathQuest3D checkpointMode`) then a 5→1 celebration; securing one gives a one-time crash respawn that is then consumed. Props: `level, features, unlockedFeatures, petColor, petAccessory, onEarnReward(coins, featureIdxs[]), onExit`.
- `src/components/MiniGames.jsx` — Cookie/SeeSaw/Alligator mini-games.
- `src/utils/mathQuestState.js` — 24 static stage configs (`getStageParams`), `FEATURE_NAMES`, `EVOLUTION_TITLES`, hints, praise, `calculateStars`.
- `src/utils/profileStore.js` — kid profiles + adaptive arithmetic engine (localStorage `toy_land_profiles_v1`). `SKILLS` ladder (8 add/sub), `getAdaptiveProblem(level)` (spaced repetition: repeat failing skills, relax with mastered, introduce harder slowly), `recordPuzzleResult(skillId, ok, ms)`, `getStats()` for the parent report, `ensureProfile/createProfile/setActiveProfile/listProfiles/getActiveProfile`.
- `src/utils/sound.js` — synth SFX (`playSound`: click, pop, sad, whoosh, chime, coin, buzz, crash, powerup) plus: `playCrash(cause)`, `playPowerup(power)`, `playCoinPitch()`, `playTick(urgent)`, `speakPedestrian(kind)` (browser speech, kid-safe only), `startBackgroundMusic/stopBackgroundMusic` (runner) and `startCalmMusic/stopCalmMusic` (math stages).
- `App.jsx` wraps the runner in an `ErrorBoundary` (shows the error + Try Again/Home instead of white-screening); both 3D Canvases guard `webglcontextlost`.
- `public/legacy-vanilla/` — 14 classic 2D games loaded via iframe (`?game=labX`).

## Rules
- All stage `clicks` are STATIC and the target must be reachable; never randomize.
- Themes by tier: stages 1–8 forest, 9–16 lava, 17–24 space (`getThemeForStage`).
- Keep gameplay/feedback non-revealing (don't tell the child the remaining amount).
- Water/fall + crocodile only on `bridge/hill/sub_bridge`; other stages cheer/stumble in place.
- All audio is original synth (no copyrighted music); spoken pedestrian lines are kid-safe only (no profanity — audience is 7-year-olds).
- Runner perf: keep static scenery in the memoized `StaticWorld` (ref-scrolled) and avoid per-frame React re-renders; never reference Hero3D-only effect components inside `RunnerGame`.
- Run `npm run build` to verify; clean up temp files.

## .agent/
- `plan.md` — append-only plan log (never trim).
- `todo.md` — current prioritized tasks.
- `changelog.md` — short per-change notes.
