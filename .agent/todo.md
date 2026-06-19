# Todo List

## Done
- [x] Static 2nd-grade stage configs (8 types, reachable targets, 3 difficulty tiers).
- [x] `useReducer` App rewrite, localStorage helper, kid-friendly UI, 48px targets.
- [x] Cute mascot robot + all 24 gear items name-matched, placed, recognizable.
- [x] Non-revealing feedback (child must think).
- [x] Fix electricity stage (value accumulation) + pattern stage crash (sequence prop).
- [x] Hill: smooth glide + auto-bridge (no gap, no jerky jump).
- [x] Sub_bridge: left-anchored log spans gap exactly (no air-walking).
- [x] Stage-appropriate win/lose animations + crocodile chomp; fix 5→6 transition.
- [x] AGENT.md + CLAUDE.md; vite port 8888.
- [x] Endless runner (Teleporter Run): lanes, jump/duck, coins, varied moving obstacles, power-ups, teleporter quizzes, checkpoints (cross the 8 levels) + countdown + respawn twist.
- [x] Runner perf fix (memoized StaticWorld) + ErrorBoundary + WebGL context guards.
- [x] Audio upgrade: run/calm music, coin pitch, cause crashes, power-up SFX, urgency ticks, spoken pedestrians.
- [x] Git init + .gitignore + project.toml + remote origin.

## Backlog / Watch
- [ ] Hill: cap step spacing so many tiny blocks stay in a tidy zone.
- [ ] Consider hiding the running total for pure mental-math mode.
- [ ] Playtest all 24 stages + a full run (win + lose) for edge cases.
- [ ] Code-split the 1.3MB bundle (dynamic import three/drei) if load time matters.
