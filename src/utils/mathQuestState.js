// src/utils/mathQuestState.js - Static stage configs for 3D Math Quest
// All clicks are FIXED per stage. The correct answer is always achievable.
// 8 puzzle types rotate: bridge, hill, sub_bridge, area, electricity, clock, fraction, pattern
// Level 1 (1-8) = forest, Level 2 (9-16) = lava, Level 3 (17-24) = space

export const STAGE_NAMES = [
  '1. First Bridge',        '2. Hill Climber',         '3. River Crossing',
  '4. Garden Grid',         '5. Balance Scale',        '6. Clock Tower',
  '7. Fair Shares',         '8. Pattern Path',
  '9. Lava Bridge',         '10. Mountain Stairs',     '11. Log Trimmer',
  '12. Big Garden',         '13. Tricky Scale',        '14. Half Past Clock',
  '15. Pizza Slices',       '16. Pattern Detective',
  '17. Sky Bridge',         '18. Summit Stairs',       '19. Rapids Run',
  '20. Farm Planner',       '21. Master Scale',        '22. Minute Clock',
  '23. Fraction Feast',     '24. Grand Pattern'
];

export const FEATURE_NAMES = [
  'Rocket Boots', 'Shield Armor', 'Jet Wings', 'Gold Belt',
  'Power Gloves', 'Laser Eyes', 'Turbo Pack', 'Star Cape',
  'Thunder Fists', 'Ice Shield', 'Fire Blade', 'Tech Visor',
  'Pet Drone', 'Glow Ring', 'Solar Wings', 'Scanner Light',
  'Heavy Armor', 'Hover Boots', 'Core Badge', 'Force Field',
  'Arm Cannon', 'Float Halo', 'Brain Crown', 'Star Core'
];

export const EVOLUTION_TITLES = [
  'Tin Bot', 'Scout Bot', 'Explorer Bot', 'Math Bot',
  'Number Knight', 'Logic Hero', 'Vector Warrior', 'Cyber Guardian',
  'Power Sentinel', 'Titan Bot', 'Plasma Knight', 'Fusion Hero',
  'Quantum Guardian', 'Star Processor', 'Phoenix Bot', 'Arch Mage',
  'Stellar Bot', 'Infinity Machine', 'Galaxy Hero', 'Nebula Guardian',
  'Ascended Bot', 'Matrix Lord', 'Titan Sage', 'Supernova Hero', 'Star Master'
];

export const COLORS = {
  sky: '#87ceeb', water: '#0ea5e9', grass: '#22c55e', dirt: '#92400e',
  cliff: '#78716c', wood: '#d97706', stone: '#64748b', gold: '#fbbf24',
  blockBlue: '#3b82f6', blockGreen: '#22c55e', blockOrange: '#f59e0b',
  blockRed: '#ef4444', blockPurple: '#8b5cf6'
};

export const HINT_MESSAGES = {
  bridge: ["Count on your fingers! 🖐️", "Use the number line!", "How much more to reach the flag?"],
  hill: ["Each step goes up! 🧗", "Add the numbers on each stair.", "Count how high you've climbed!"],
  sub_bridge: ["Start big, count backwards! ⬅️", "How many to take away?", "Use the ruler to count back."],
  area: ["Count rows × columns!", "Skip count: 2, 4, 6...", "Each row is the same!"],
  electricity: ["What makes both sides equal? ⚖️", "Target minus what you have!", "Cover the mystery number."],
  clock: ["Short hand = hour! ⏰", "Long hand at 12 = o'clock.", "Count by 5s around the clock."],
  fraction: ["How many pieces total?", "Fair shares = same size! 🍕", "Count the colored parts."],
  pattern: ["Say it out loud! 🔮", "Find the repeating part.", "What always comes after?"]
};

export const PRAISE_MESSAGES = [
  "Amazing! 🌟", "Super smart! ⭐", "Math star! 💫", "Great job! 🎉",
  "Brilliant! 🧠", "Nailed it! 🎯", "Fantastic! 🚀", "Champion! 🏆"
];

export function getRandomPraise() {
  return PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
}

export function getHint(puzzleType, attemptNumber) {
  const hints = HINT_MESSAGES[puzzleType] || HINT_MESSAGES.bridge;
  return hints[Math.min(attemptNumber, hints.length - 1)];
}

