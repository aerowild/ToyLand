// src/utils/profileStore.js
// Kid profiles + adaptive arithmetic engine (localStorage "cache").
// Tracks per-skill mastery, repeats failing skills on a spaced interval,
// relaxes with mastered skills, and slowly introduces harder skills.
import distractorBank from './distractorBank.json';

const KEY = 'toy_land_profiles_v1';

// Skill ladder, easiest -> hardest. The adaptive engine walks down this list.
export const SKILLS = [
  { id: 'add10', op: '+', min: 1, max: 10, label: 'Add within 10' },
  { id: 'sub10', op: '-', min: 1, max: 10, label: 'Subtract within 10' },
  { id: 'add20', op: '+', min: 1, max: 20, label: 'Add within 20' },
  { id: 'sub20', op: '-', min: 1, max: 20, label: 'Subtract within 20' },
  { id: 'add50', op: '+', min: 10, max: 50, label: 'Add within 50' },
  { id: 'sub50', op: '-', min: 10, max: 50, label: 'Subtract within 50' },
  { id: 'add100', op: '+', min: 20, max: 100, label: 'Add within 100' },
  { id: 'sub100', op: '-', min: 20, max: 100, label: 'Subtract within 100' },
];
const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

// review intervals (minutes) as a skill's correct streak grows — spaced repetition
const REVIEW_MIN = [0.5, 1.5, 4, 10, 25, 60];
const MASTERY_THRESHOLD = 0.78;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } }
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
function rint(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function blankSkills() {
  const skills = {};
  SKILLS.forEach((s, i) => {
    skills[s.id] = { attempts: 0, correct: 0, streak: 0, mastery: 0, introduced: i < 2, due: 0, lastSeen: 0 };
  });
  return skills;
}

export function getStore() {
  let d = load();
  if (!d || typeof d !== 'object' || !d.profiles) { d = { activeId: null, profiles: {} }; save(d); }
  return d;
}

export function listProfiles() { return Object.values(getStore().profiles); }
export function getActiveProfile() { const d = getStore(); return d.activeId && d.profiles[d.activeId] ? d.profiles[d.activeId] : null; }
export function getActiveProfileId() { const d = getStore(); return d.activeId && d.profiles[d.activeId] ? d.activeId : null; }

export function ensureProfile() {
  // Make sure there's always an active profile so adaptivity works out of the box.
  const d = getStore();
  if (d.activeId && d.profiles[d.activeId]) return d.profiles[d.activeId];
  if (Object.keys(d.profiles).length) { d.activeId = Object.keys(d.profiles)[0]; save(d); return d.profiles[d.activeId]; }
  return createProfile('Player 1', '🦸');
}

export function createProfile(name, avatar) {
  const d = getStore();
  const id = 'p' + Date.now() + Math.floor(Math.random() * 1000);
  d.profiles[id] = { id, name: (name || 'Player').slice(0, 16), avatar: avatar || '🦸', createdAt: Date.now(), skills: blankSkills(), stats: { totalPuzzles: 0, totalCorrect: 0 } };
  d.activeId = id;
  save(d);
  return d.profiles[id];
}

export function setActiveProfile(id) { const d = getStore(); if (d.profiles[id]) { d.activeId = id; save(d); } }
export function deleteProfile(id) {
  const d = getStore();
  delete d.profiles[id];
  if (d.activeId === id) d.activeId = Object.keys(d.profiles)[0] || null;
  save(d);
}

// Misconception-based distractors: the WRONG answers a real child would plausibly pick,
// so choices aren't trivially eliminable. Prefers a qwen3-coder-generated, validated bank
// (src/utils/distractorBank.json); falls back to the SAME mistake patterns computed in code
// for any problem not in the bank (bank can't cover every random a,b, and we never call an
// LLM in the game loop). Always returns up to 2 valid, distinct, non-negative distractors != ans.
export function misconceptionDistractors(a, op, b, ans) {
  const out = [];
  const add = (v) => { v = Math.round(v); if (Number.isInteger(v) && v >= 0 && v !== ans && !out.includes(v)) out.push(v); };
  const banked = distractorBank[`${a}${op}${b}`];
  if (banked) banked.forEach(add);
  if (out.length < 2) {
    const cands = [];
    if (op === '+' && (a % 10) + (b % 10) >= 10) cands.push(ans - 10);   // forgot to carry the ten
    if (op === '-' && (a % 10) < (b % 10)) cands.push(ans + 10);          // borrow error
    cands.push(op === '+' ? Math.abs(a - b) : a + b);                    // used the wrong operation
    cands.push(ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10);  // miscount / place-value slip
    cands.forEach(add);
  }
  return out.slice(0, 2);
}

function generateForSkill(s) {
  let a, b, ans;
  if (s.op === '+') { a = rint(s.min, s.max); b = rint(s.min, s.max); ans = a + b; }
  else { a = rint(Math.max(2, s.min), s.max); b = rint(1, a); ans = a - b; }
  const choices = new Set([ans]);
  misconceptionDistractors(a, s.op, b, ans).forEach((c) => choices.add(c));
  // Safety fill (rarely needed) so there are always exactly 3 choices.
  let guard = 0;
  while (choices.size < 3 && guard++ < 30) {
    const d = ans + rint(1, Math.max(3, Math.round(s.max * 0.15))) * (Math.random() < 0.5 ? 1 : -1);
    if (d >= 0 && d !== ans) choices.add(d);
  }
  return { a, b, op: s.op, answer: ans, text: `${a} ${s.op} ${b} = ?`, choices: [...choices].sort(() => Math.random() - 0.5), skillId: s.id };
}

// Pick the next problem adaptively. fallbackLevel keeps it sensible when no profile.
export function getAdaptiveProblem(fallbackLevel = 1) {
  const p = getActiveProfile();
  if (!p) {
    const idx = Math.min(SKILLS.length - 1, (fallbackLevel - 1) * 2 + rint(0, 1));
    return generateForSkill(SKILLS[idx]);
  }
  const now = Date.now();
  const intro = SKILLS.filter((s) => p.skills[s.id].introduced);
  if (!intro.length) return generateForSkill(SKILLS[0]);

  const struggling = intro.filter((s) => p.skills[s.id].mastery < MASTERY_THRESHOLD);
  const dueNow = struggling.filter((s) => (p.skills[s.id].due || 0) <= now);
  const mastered = intro.filter((s) => p.skills[s.id].mastery >= MASTERY_THRESHOLD);
  const roll = Math.random();

  let chosen;
  if (dueNow.length && roll < 0.6) {
    // Re-teach a failing/weak skill that's due (lowest mastery first)
    chosen = dueNow.sort((a, b) => p.skills[a.id].mastery - p.skills[b.id].mastery)[0];
  } else if (mastered.length && roll < 0.8) {
    // Relax: an easy, already-mastered skill (these slowly phase out as fewer are picked)
    chosen = mastered[Math.floor(Math.random() * mastered.length)];
  } else if (struggling.length) {
    // General practice on the weakest introduced skill
    chosen = struggling.sort((a, b) => p.skills[a.id].mastery - p.skills[b.id].mastery)[0];
  } else {
    chosen = intro[Math.floor(Math.random() * intro.length)];
  }
  return generateForSkill(chosen || SKILLS[0]);
}

function maybeIntroduceNext(p) {
  const introduced = SKILLS.filter((s) => p.skills[s.id].introduced);
  const allMastered = introduced.every((s) => p.skills[s.id].mastery >= MASTERY_THRESHOLD && p.skills[s.id].attempts >= 4);
  if (!allMastered) return;
  const nextIdx = SKILLS.findIndex((s) => !p.skills[s.id].introduced);
  if (nextIdx >= 0) p.skills[SKILLS[nextIdx].id].introduced = true; // introduce ONE harder skill, slowly
}

// Record an answered puzzle. timeMs optional (faster correct => more mastery).
export function recordPuzzleResult(skillId, correct, timeMs) {
  if (!skillId || !SKILL_BY_ID[skillId]) return;
  const d = getStore();
  const p = d.activeId && d.profiles[d.activeId];
  if (!p || !p.skills[skillId]) return;
  const sk = p.skills[skillId];
  const now = Date.now();
  sk.attempts += 1;
  sk.lastSeen = now;
  p.stats.totalPuzzles = (p.stats.totalPuzzles || 0) + 1;
  if (correct) {
    sk.correct += 1;
    sk.streak = (sk.streak > 0 ? sk.streak : 0) + 1;
    const fast = timeMs && timeMs < 5000;
    sk.mastery = Math.min(1, sk.mastery + (fast ? 0.18 : 0.11));
    p.stats.totalCorrect = (p.stats.totalCorrect || 0) + 1;
    const mins = REVIEW_MIN[Math.min(REVIEW_MIN.length - 1, sk.streak)];
    sk.due = now + mins * 60 * 1000; // push next review further out
  } else {
    sk.streak = 0;
    sk.mastery = Math.max(0, sk.mastery - 0.16);
    sk.due = now + 25 * 1000; // bring it back soon to re-teach
  }
  maybeIntroduceNext(p);
  save(d);
}

// Snapshot for the parent "Learning Report"
export function getStats() {
  const p = getActiveProfile();
  if (!p) return null;
  const skills = SKILLS.map((s) => {
    const k = p.skills[s.id];
    return {
      id: s.id, label: s.label, ...k,
      accuracy: k.attempts ? k.correct / k.attempts : 0,
      status: !k.introduced ? 'locked' : k.mastery >= MASTERY_THRESHOLD ? 'mastered' : k.attempts === 0 ? 'new' : k.mastery < 0.4 ? 'needs-help' : 'learning',
    };
  });
  return {
    id: p.id, name: p.name, avatar: p.avatar,
    totalPuzzles: p.stats.totalPuzzles || 0, totalCorrect: p.stats.totalCorrect || 0,
    accuracy: p.stats.totalPuzzles ? (p.stats.totalCorrect || 0) / p.stats.totalPuzzles : 0,
    skills,
    easiest: skills.filter((s) => s.status === 'mastered').map((s) => s.label),
    hardest: skills.filter((s) => s.status === 'needs-help').map((s) => s.label),
    highScore: p.highScore || 0,
  };
}

// --- Scoring + per-profile high score + leaderboard ---
// Record a session score for the active profile; updates the high score if beaten.
export function recordScore(score) {
  const d = getStore();
  const p = d.activeId && d.profiles[d.activeId];
  if (!p) return { highScore: 0, isNew: false };
  const prev = p.highScore || 0;
  const isNew = score > prev;
  if (isNew) { p.highScore = score; save(d); }
  return { highScore: Math.max(prev, score), isNew };
}

export function getHighScore() {
  const p = getActiveProfile();
  return p ? (p.highScore || 0) : 0;
}

// All profiles ranked by high score (for the leaderboard).
export function getLeaderboard() {
  const d = getStore();
  return Object.values(d.profiles)
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, highScore: p.highScore || 0 }))
    .sort((a, b) => b.highScore - a.highScore);
}
