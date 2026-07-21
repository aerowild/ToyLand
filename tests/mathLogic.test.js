// tests/mathLogic.test.js
// Guards the two "no math-logic failures" invariants:
//  (A) every 3D stage's target is reachable from its static clicks, and
//  (B) every adaptive runner problem is arithmetically correct and well-formed.
import { describe, it, expect } from 'vitest';
import { getStageParams, generateStageParams, getComboOptions } from '../src/utils/mathQuestState.js';
import { getAdaptiveProblem, SKILLS, misconceptionDistractors } from '../src/utils/profileStore.js';
import distractorBank from '../src/utils/distractorBank.json';

// Can we hit `target` (a non-negative integer) by summing `steps` with repetition?
function canReach(target, steps) {
  const t = Math.round(target);
  const pos = steps.map((s) => Math.round(s)).filter((s) => s > 0);
  if (t === 0) return true;
  if (!pos.length) return false;
  const reach = new Array(t + 1).fill(false);
  reach[0] = true;
  for (let v = 1; v <= t; v++) {
    for (const s of pos) if (v - s >= 0 && reach[v - s]) { reach[v] = true; break; }
  }
  return reach[t];
}

// Assert a stage-params object is internally valid & solvable (works for both the
// static configs and the randomized variants).
function assertValidStage(p) {
  expect(p).toBeTruthy();
  if (p.type === 'bridge' || p.type === 'hill' || p.type === 'electricity') {
    expect(canReach(p.target, p.clicks)).toBe(true);
    expect(p.clicks).not.toContain(p.target); // not a one-tap giveaway
  } else if (p.type === 'sub_bridge') {
    expect(p.start).toBeGreaterThan(p.target);
    expect(canReach(p.start - p.target, p.clicks)).toBe(true);
  } else if (p.type === 'area') {
    expect(p.target).toBe(p.targetW * p.targetH);
    expect(canReach(p.target, p.clicks.map((c) => c.w * c.h))).toBe(true);
    p.clicks.forEach((c) => { expect(c.w).toBeLessThanOrEqual(p.targetW); expect(c.h).toBeLessThanOrEqual(p.targetH); });
  } else if (p.type === 'clock') {
    expect(canReach(Math.round(p.target * 4), p.clicks.map((c) => Math.round(c * 4)))).toBe(true);
  } else if (p.type === 'fraction') {
    expect(canReach(p.targetPieces, p.clicks)).toBe(true);
    expect(p.targetPieces).toBeGreaterThan(0);
    expect(p.targetPieces).toBeLessThan(p.pieces);
    expect(Math.abs(p.targetPieces / p.pieces - p.target)).toBeLessThan(0.01);
  } else if (p.type === 'pattern') {
    expect(p.sequence.length).toBeGreaterThan(0);
    expect([1, 2, 3]).toContain(p.target);
    expect(p.clicks).toContain(p.target);
  } else {
    throw new Error(`unknown puzzle type: ${p.type}`);
  }
}

describe('3D stage math logic (getStageParams)', () => {
  for (let n = 1; n <= 24; n++) {
    it(`stage ${n}: static target reachable from clicks`, () => {
      assertValidStage(getStageParams(n));
    });
  }
});

describe('3D stage RANDOMIZED variants (generateStageParams)', () => {
  for (let n = 1; n <= 24; n++) {
    it(`stage ${n}: 60 random variants all valid & same type`, () => {
      const type = getStageParams(n).type;
      for (let i = 0; i < 60; i++) {
        const p = generateStageParams(n);
        expect(p.type).toBe(type);   // type/difficulty preserved
        assertValidStage(p);
      }
    });
  }
});

