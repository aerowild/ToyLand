# Agent Plan: 3D Math Playground for Grade 1 & 2

NOTE TO AGENT: This file is organized from oldest plans at the top to the latest plan appended at the bottom. Do NOT trim historical plans. Always append new plans to the bottom.

## Phase 1: Assessment and Baseline
- Setup AGENT.md and .agent/ directory structure.
- Analyze existing codebase (index.html, app.js, evolution3d.html, evolution3d.js, style.css, evolution3d.css).
- Identify improvements for 3D educational game mechanics (Take Out, Multiplication, Addition, Subtraction, Equations) targeting ages 6-7.

## Phase 2: Pediatric Math Gameplay Upgrades
- **Take Out (Log Trimming in `sub_bridge`)**:
  - Fix scaling axis (scale local `y` instead of `x` for Cylinder height).
  - Anchor log left end to the left bank and animate the right tip shrinking back/extending forward dynamically.
- **Addition (Bridge Gap in `bridge`)**:
  - Fix subtraction/removal interaction: instead of adding red blocks forward, make negative blocks dynamically shrink/delete the trailing bridge blocks.
- **Addition/Subtraction (Stair Stacking in `hill`)**:
  - Make block height proportional to the number value (e.g. height = `val * unitHeight`) so visual scale matches mathematical weight.
  - Implement subtraction (digging) to physically remove/shrink stair blocks from the top.
- **Equations (Weight Balancing in `balance`)**:
  - Change positive weights to blue heavy spheres falling onto the scale.
  - Change negative "Lift" weights to floating red balloons that pull the scale *up* from above.