// ALL CLICKS ARE STATIC. Correct answer is always reachable by combining the available clicks.
export function getStageParams(stageNum) {
  const idx = Math.max(1, Math.min(24, stageNum));

  const stages = {
    // ═══════════ LEVEL 1 (Stages 1-8): Forest Theme, within 20 ═══════════
    // Stage 1: Bridge - add to 6. Clicks: 2+4=6, or 3+3=6, or 2+3+1 etc.
    1: { type: 'bridge', target: 6, clicks: [1, 2, 3, 4, -1] },
    // Stage 2: Hill/Stairs - climb 8 steps high
    2: { type: 'hill', target: 8, clicks: [1, 2, 3, 5, -1] },
    // Stage 3: Subtraction log - start 10, cut to 4 (remove 6)
    3: { type: 'sub_bridge', start: 10, target: 4, clicks: [1, 2, 3, 5] },
    // Stage 4: Area grid 3x2 = 6
    4: { type: 'area', target: 6, targetW: 3, targetH: 2, clicks: [{w:2,h:1},{w:1,h:1},{w:3,h:1},{w:1,h:2}] },
    // Stage 5: Balance scale to 7
    5: { type: 'electricity', target: 7, clicks: [2, 3, 4, 5, -1] },
    // Stage 6: Clock to 3:00
    6: { type: 'clock', target: 3.0, clicks: [1.0, 2.0, 3.0] },
    // Stage 7: Fraction - color 2 of 4 slices (half)
    7: { type: 'fraction', target: 0.5, pieces: 4, targetPieces: 2, clicks: [1, 2, 3] },
    // Stage 8: Pattern - sphere,box,sphere,box → next is sphere (1)
    8: { type: 'pattern', target: 1, sequence: ['sphere','box','sphere','box'], clicks: [1, 2, 3] },

    // ═══════════ LEVEL 2 (Stages 9-16): Lava Theme, within 50 ═══════════
    // Stage 9: Bridge to 15
    9: { type: 'bridge', target: 15, clicks: [3, 5, 7, -2, 2] },
    // Stage 10: Hill/Stairs - climb 12
    10: { type: 'hill', target: 12, clicks: [2, 3, 4, 5, -2] },
    // Stage 11: Subtraction - start 20, cut to 8 (remove 12)
    11: { type: 'sub_bridge', start: 20, target: 8, clicks: [2, 3, 4, 6] },
    // Stage 12: Area grid 4x3 = 12
    12: { type: 'area', target: 12, targetW: 4, targetH: 3, clicks: [{w:2,h:2},{w:2,h:1},{w:4,h:1},{w:1,h:3}] },
    // Stage 13: Balance to 18
    13: { type: 'electricity', target: 18, clicks: [4, 5, 8, 9, -3] },
    // Stage 14: Clock to 6:30
    14: { type: 'clock', target: 6.5, clicks: [1.0, 2.0, 3.0, 0.5] },
    // Stage 15: Fraction - color 3 of 4 (three-quarters)
    15: { type: 'fraction', target: 0.75, pieces: 4, targetPieces: 3, clicks: [1, 2, 3] },
    // Stage 16: Pattern - AAB pattern → next is box (2)
    16: { type: 'pattern', target: 2, sequence: ['sphere','sphere','box','sphere','sphere'], clicks: [1, 2, 3] },

    // ═══════════ LEVEL 3 (Stages 17-24): Space Theme, within 100 ═══════════
    // Stage 17: Bridge to 25
    17: { type: 'bridge', target: 25, clicks: [5, 8, 10, 12, -3] },
    // Stage 18: Hill/Stairs - climb 15
    18: { type: 'hill', target: 15, clicks: [3, 4, 5, 8, -2] },
    // Stage 19: Subtraction - start 30, cut to 14 (remove 16)
    19: { type: 'sub_bridge', start: 30, target: 14, clicks: [3, 4, 5, 8] },
    // Stage 20: Area grid 5x4 = 20
    20: { type: 'area', target: 20, targetW: 5, targetH: 4, clicks: [{w:3,h:2},{w:2,h:2},{w:5,h:1},{w:2,h:1},{w:1,h:2}] },
    // Stage 21: Balance to 30
    21: { type: 'electricity', target: 30, clicks: [6, 8, 10, 12, -4] },
    // Stage 22: Clock to 9:15
    22: { type: 'clock', target: 9.25, clicks: [1.0, 2.0, 3.0, 0.5, 0.25] },
    // Stage 23: Fraction - color 2 of 6 (one-third)
    23: { type: 'fraction', target: 0.333, pieces: 6, targetPieces: 2, clicks: [1, 2, 3] },
    // Stage 24: Pattern - ABC → next is cylinder (3)
    24: { type: 'pattern', target: 3, sequence: ['sphere','box','cylinder','sphere','box'], clicks: [1, 2, 3] }
  };

  return stages[idx] || stages[1];
}

export function calculateStars(attempts) {
  if (attempts <= 1) return 3;
  if (attempts <= 2) return 2;
  return 1;
}

export function calculateXP(stageNum, attempts) {
  return (10 + stageNum * 2) + (attempts <= 1 ? 10 : attempts <= 2 ? 5 : 0);
}

export function getEvolutionLevel(totalStages) {
  return Math.min(24, totalStages);
}

/* ============================================================================
 * RANDOMIZED (non-fixed) puzzle numbers.
 * getStageParams() stays deterministic (used by tests + as a safe fallback).
 * generateStageParams() returns a fresh, VALID variant of the SAME puzzle type
 * and difficulty tier each call — different numbers every play, but the target
 * is always reachable from the offered clicks (validated below), and never a
 * single-tap giveaway.
 * ==========================================================================*/