describe('combination options (getComboOptions)', () => {
  for (let t = 5; t <= 42; t++) {
    it(`target ${t}: >=2 correct + >=2 wrong, all well-formed`, () => {
      const opts = getComboOptions(t);
      const correct = opts.filter((o) => o.correct);
      const wrong = opts.filter((o) => !o.correct);
      expect(correct.length).toBeGreaterThanOrEqual(2);
      expect(wrong.length).toBeGreaterThanOrEqual(2);
      correct.forEach((o) => {
        expect(o.parts.length).toBeGreaterThanOrEqual(2);
        expect(o.parts.length).toBeLessThanOrEqual(3);       // <=3 steps
        expect(o.parts.every((n) => n > 0)).toBe(true);
        expect(o.parts.reduce((s, n) => s + n, 0)).toBe(t);  // correct really sums to target
      });
      wrong.forEach((o) => {
        expect(o.parts.length).toBeGreaterThanOrEqual(2);
        expect(o.parts.length).toBeLessThanOrEqual(3);
        expect(o.parts.every((n) => n > 0)).toBe(true);
        expect(o.parts.reduce((s, n) => s + n, 0)).not.toBe(t); // wrong must NOT sum to target
      });
      // no duplicate option shapes
      const keys = opts.map((o) => o.parts.slice().sort((x, y) => x - y).join('+'));
      expect(new Set(keys).size).toBe(keys.length);
    });
  }
});

describe('adaptive runner problems (getAdaptiveProblem)', () => {
  it('every generated problem is correct, well-formed, and non-trivially guessable-proofed', () => {
    // Levels 1-4 exercise the full 8-skill fallback ladder (no profile in node env).
    for (let level = 1; level <= 4; level++) {
      for (let i = 0; i < 300; i++) {
        const q = getAdaptiveProblem(level);
        // arithmetic correct
        const expected = q.op === '+' ? q.a + q.b : q.a - q.b;
        expect(q.answer).toBe(expected);
        // subtraction never goes negative
        if (q.op === '-') expect(q.a).toBeGreaterThanOrEqual(q.b);
        // choices: exactly 3, unique, contain the answer, all non-negative
        expect(q.choices).toHaveLength(3);
        expect(new Set(q.choices).size).toBe(3);
        expect(q.choices).toContain(q.answer);
        q.choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
        // distractors must be MISCONCEPTION-based (near the answer or a wrong-operation slip),
        // never a wild random number that a child could eliminate at a glance.
        const wrongOp = q.op === '+' ? Math.abs(q.a - q.b) : q.a + q.b;
        q.choices.filter((c) => c !== q.answer).forEach((c) => {
          const plausible = Math.abs(c - q.answer) <= 12 || c === wrongOp;
          expect(plausible, `distractor ${c} for ${q.a}${q.op}${q.b}=${q.answer} not misconception-like`).toBe(true);
        });
        // skillId is a real skill
        expect(SKILLS.some((s) => s.id === q.skillId)).toBe(true);
      }
    }
  });
});

describe('misconception distractor generator + bank', () => {
  it('generator returns 2 valid distractors for a wide range of problems', () => {
    for (let a = 0; a <= 60; a++) for (let b = 0; b <= 12; b++) {
      for (const op of ['+', '-']) {
        if (op === '-' && b > a) continue;
        const ans = op === '+' ? a + b : a - b;
        const ds = misconceptionDistractors(a, op, b, ans);
        expect(ds.length).toBe(2);
        expect(new Set(ds).size).toBe(2);
        ds.forEach((d) => { expect(Number.isInteger(d)).toBe(true); expect(d).toBeGreaterThanOrEqual(0); expect(d).not.toBe(ans); });
      }
    }
  });

  it('every banked entry is arithmetically consistent and well-formed', () => {
    const keys = Object.keys(distractorBank);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      const m = key.match(/^(\d+)([+-])(\d+)$/);
      expect(m, `bad bank key ${key}`).toBeTruthy();
      const a = +m[1], op = m[2], b = +m[3];
      const ans = op === '+' ? a + b : a - b;
      const ds = distractorBank[key];
      expect(Array.isArray(ds) && ds.length === 2).toBe(true);
      expect(new Set(ds).size).toBe(2);
      ds.forEach((d) => { expect(Number.isInteger(d)).toBe(true); expect(d).toBeGreaterThanOrEqual(0); expect(d).not.toBe(ans); });
    }
  });
});