## Phase 3: React + React Three Fiber Migration
- Scaffold new project using Vite + React.
- Install native dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`.
- Re-architect 3D math puzzles as modular React Three Fiber components.
- Port synthetic sound generator to modular React utility.
- Build clean state machine for 20 stages, evolution levels, and coin rewards.
- Design premium dashboard lobby in App.jsx.

## Phase 4: Resolution of Server Issues & Syntax Hotfix
- Identified that the browser was receiving import resolution errors under python `http.server` (since a static server cannot resolve bare module specifiers).
- Stopped the `http.server` background task on port 8888.
- Started the native Vite development server using `npm run dev -- --port 8888 --host 127.0.0.1` so that the app compiles and is served properly on the same port.
- Verified that the Vite server has bundled and optimized all required React, React Three Fiber, Three.js, and GSAP dependencies successfully, and is serving a fully functional web page.

## Phase 5: Environment Graphics, Camera Rig, and Decoy Math Choices
- Identified and fixed vertical alignment offsets (sinking character) where the hero's position Y did not match the platforms due to local origin differences in the React model. Aligned `initY` and `endY` values to place the hero directly on the top surface of cliffs, bridges, logs, and stairs.
- Created a dynamic `CameraRig` component inside `src/components/MathQuest3D.jsx` to animate camera position and target depending on stage type, preventing the viewport from being "too much zoomed in".
- Refactored environment styling inside the Canvas: integrated proper color presets (murky blue-green for river, warm orange-red for lava, lavender purple for grids, pastel yellow for equations) and attached reactive fog parameters.
- Expanded the `clicks` configuration inside `src/utils/mathQuestState.js` to provide decoy answers (multiple-choice buttons) rather than displaying only the exact digits that make up the target sum, urging children to calculate and think.

## Phase 6: Classic 2D Game Suite Restoration & Profile Sync Bridge
- Copied all 14 classic 2D games, assets, and shops from `legacy-vanilla/` to `public/legacy-vanilla/` to be served as static files by Vite.
- Embedded the classic 2D dashboard directly inside a premium iframe view in `src/App.jsx`.
- Setup a bidirectional sync bridge for stars and coins in localStorage. When returning from the classic labs or performing state updates, the React App re-reads the stars from `toy_land_profile` and syncs them to `toy_land_stars`, ensuring that accomplishments in the 2D games directly trigger 3D hero evolution.
- Added a new Navigation tab and a featured dashboard lobby card to let players access the 14 classic 2D mini-games and sticker shop.

## Phase 7: Character Visibility, Subtraction Options & 14-Game React Selector
- **Character Visibility Bug (Local Origin Overwrite)**:
  - Discovered that the R3F `useFrame` animation loop in `Hero3D.jsx` was overwriting the top-level group position `y` to `0` or near `0` (idle breathing/walking bounce) every single frame. This counteracted the parent-assigned `position` prop (e.g. `1.6`, `0.6`), causing the character to sink below water/lava/terrain and vanish.
  - Resolved this by introducing an inner group inside `<Hero3D>` that receives the `heroRef` for animation offsets, while the outer group retains absolute position values from parent props.
- **Level Clearing Flow**:
  - Re-routed the 3D Math Quest cleared callback: instead of immediately booting players out to the profile/stats tab after completing a stage, the game displays a beautiful in-game modal popup showing total stars earned, customized cosmetics unlocked, and button choices to play the next stage immediately, view character evolution, or exit to lobby.
- **Enhanced Pedagogical Choice**:
  - Expanded stage math click configs to include subtraction options (`-1`, `-2`, `-3`, etc.) in all addition/equation levels, enabling children to correct mistakes (over-stacking or over-bridging) dynamically.
- **Integrated 2D Game Grid**:
  - Replaced the simple iframe view on the React dashboard and nav with a premium React cards selector listing all 14 classic games, rewards shop, parent stats report, and printable activity kit.
  - Injected URL search parameter routing (`?game=labX`) into the legacy app startup sequence to allow the React grid to launch the iframe directly into a specific game, with smooth back-navigation.
- **Runtime ReferenceError Hotfix**:
  - Found a runtime crash in the 3D client console: `stairTotalHeight` was being referenced inside `checkAnswer` on level check, but it was scoped as a local prop to the nested `<PuzzleScene>` component rather than being a global/module constant.
  - Defined `stairTotalHeight = 3.0` as a local constant at the top of the `<MathQuest3D>` component, resolving the crash and restoring full hill stage functionality.


## Phase 8: Transitioning to the Fully-Developed Native 3D Game with postMessage Bridge
- **Pivoting to the Vanilla Three.js 3D Game**:
  - Found that the original, fully-developed 3D game (written in vanilla Three.js in `legacy-vanilla/evolution3d.js` and `BU/grade1_grade2/evolution3d.js`) is coordinate-perfect, has advanced animations, sound, de-bridging subtraction, balloon lifts, and 20 complete stages, which was replaced by a buggy React Three Fiber mockup.
  - Copied `evolution3d.html`, `evolution3d.js`, and `evolution3d.css` to the static `public/legacy-vanilla/` directory.
  - Replaced the React Three Fiber container inside `App.jsx` with an iframe pointing to `/legacy-vanilla/evolution3d.html`.
- **Bidirectional postMessage Synchronization**:
  - Implemented event message routing: React parent listens for `evolution3d_ready` and replies with `evolution3d_init` containing current stage, stars, and unlocked features.
  - React listens for `evolution3d_reward` (level complete) to update profile stars, increment the current stage, unlock character cosmetics, and save the updated profile.
  - React listens for `evolution3d_close` to cleanly return to the playground lobby.
- **Bundle Optimization**:
  - Pivoting away from direct R3F canvas bundling for gameplay reduced the production chunk size by over `120 KB`, improving browser load times.

## Phase 9: Fixing Legacy 3D Game Bugs (Height Clipping, Decoy Math Choices & Subtraction Undo)
- **Character Height Clipping Bug**:
  - Found that `idleAnimation(time)` in `evolution3d.js` was directly overwriting `characterGroup.position.y` to a small float value (`breathe`), ignoring the stage pedestal/cliff height `state.baseY`. This caused the character to instantly sink through platforms/bridges on stage load and when stopping.
  - Resolved this by updating the assignment to `(state.baseY || 0) + breathe` in both `public/legacy-vanilla/evolution3d.js` and `legacy-vanilla/evolution3d.js`.
- **Pedagogical Answer Choices & Decoys**:
  - Identified that stage choices generated in `getStageParams` only presented the exact digits needed to sum to the target.
  - Rewrote `getStageParams` to dynamically generate decoy numbers and wrong combinations, prompting kids to actually calculate the solutions.
- **Mistake Correction with Subtraction Options**:
  - Integrated standard subtraction/negative options (such as `-1`, `-2`) in bridge building, stair climbing, and see-saw balancing levels, and add-back options in log slicing levels, allowing children to undo mistakes if they exceed the target.
- **Double Directory Synchronization**:
  - Applied the edits symmetrically to `/legacy-vanilla/evolution3d.js` and `/public/legacy-vanilla/evolution3d.js` to ensure the updates load correctly regardless of whether the page is served dynamically or statically.

## Phase 10: Native React Three Fiber Restoration & 3D Bug Fixes
- **iframe Reversion & Native Mount**:
  - Replaced the legacy static iframe container in `src/App.jsx` with the native `<MathQuest3D>` component. This ensures all modifications are compiled directly by Vite and served in the main single-page React app.
- **Root Entry Restoration**:
  - Overwrote the root `index.html` to serve as the React app mount point (`src/main.jsx`), and cleaned up root-level legacy static file copies.
- **Placed Item Labels in 3D**:
  - Integrated the `<Html>` component from `@react-three/drei` in `src/components/MathQuest3D.jsx` to render centered, clear numeric labels on placed boxes, spheres, and weight balloons.
- **Dev Server Startup**:
  - Started the Vite development server on port 8888, verifying hot module reloading works seamlessly.

## Phase 11: Professional Overhaul for Real 2nd-Grade Use
- Rewrote `mathQuestState.js`: 24 STATIC stage configs (no randomized options), all 8 puzzle types rotating per tier, every target reachable. Added hints, praise, `calculateStars`.
- Rebuilt `App.jsx` with `useReducer`, a localStorage helper, age-appropriate copy, and 48px+ touch targets.
- Set `vite.config.js` port to 8888.

## Phase 12: Character + Gear Rework
- Rewrote `Hero3D.jsx` as a chunky, cute mascot robot (RoundedBox shapes, damped smooth animation).
- Realigned all 24 gear visuals to match `FEATURE_NAMES` 1:1 and made each powerup recognizable and correctly placed (rocket boots, turbo pack, star cape, thunder fists, ice shield, fire blade, scanner light, heavy armor, hover boots, arm cannon, etc.). Updated locker emojis in `App.jsx`.

## Phase 13: Pedagogy + 3D Gameplay/Animation Fixes
- Removed answer-revealing feedback; child must work it out then tap Check Answer.
- Fixed stage 5 (electricity): added the missing value-accumulation handler in `addBlock`.
- Fixed stage 8+ crash: passed missing `sequence` prop to `PuzzleScene`.
- Hill: smooth elevator glide + auto-bridge plank to the goal (removed jerky steps easing & gap).
- Sub_bridge: left-anchored log scaled so the trimmed target exactly spans the gap (no walking on air).
- Fail animation: water stages (bridge/hill/sub_bridge) drop the hero in with a crocodile chomp/smirk; flat stages cheer/stumble in place. Fixed stage 5→6 transition (no walking into empty space).
- Added AGENT.md (concise) + CLAUDE.md (`@AGENT.md`).



## 2026-07-18: Product review + roadmap (owner decisions locked)

### Owner decisions
- **Target age 6–8** (child entering Grade 2, then 3). SFUSD / California → follow **CA Common Core** grades 1–3.
- **Add/sub mastery FIRST, then multiplication, then division.**
- Approved persisting this plan and starting Phase 0.

### Verified state (2026-07-18)
- Production build passes (296 kB initial after code-split; three.js in a deferred chunk).
- Headless Playwright playtest of all 6 nav views: **0 console errors, 0 page errors**. Warnings benign (THREE deprecations, software-WebGL fallback). Run Game + My Hero 3D render; **3D Math Quest canvas rendered black in headless** (software WebGL) — verify vs GPU Chrome (Phase 0b).
- Fixed this session: tutor flash/circle CSS (was undefined → silent break), tutor digit-combine step (17+7 rings the tens), **checkpoint black screen** (was two live WebGL contexts → now single context), **tutor voice silent on 2nd+ lesson** (Chrome speech wedge → `resume()`), bundle code-split.

### Findings (grounded in code)
1. **3D wrong-answer feedback reveals the exact gap** (`checkAnswer`: "Need 3 more!") → puzzles solvable without math. Highest-priority pedagogy fix.
2. **Random clicking can solve accumulation puzzles** (bridge/hill/electricity) — no commitment/attempt limit.
3. **Adaptive engine wired only to the Runner**; the 24 3D stages are static and don't drive mastery/spaced repetition.
4. **Skill ladder = 8 add/sub only** — no mult/div/place-value; intervals are minute-scale, not day-scale.
5. **Runner distractors are `answer ± random`** — should be misconception-based (the errors kids actually make). (Runner drill itself is intentional/keep.)

### Phased plan
- **Phase 0 — Stabilize & verify.** (0a) Vitest math-logic tests: every stage target reachable from its clicks; every runner problem's answer ∈ choices and arithmetically correct; fraction/clock targets consistent. (0b) Headless playtest across 24 stages + full run (win/lose/checkpoint); fix glitches; resolve the 3D-Quest black-canvas question.
- **Phase 1 — Anti-guessing & policing.** Directional non-numeric 3D feedback + capped-attempts tutor (remove exact-gap reveal); constrain random-click wins; misconception-based runner distractors; timing fairness.
- **Phase 2 — Whole-app self-evolving loop.** Route 3D stage results through `recordPuzzleResult` (map stage type → skill); extend ladder to place-value → multiplication → division; day-scale spaced repetition; adaptive stage selection instead of fixed 1–24.
- **Phase 3 — Age-fit & "doesn't feel like math."** Voice-first / reading-optional flows; lean into story/disguise so bare equations appear only in the intentional Runner drill.


## 2026-07-19: STORY / NORTH STAR — "Robin vs the Interdimensional Monster" (owner-approved)

This is the game's narrative spine and the target design. Future agents: build toward this.

### Story
Robin (the mascot robot) — an interdimensional monster kidnapped Robin's friends and stripped
Robin's powers. Robin can only reach the monster through a **portal** inside a wormhole. The portal
opens only when Robin's **running speed charges it up** (Back-to-the-Future "88" is flavor only —
NOT a literal gate; see below). Each portal run leads to a 3D stage that is a **mini boss fight solved
with MATH**: correct math exposes/damages the monster and **frees one friend + grants one permanent
power-up**. The final stage is a full boss fight (mixed-skill math gauntlet = end assessment).

### Core loop
run (speed builds → charges portal) → portal opens → 3D math boss stage (math defeats monster, free a
friend + gain a permanent power) → back to running, now faster/harder → repeat → final boss.

### Owner-approved design decisions (2026-07-19)
1. **No literal 88 mph gate.** Portal opens via a **visible "PORTAL CHARGE" speed meter/marker bar**
   that fills as speed builds. "88" is a parent easter-egg only. Never let a run stall on a threshold.
2. **Math IS the combat.** In the boss stage, correct answers expose/damage the monster and free the
   friend; wrong answers trigger the animated decomposition-tree tutor. Minions/platforming are light
   connective tissue — math stays central and frequent. (Need to design several interesting math-combat
   mechanics — see Phase C.) The runner remains the timed mental-math FLUENCY drill.
3. Non-scary/goofy monster; combat is playful (bonk/poof/free-with-light), NOT violent. Rename
   "slaves" → "gloom-bots"/"minions".
4. **One new timed power per freed friend**, each with a ~5s guided demo. Powers: slow-time, double-jump,
   lane-hop, pass-through (DROP the gravity-push gun — too combat-y). Powers also help the runner as it
   gets harder.
5. Chaser alien = gentle "hurry up" nudge, not a punisher; two-hit slowdown (Subway-Surfers-style);
   die → previous checkpoint (previous speed). Tie chaser aggression to the adaptive engine (ease if the
   kid keeps dying); never make a run unwinnable.
6. **24 friends tied to the 8 math skills** — each freed friend teaches/cheers its skill (uses the
   voice-diversity + pet-voice work); rescued friends shown in a hub as a progress trophy shelf.
7. Final boss = mixed-skill math gauntlet doubling as an assessment.

### Build phases (implement → test → commit each)
- **Phase A** — Portal-charge speed meter + loop wiring (reframe the existing distance checkpoint as a
  speed-charged portal; HUD meter).
- **Phase B** — LocalLM (qwen3-coder) narrative content, validated + committed as data: 24 friends
  (name/personality/skill), kid-safe monster taunts, rescue lines, power tutorial scripts, celebration
  lines. Tone/length/safety-checked; NEVER used in the game loop.
- **Phase C** — Math-as-combat in the boss stage (correct → expose/damage + free friend; wrong → tutor).
- **Phase D** — New timed powers (slow-time, double-jump, lane-hop, pass-through).
- **Phase E** — Tone/safety pass + headless playtest.

### LocalLM role (reminder)
qwen3-coder @ the owner's LM Studio = OFFLINE BULK CONTENT only (friends, dialogue, taunts, distractor/
problem banks), always validated by `npm test`/content checks, $0 cloud. Never in the runtime loop;
never for precise in-file code. If offline, the agent does the work itself.

### Current state at time of writing
All v1.0.0 mechanisms exist (runner, 24 3D stages, checkpoints, power-ups, adaptive engine, tutor,
hero+gear). Released v1.0.0. The story above is the NEXT major arc (v1.1+). Runner distractors are now
misconception-based (bank + fallback). Starting Phase A next.
