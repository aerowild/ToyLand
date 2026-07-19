# Math Quest — Agent Guide

3D math game for **ages 6–8 (Grade 1 → 2 → 3)**. React + Vite + Three.js (react-three-fiber) + GSAP.

## Product goal & hard constraints (read first)
- **Audience:** one child, currently entering Grade 2 (SFUSD / California). Scope follows **CA Common Core** (grades 1–3). Reading is OK but keep it light and voice-supported.
- **Curriculum ladder (CA CCSS):** G1 add/sub within 20 (fluent within 10), place value tens/ones, time hour/half, halves/fourths → G2 add/sub within 100 fluent (within 1000 w/ strategies), **arrays/repeated addition = multiplication foundation**, place value to 1000, money, time to 5 min, thirds → G3 **multiply/divide within 100**, fractions as numbers on a number line + equivalence, area as multiplication, time to minute.
- **Sequencing decision (owner):** master **add/sub first, then multiplication, then division.**
- **Non-negotiables:** (1) glitch-free; (2) no math-logic errors; (3) puzzles must NOT be solvable by random clicking or blind guessing; (4) the child should not feel like they're "doing math" (disguise it as play).
- **Two learning layers, by design:** the **Runner** timed multiple-choice puzzles are the *mental-math fluency drill* (recall 8+9 fast, with the step-wise `MathTutor` on a miss) — keep them, but QA ("police") them. The **3D Math Quest** stages are the *conceptual, disguised* puzzles — these are where "not solvable by guessing" matters most.

## Run
```bash
npm install
npm run dev      # http://localhost:8888 (port set in vite.config.js)
npm run build    # verify after every change
```

## Playtest (headless browser — works in this WSL env)
- `playwright` + `vitest` are devDependencies. Chromium headless shell is installed under `~/.cache/ms-playwright`.
- The dev server is reachable from WSL at `http://localhost:8888` (returns 200).
- `scripts/playtest.mjs` (tracked, reusable) loads the app, dismisses the daily "Star Chest" modal, and captures console + page errors + screenshots to `scratch/shots/`. Modes: `node scripts/playtest.mjs` (walk nav views) or `node scripts/playtest.mjs stages` (admin-unlock + walk all 24 3D stages).
- Verified 2026-07-18: 0 console/page errors across all nav views AND all 24 stages.
- Caveats: headless uses **software WebGL** (no GPU) so perf warnings + occasional black 3D frames are environment artifacts, not necessarily app bugs; emoji render as tofu boxes. **Known:** the bridge stages (1/9/17) render black under software WebGL while all other stages render — believed SwiftShader-only (needs confirmation in real GPU Chrome). Always sanity-check a suspected 3D bug against real Chrome.

## Architecture
- `src/App.jsx` — dashboard + global state (`useReducer`). Views: dashboard, mathquest3d, sandbox, classic-labs, stats, shop3d, graduation, mini-*. localStorage keys use `toy_land_` prefix. Admin password: `12345`.
- `src/components/MathQuest3D.jsx` — the 3D game. 8 puzzle types: `bridge, hill, sub_bridge, area, electricity, clock, fraction, pattern`. `PuzzleScene` renders each; `checkAnswer` runs win/lose animations.
- `src/components/Hero3D.jsx` — robot character. Gear index 0–23 maps 1:1 to `FEATURE_NAMES` (keep them aligned). Shop items use string ids.
- `src/components/RunnerGame.jsx` — endless runner woven between stages. `StaticWorld` (memoized) renders the colorful city once and scrolls it via refs; an imperative `engine` ref drives lanes/jump/duck, spawning, collision, power-ups, and checkpoints (re-renders only on item spawn/despawn + 10/s HUD ticks). Obstacles: car/bike/bicycle/pedestrian/animal/barrier with `behavior` (oncoming / cross) and overhead (duck-under) gates. Power-ups: magnet, jetpack, boost, double, shield. Teleporters → `QuizModal` (sometimes timed). Checkpoints (~900m) make you cross one of the 8 math levels (`MathQuest3D checkpointMode`) then a 5→1 celebration; securing one gives a one-time crash respawn that is then consumed. Props: `level, features, unlockedFeatures, petColor, petAccessory, onEarnReward(coins, featureIdxs[]), onExit`.
- `src/components/MiniGames.jsx` — Cookie/SeeSaw/Alligator mini-games.
- `src/components/MathTutor.jsx` — animated, voiced "how to solve it" mini-lesson for a missed add/subtract problem. Picks a proven strategy (count-on / make-a-ten / count-up / place-value), renders a number line / ten-frames / place-value visual, narrates each step, skippable. Used by the runner `QuizModal` (auto on timed fail; "Show me how" button on non-timed).
- `src/utils/mathQuestState.js` — 24 static stage configs (`getStageParams`), `FEATURE_NAMES`, `EVOLUTION_TITLES`, hints, praise, `calculateStars`.
- `src/utils/profileStore.js` — kid profiles + adaptive arithmetic engine (localStorage `toy_land_profiles_v1`). `SKILLS` ladder (8 add/sub only), `getAdaptiveProblem(level)` (spaced repetition: repeat failing skills, relax with mastered, introduce harder slowly), `recordPuzzleResult(skillId, ok, ms)`, `getStats()` for the parent report, `ensureProfile/createProfile/setActiveProfile/listProfiles/getActiveProfile`.
  - **CAVEAT (known gap):** the adaptive engine is wired **only** to `RunnerGame`. The 24-stage 3D Math Quest is static and does NOT feed mastery/spaced-repetition. Ladder has **no multiplication/division/place-value** yet. Spaced-repetition intervals are minute-scale (session-local), not day-scale. See Phase 2 in `.agent/todo.md`.