function _rint(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Can `target` (non-negative int) be summed from positive `steps` (with repetition)?
export function canReachTarget(target, steps) {
  const t = Math.round(target);
  const pos = steps.map((s) => Math.round(s)).filter((s) => s > 0);
  if (t === 0) return true;
  if (!pos.length) return false;
  const reach = new Array(t + 1).fill(false); reach[0] = true;
  for (let v = 1; v <= t; v++) for (const s of pos) if (v - s >= 0 && reach[v - s]) { reach[v] = true; break; }
  return reach[t];
}

const _SHAPE_IDX = { sphere: 1, box: 2, cylinder: 3 };

// A set of small positive step values (+ optional negative "undo") that can sum to target,
// with no single step equal to target (so it's not a one-tap answer). Returns null on failure.
function _additiveClicks(target, tier) {
  const pool = tier === 1 ? [1, 2, 3, 4, 5] : tier === 2 ? [2, 3, 4, 5, 6, 7, 8] : [3, 4, 5, 8, 10, 12];
  for (let tries = 0; tries < 40; tries++) {
    const vals = _shuffle(pool.filter((v) => v < target)).slice(0, _rint(3, 4));
    if (vals.length < 2) continue;
    if (Math.random() < 0.5) vals.push(-_pick([1, 2, 3])); // an "undo/lift" option
    if (!vals.includes(target) && canReachTarget(target, vals)) return vals;
  }
  return null;
}

export function generateStageParams(stageNum) {
  const base = getStageParams(stageNum);
  const idx = Math.max(1, Math.min(24, stageNum));
  const tier = idx <= 8 ? 1 : idx <= 16 ? 2 : 3;
  const type = base.type;

  try {
    if (type === 'bridge' || type === 'hill' || type === 'electricity') {
      const [lo, hi] = tier === 1 ? [5, 12] : tier === 2 ? [13, 26] : [22, 42];
      const target = _rint(lo, hi);
      const clicks = _additiveClicks(target, tier);
      if (clicks) return { ...base, target, clicks };
    } else if (type === 'sub_bridge') {
      const [slo, shi] = tier === 1 ? [8, 15] : tier === 2 ? [16, 28] : [28, 45];
      const start = _rint(slo, shi);
      const target = _rint(Math.max(1, Math.floor(start * 0.25)), Math.floor(start * 0.7));
      const cuts = _additiveClicks(start - target, tier);
      if (cuts && start > target) return { ...base, start, target, clicks: cuts.filter((c) => c > 0) };
    } else if (type === 'area') {
      const [wl, wh, hl, hh] = tier === 1 ? [2, 3, 2, 3] : tier === 2 ? [3, 4, 2, 4] : [4, 5, 3, 5];
      const targetW = _rint(wl, wh), targetH = _rint(hl, hh), target = targetW * targetH;
      // block palette that can tile the area; {1,1} guarantees reachability
      const cand = [{ w: 1, h: 1 }, { w: 2, h: 1 }, { w: 1, h: 2 }, { w: 2, h: 2 }, { w: targetW, h: 1 }, { w: 1, h: targetH }, { w: Math.max(1, targetW - 1), h: 1 }]
        .filter((c) => c.w <= targetW && c.h <= targetH);
      const clicks = _shuffle(cand).slice(0, 4);
      if (!clicks.some((c) => c.w === 1 && c.h === 1)) clicks.push({ w: 1, h: 1 });
      if (canReachTarget(target, clicks.map((c) => c.w * c.h))) return { ...base, target, targetW, targetH, clicks };
    } else if (type === 'clock') {
      const hour = _rint(1, tier === 1 ? 6 : 11);
      const frac = tier === 1 ? 0 : tier === 2 ? _pick([0, 0.5]) : _pick([0, 0.5, 0.25]);
      const target = hour + frac;
      const clicks = [1, 2, 3];
      if (frac === 0.5) clicks.push(0.5);
      if (frac === 0.25) clicks.push(0.5, 0.25);
      return { ...base, target, clicks };
    } else if (type === 'fraction') {
      const pieces = tier === 1 ? _pick([2, 3, 4]) : tier === 2 ? _pick([4, 6]) : _pick([6, 8]);
      const targetPieces = _rint(1, pieces - 1);
      return { ...base, pieces, targetPieces, target: targetPieces / pieces, clicks: [1, 2, 3] };
    } else if (type === 'pattern') {
      const rule = tier === 1
        ? _pick([['sphere', 'box'], ['box', 'sphere'], ['sphere', 'cylinder']])
        : tier === 2
          ? _pick([['sphere', 'sphere', 'box'], ['sphere', 'box', 'box'], ['cylinder', 'sphere', 'sphere']])
          : _pick([['sphere', 'box', 'cylinder'], ['cylinder', 'box', 'sphere'], ['box', 'cylinder', 'sphere']]);
      const reps = 2, seq = [];
      for (let i = 0; i < reps; i++) seq.push(...rule);
      seq.push(...rule.slice(0, Math.max(0, _rint(0, rule.length - 1)))); // partial tail
      const next = rule[seq.length % rule.length];
      return { ...base, sequence: seq, target: _SHAPE_IDX[next], clicks: [1, 2, 3] };
    }
  } catch (e) { /* fall through to base */ }
  return base; // safe fallback: the deterministic (always-valid) config
}
