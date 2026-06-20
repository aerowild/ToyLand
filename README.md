# Toy Land Play Lab — Math Quest

A colorful 3D math game for Grade 1 & 2 (ages 6–7). Built with React + Vite + Three.js (react-three-fiber) + GSAP.

## Quick Start

```bash
npm install
npm run dev      # opens http://localhost:8888
```

Change the port in `vite.config.js` → `server.port`.

## Build

```bash
npm run build
npm run preview
```

## What's inside

- **3D Math Quest** — 24 stages across 3 difficulty tiers (forest / lava / space) covering 8 puzzle types: bridge addition, stair climbing, log subtraction, area arrays, balance equations, clocks, fractions, and patterns. Hints and praise are pedagogical; feedback never reveals the answer.
- **Teleporter Run** — an endless runner woven between stages: dodge cars/bikes/pedestrians/animals, collect coins, grab timed power-ups (🧲 magnet, 🚀 jetpack, ⚡ boost, ✨ 2× coins, 🛡️ shield), jump and slide. Teleporters trigger quick (sometimes timed) puzzles; **checkpoints** make you cross one of the 8 math levels and save a respawn point.
- **Evolving robot hero** — a cute mascot that unlocks 24 gear pieces (animated fire/ice/lightning effects, capes, wings, boots, etc.).
- **14 practice mini-games** (2D), a hero shop, daily quests, and a printable diploma.
- **Kid profiles + adaptive learning** — per-profile mastery of 8 add/subtract skills; failing skills repeat on a spaced interval to re-teach, mastered skills relax and phase out, and harder skills are introduced slowly. A parent **Learning Report** shows what's easy vs. needs practice. Power-up puzzles are timed and, on a miss, the answer is highlighted and spoken.
- **Audio** — soft calm music in math mode, upbeat music in the run, cause-specific crash sounds, distinct power-up sounds, rising coin pitch, timed-puzzle urgency ticks, and kid-friendly spoken pedestrian reactions.

## Admin Mode

Click 🔑 Admin → password `12345` (unlocks all stages/gear for testing).

## Project docs

- `AGENT.md` — architecture + working rules for AI agents.
- `.agent/` — `plan.md` (append-only plan log), `todo.md`, `changelog.md`.