- `src/utils/sound.js` — synth SFX (`playSound`: click, pop, sad, whoosh, chime, coin, buzz, crash, powerup) plus: `playCrash(cause)`, `playPowerup(power)`, `playCoinPitch()`, `playTick(urgent)`, `speakPedestrian(kind)` (browser speech, kid-safe only), `startBackgroundMusic/stopBackgroundMusic` (runner) and `startCalmMusic/stopCalmMusic` (math stages).
- `App.jsx` wraps the runner in an `ErrorBoundary` (shows the error + Try Again/Home instead of white-screening); both 3D Canvases guard `webglcontextlost`.
- `public/legacy-vanilla/` — 14 classic 2D games loaded via iframe (`?game=labX`).

## Rules
- All stage `clicks` are STATIC and the target must be reachable; never randomize.
- Themes by tier: stages 1–8 forest, 9–16 lava, 17–24 space (`getThemeForStage`).
- Keep gameplay/feedback non-revealing. NOTE (known bug to fix in Phase 1): `MathQuest3D.checkAnswer` currently DOES reveal the exact gap on a wrong answer ("Need 3 more!", "Cut 6 more") — this lets a child converge without doing the math and violates constraint #3. Change to directional, non-numeric feedback + a capped-attempts tutor.
- Water/fall + crocodile only on `bridge/hill/sub_bridge`; other stages cheer/stumble in place.
- All audio is original synth (no copyrighted music); spoken pedestrian lines are kid-safe only (no profanity — audience is 7-year-olds).
- Runner perf: keep static scenery in the memoized `StaticWorld` (ref-scrolled) and avoid per-frame React re-renders; never reference Hero3D-only effect components inside `RunnerGame`.
- Run `npm run build` to verify; clean up temp files.

## .agent/
- `plan.md` — append-only plan log (never trim).
- `todo.md` — current prioritized tasks.
- `changelog.md` — short per-change notes.
- `llm_bench_results.md` — standardized local-LLM benchmark results (see below).

## Local LLM offload (optional, via MCP)
The owner runs **LM Studio** on the Windows host (RTX 4090 + 3090, 192GB RAM, i9-13900K), exposed to
the agent through an MCP bridge script at `/home/katiyar/software/mcp/local_bridge.py` (tool
`query_local_model(prompt)`), which proxies to the OpenAI-compatible endpoint.
- **Endpoint:** `http://<wsl-default-gateway>:1234/v1` (the Windows host from WSL; get the IP with
  `ip route | awk '/default/{print $3}'` — it can change between reboots). List models: `curl http://<ip>:1234/v1/models`.
- **The MCP tool only appears after a fresh `kiro-cli chat` start** (MCP loads at startup). Check with `/mcp`.
  If you need it mid-session and it's absent, call the endpoint directly via `shell`+`curl` (same result).
- **WHEN TO USE IT:** offline/**batch content generation** where quality matters but latency doesn't —
  misconception-distractor banks, problem sets, narration/hint drafts, test fixtures. It's local ("free"
  tokens), so it takes bulk generation off the cloud. Generate small batches per call; always keep the
  human/agent in the loop to **verify** output (never ship generated math unchecked — run `npm test`).
- **WHEN NOT TO USE IT:** anything latency-sensitive, in the kid's real-time game loop, or high-volume-fast.
- **IF OFFLINE / unreachable:** `curl` times out or the tool errors → **do the work yourself** (don't block).
  The local LLM is a cost optimization, never a dependency. Nothing in the shipped app depends on it.
- **Known model caveat (2026-07-18):** the loaded `qwen/qwen3.6-35b-a3b` is a **reasoning model** —
  thinking CANNOT be disabled (`/no_think`, `enable_thinking:false` ignored) and ~96% of output tokens are
  hidden reasoning (`reasoning_content`); a trivial one-liner still costs ~14s. Correctness is high (4/4 on
  the suite). For bulk work a **non-reasoning instruct model** (e.g. Qwen2.5-32B-Instruct / Qwen2.5-Coder-32B)
  is far more efficient. Always set `max_tokens` high for reasoning models or `content` returns empty.
- **Benchmark before trusting a new model:** `node scripts/llm_bench.mjs <model-id>` runs a fixed suite and
  appends a comparable row to `.agent/llm_bench_results.md`.
