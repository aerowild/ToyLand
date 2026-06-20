// src/utils/profileStore.js
// Kid profiles + adaptive arithmetic engine (localStorage "cache").
// Tracks per-skill mastery, repeats failing skills on a spaced interval,
// relaxes with mastered skills, and slowly introduces harder skills.

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

function generateForSkill(s) {
  let a, b, ans;
  if (s.op === '+') { a = rint(s.min, s.max); b = rint(s.min, s.max); ans = a + b; }
  else { a = rint(Math.max(2, s.min), s.max); b = rint(1, a); ans = a - b; }
  const choices = new Set([ans]);
  while (choices.size < 3) {
    const spread = Math.max(2, Math.round(s.max * 0.15));
    const d = ans + rint(-spread, spread);
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
  };
}
