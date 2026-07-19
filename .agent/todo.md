# Todo List

Owner decisions (2026-07-18): target age **6–8** (Grade 1→2→3, SFUSD/CA Common Core);
**add/sub mastery first, then multiplication, then division**. See `.agent/plan.md` for the full roadmap.

## NOW — Phase 0: Stabilize & verify (before handing to the kid)
- [x] 0a. Vitest math-logic tests (tests/mathLogic.test.js): 24 stage-reachability checks + runner problem correctness. `npm test`.
- [x] 0b. Headless playtest (`node scripts/playtest.mjs stages`): all 24 stages + all nav views load with 0 console/page errors.
- [ ] 0b. CONFIRM IN REAL CHROME: bridge stages (1/9/17) render BLACK under headless software-WebGL while every other stage renders fine. Owner has GPU Chrome open — verify stage 1 shows the bridge scene (not black). If black there too, it's a real bug (investigate bridge PuzzleScene/CameraRig).
- [ ] 0b. CONFIRM IN REAL CHROME: full run win/lose + checkpoint crossing (checkpoint dual-WebGL fix landed but not verifiable headless).

## NEXT — Phase 1: Anti-guessing & policing (constraint #3)
- [ ] Replace `MathQuest3D.checkAnswer` exact-gap reveal ("Need 3 more!") with directional, non-numeric feedback + capped-attempts → tutor.
- [ ] Constrain accumulation puzzles so random clicking can't win (commit-a-plan / limited checks / no-op distractor blocks).
- [ ] Runner distractors → misconception-based (the wrong answers kids actually pick), not `answer ± random`.
- [ ] Verify runner timing/urgency is age-fair.

## LATER — Phase 2: Whole-app self-evolving loop
- [ ] Route 3D stage results through `recordPuzzleResult` (map stage type → skill) so the flagship game drives mastery too.
- [ ] Extend `SKILLS` ladder: place-value → multiplication (arrays/repeated addition) → division. Keep add/sub mastery gating first.
- [ ] Day-scale spaced repetition (skills resurface across sessions; mastered skills never fully drop).
- [ ] Adaptive stage/puzzle selection instead of the fixed 1–24 sequence.

## LATER — Phase 3: Age-fit & "doesn't feel like math"
- [ ] Voice-first / reading-optional flows for a 6–8 yo.
- [ ] Lean into story/disguise; keep bare equations only in the intentional Runner drill.

## Watch / minor
- [ ] Hill: cap step spacing so many tiny blocks stay in a tidy zone.

## Done (recent)
- [x] Fix checkpoint black screen (single WebGL context) + tutor voice `resume()` (34eb952).
- [x] Decomposition-tree tutor: flash/circle CSS + explicit tens-digit combine step.
- [x] Code-split bundle (three.js deferred): initial JS 1,424 kB → 296 kB.
- [x] Per-profile game state; adaptive engine + parent report; endless runner; audio upgrade.
- [x] 24 static stage configs (8 types); cute mascot + 24 gear; win/lose animations; git + remote.
