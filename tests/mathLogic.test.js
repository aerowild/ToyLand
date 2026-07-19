// tests/mathLogic.test.js
// Guards the two "no math-logic failures" invariants:
//  (A) every 3D stage's target is reachable from its static clicks, and
//  (B) every adaptive runner problem is arithmetically correct and well-formed.
import { describe, it, expect } from 'vitest';
import { getStageParams } from '../src/utils/mathQuestState.js';
import { getAdaptiveProblem, SKILLS } from '../src/utils/profileStore.js';

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

describe('3D stage math logic (getStageParams)', () => {
  for (let n = 1; n <= 24; n++) {
    it(`stage ${n}: target reachable from clicks`, () => {
      const p = getStageParams(n);
      expect(p).toBeTruthy();

      if (p.type === 'bridge' || p.type === 'hill' || p.type === 'electricity') {
        expect(canReach(p.target, p.clicks)).toBe(true);
      } else if (p.type === 'sub_bridge') {
        // start - (sum of cuts) === target  →  need = start - target reachable from cuts
        expect(p.start).toBeGreaterThan(p.target);
        expect(canReach(p.start - p.target, p.clicks)).toBe(true);
      } else if (p.type === 'area') {
        // currentValue accumulates block areas; win when it equals target (= W*H)
        expect(p.target).toBe(p.targetW * p.targetH);
        const areas = p.clicks.map((c) => c.w * c.h);
        expect(canReach(p.target, areas)).toBe(true);
      } else if (p.type === 'clock') {
        // additive hours incl. 0.5 / 0.25 → scale by 4 to stay integer
        expect(canReach(p.target * 4, p.clicks.map((c) => c * 4))).toBe(true);
      } else if (p.type === 'fraction') {
        // color `targetPieces` of `pieces`; target fraction must match
        expect(canReach(p.targetPieces, p.clicks)).toBe(true);
        expect(Math.abs(p.targetPieces / p.pieces - p.target)).toBeLessThan(0.01);
      } else if (p.type === 'pattern') {
        expect(p.sequence.length).toBeGreaterThan(0);
        expect([1, 2, 3]).toContain(p.target);         // next-shape index
        expect(p.clicks).toContain(p.target);          // correct choice is offered
      } else {
        throw new Error(`unknown puzzle type: ${p.type}`);
      }
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
        // skillId is a real skill
        expect(SKILLS.some((s) => s.id === q.skillId)).toBe(true);
      }
    }
  });
});
