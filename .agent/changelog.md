# Changelog

## 2026-06-19 (adaptive learning + profiles)
- Added kid **profiles** (cached in localStorage): create/switch/delete from a header chip; auto-creates "Player 1".
- Added an **adaptive arithmetic engine** (`src/utils/profileStore.js`): per-skill mastery (8 add/sub skills, easiest→hardest), spaced repetition (failing skills repeat on a short interval; mastered skills relax and phase out), and slow introduction of the next harder skill once current ones are mastered. Runner math puzzles draw from it and record results.
- Added a **parent Learning Report** (per-skill mastery bars, accuracy, what's easy vs. needs practice).
- Power-ups now trigger **timed** math puzzles (no separate teleporter); on timeout/wrong the answer is taught — the full equation is highlighted token-by-token and spoken ("twelve minus ten equals two").
- Voices are no longer monotone/robotic: randomized pitch/rate + rotating system voices for variety; a clear teaching voice for the equation reveal.

## 2026-06-19 (audio upgrade + git)
- Fixed runner crash: `FlameEffect` (a Hero3D-only component) was used in RunnerGame's jetpack power-up icon and undefined there → replaced with inline flame meshes.
- Upgraded sound (all original synth): looping upbeat music in the run + soft calm music in math stages; rising-pitch coin collection; cause-specific crash sounds (car/bike/bicycle/animal/pedestrian/barrier); distinct per power-up sounds; urgency ticks in timed puzzles; kid-friendly spoken pedestrian reactions via browser speech (no profanity).
- Initialized git (`main`), adjusted `.gitignore` (env/BU/scratch/*.bak), added `project.toml`, connected remote `origin` → git@github.com:aerowild/ToyLand.git.
- Kept README/AGENT.md/.agent docs current.

## 2026-06-18 (crash safety + checkpoint celebration)
- Added an ErrorBoundary around the runner (and a WebGL `webglcontextlost` guard on both game Canvases) so a 3D/context error no longer white-screens the whole app — it shows a friendly "Try Again / Home" card and recovers. Stars/gear are preserved.
- Added a checkpoint celebration: after crossing a checkpoint level, a "🎉 Checkpoint Saved!" overlay shows with a 5→4→3→2→1 countdown before returning to the run.

## 2026-06-18 (runner perf + tuning)
- Fixed the blank-screen crash: the scene was re-rendering ~200 building/window meshes every frame (force() per frame), thrashing React/WebGL. Moved all static scenery into a memoized `StaticWorld` that renders once and scrolls via refs; the runner now only re-renders on item spawn/despawn and 10/s HUD ticks.
- Reduced crowding: slower spawn rate, mostly one blocked lane, fewer buildings/windows/trees.
- Longer checkpoints (~900m instead of ~420/560) so kids run and have fun longer before a checkpoint.

## 2026-06-18
- Fixed character stride: legs/arms now swing front-to-back (rotation.z) instead of sideways.
- Runner is now a colorful city: bright sky/sun/clouds, recycling colored buildings + trees, flying birds, side trams (visual).
- Varied moving obstacles: cars/bikes can be oncoming (drive toward player), pedestrians/animals cross the lanes; plus jump-over and duck-under (overhead gate) barriers.
- Real timed power-ups (collectible pickups): magnet, jetpack (fly), boost, 2x coins, shield — with HUD timers. Added Slide/duck control.
- Checkpoint countdown (5->1) before each checkpoint. Checkpoint twist: crossing a checkpoint secures it; the next crash sends you back and consumes it (must secure another). Finish screen offers Home + Run Again.

## 2026-06-17
- Runner now has CHECKPOINTS (~every 560m): the character must cross one of the 8 unique 3D math levels (cycled by tier) via MathQuest3D `checkpointMode` ("🏃 Keep Running!"). The 8 stages are preserved, not replaced.
- Made teleporter quiz popups rarer (~9%, min 230m apart) so puzzles aren't too frequent.
- Added time-sensitive quizzes: ~50% of teleporter puzzles now have an 8s countdown (timeout = miss).
- Added RunnerGame.jsx — a Subway-Surfers-style endless runner woven between math stages. 3 lanes, jump, dodge obstacles, collect coins, and hit purple teleporters to solve a quick puzzle (earn a power-up = unlocked hero gear + coins + a shield). On crash: "Solve to Continue" puzzle to revive, or finish the run. New 'runner' view + nav tab; "Open the Door — Run Game!" button on the stage-clear modal. Rewards flow back to stars and hero gear.
- Redesigned Hero3D to match a cute mascot reference: orange + silver two-tone, big round glowing blue eyes, round ear pods, dotted smile, silver chest panel (vents + cyan lights), 3-finger hands, chunky rounded boots.
- Made gear effects animated & meaningful: flickering glowing flames (rocket boots, turbo pack, fire blade), shimmering ice crystals (ice shield, frost aura), electric sparks (thunder fists), pulsing orbiting auras, glowing hover discs/laser eyes. Armor/cape read as worn clothing.
- Moved Realm Theme selector to a bar ABOVE the 3D frame; made the objective a gently breathing (fade in/out) highlighted banner near the equation.
- Rewrote `mathQuestState.js`: 24 static stage configs, all 8 puzzle types per tier, targets always reachable; added hints/praise/star calc.
- Rebuilt `App.jsx` with `useReducer` + localStorage helper + age-appropriate copy + 48px touch targets. Set vite port 8888.
- Rewrote `Hero3D.jsx` as a chunky cute mascot robot with damped smooth animation; realigned all 24 gear visuals to `FEATURE_NAMES` and made each powerup recognizable/placed. Updated locker emojis.
- Removed answer-revealing feedback so the child must compute then tap Check Answer.
- Fixed stage 5 (electricity) — added missing accumulation handler in `addBlock`.
- Fixed stage 8+ crash — passed missing `sequence` prop to `PuzzleScene`.
- Hill: smooth elevator glide + auto-bridge plank to goal (fixed jerky jump + gap).
- Sub_bridge: left-anchored log scaled so trimmed target exactly spans the gap (fixed walking on empty space).
- Fail animation: water stages drop hero in with a chomping/smirking crocodile; flat stages cheer/stumble in place — fixes the stage 5→6 transition (hero no longer walks into the void).
- Added concise AGENT.md and CLAUDE.md (`@AGENT.md`). Verified clean production build.

## 2026-06-16
- Created AGENT.md, .agent/plan.md, .agent/todo.md, and .agent/changelog.md.
- Fixed River Crossing Log Trimming (`sub_bridge`): scaled local Y instead of X for cylinder geometry, anchored log on the left bank, and animated position/scale together. Added bounds checks.
- Fixed Gap Bridging (`bridge`): replaced negative red blocks placed forward with physical block-shrinking/deleting of trailing blocks and cutter animations.
- Fixed Stair Climbing (`hill`): replaced fixed-height stair steps with proportional height steps matching numbers, and added digging block-shrinking/removing from the top.
- Fixed see-saw equations (`balance`): replaced red negative block spheres with floating balloons above the scale connected by a stretching string to pull the beam up.
- Added premium 3D Math Puzzle Quest Hero Banner to the main index dashboard.
- Stopped Python static web server and started native Vite development server (`npm run dev`) on port 8888.
- Fixed a JSX syntax compiler error in `src/App.jsx` where a hyphenated CSS property `letter-spacing` was used instead of camelCase `letterSpacing`.
- Verified error-free bundling of R3F dependencies and confirmed dev server loads page correctly.
- Aligned hero's vertical positions with platform heights (`initY`/`endY` matching the model's feet origin at `y=0`) to fix character clipping/sinking.
- Implemented low-poly swimming crocodiles (body and tail wiggling animations) and wave effects on murky green water surfaces.
- Added animated lava bubbles and glowing point lights to LavaPools.
- Created a `CameraRig` component inside `MathQuest3D.jsx` to dynamically zoom, height-adjust, and position the camera depending on stage type.
- Refactored environmental fog color presets (murky green-blue, lava brown-red, grid purple, scale yellow) to match the premium aesthetics.
- Added decoy number choices to all 20 stages in `mathQuestState.js` to create an actual math thinking challenge for kids.
- Restored the complete suite of 14 classic 2D mini-games and parent configurators by copying files to Vite's static folder and embedding them inside a premium iframe view.
- Added a new Navigation tab and a featured emerald lobby banner for the "2D Practice Lab".
- Established a bidirectional localStorage synchronization bridge for stars and coins. Progress earned in the classic 2D games automatically updates character evolution levels in the React 3D lobby, and vice versa.
- Fixed 3D character visibility bug in `Hero3D.jsx`: introduced an inner group referenced by `heroRef` to apply local breathing/walking animation offsets. This prevents the top-level group position `y` from being overwritten to `0` or near `0` by the `useFrame` animation loop, keeping the character aligned with platform/cliff heights.
- Improved pedagogical game choice: added subtraction options (negative numbers like `-1`, `-2`, `-3`) to all addition, hill, and balance levels, allowing kids to lift weights or shrink steps to fix mistakes if they exceed target values. Added additional decoy numbers for wrong answers.
- Replaced the simple iframe view on the React dashboard and nav with a premium React cards selector listing all 14 classic games, rewards shop, parent stats report, and printable activity kit.
- Added URL search parameter routing (`?game=labX`) to the legacy app to allow direct iframe launching into specific 2D mini-games, complete with back-navigation.
- Implemented an in-game cleared overlay in `MathQuest3D` that displays total stars earned, custom gear rewards, and buttons to play the next stage immediately, customize the character, or exit.
- Fixed runtime ReferenceError: stairTotalHeight is not defined inside checkAnswer in MathQuest3D.jsx, resolving the level-clearing crash on stair climbing (hill) stages.
- Integrated the fully-developed original 3D Math Quest (vanilla Three.js) via iframe. This restores the coordinate-perfect 3D game with advanced animations, crocodiles, lava, de-bridging subtraction, balloon lifts, and 20 complete stages.
- Implemented window postMessage event handlers in App.jsx to initialize, reward, and exit the legacy 3D game cleanly.
- Optimized bundle size, saving 120 KB and improving browser load times.
- Fixed character height offset sinking/clipping when idle in `public/legacy-vanilla/evolution3d.js` and `legacy-vanilla/evolution3d.js` (incorporated `state.baseY` in `idleAnimation`).
- Redesigned `getStageParams` in both `evolution3d.js` files to dynamically generate decoy numbers and math options.
- Added subtraction options (`-1`, `-2`, etc.) in addition/stair/balance levels to allow kids to undo overshoot mistakes, and slices/add-backs in subtraction.
- Checked full compatibility using a clean production build compile.
- Reverted the legacy static iframe redirection in `src/App.jsx` and mounted the native React Three Fiber `<MathQuest3D>` component instead.
- Restored the root `index.html` as the Vite/React app mount point and cleaned up the temporary legacy files from the root.
- Integrated Drei `<Html>` overlays in `src/components/MathQuest3D.jsx` to render clear 3D labels on all boxes, spheres, and balloons.
- Restarted the Vite server on port 8888 and verified the application compiles and launches cleanly.



