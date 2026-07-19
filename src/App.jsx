// src/App.jsx - Main Dashboard and State Manager
import React, { useEffect, useRef, useReducer, useState, lazy, Suspense } from 'react';
import { CookieMonsterGame, SeeSawGame, AlligatorGame } from './components/MiniGames';
import { STAGE_NAMES, FEATURE_NAMES, EVOLUTION_TITLES, getStageParams } from './utils/mathQuestState';
import { playSound, setSoundEnabled, isSoundEnabled, playPetVoice } from './utils/sound';
import { ensureProfile, listProfiles, getActiveProfile, getActiveProfileId, createProfile, setActiveProfile, deleteProfile, getStats } from './utils/profileStore';
import './App.css';

// Heavy 3D views are code-split so three.js / @react-three/fiber load on demand,
// not in the initial bundle. They share one three.js chunk once any is loaded.
const MathQuest3D = lazy(() => import('./components/MathQuest3D'));
const RunnerGame = lazy(() => import('./components/RunnerGame'));
const HeroCanvas = lazy(() => import('./components/HeroCanvas'));

// Fallback shown while a 3D chunk downloads.
function GameLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '14px', fontFamily: "'Fredoka', sans-serif" }}>
      <div style={{ fontSize: '3rem', animation: 'bounce 0.9s ease-in-out infinite' }}>🚀</div>
      <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '1.1rem' }}>Loading…</div>
    </div>
  );
}

// --- Error boundary: prevents a 3D/runtime error from white-screening the whole app ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, epoch: 0, msg: '' }; }
  static getDerivedStateFromError(err) { return { hasError: true, msg: (err && (err.message || String(err))) || 'Unknown error' }; }
  componentDidCatch(err, info) { console.error('Game error caught by boundary:', err, info); }
  reset() { this.setState((s) => ({ hasError: false, epoch: s.epoch + 1, msg: '' })); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: 'linear-gradient(135deg,#1e293b,#312e81)', color: 'white', fontFamily: "'Fredoka', sans-serif", textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: '3.5rem' }}>🤖💫</div>
          <h2 style={{ margin: 0, fontWeight: 900 }}>Oops! The game took a little tumble.</h2>
          <p style={{ margin: 0, opacity: 0.85, fontWeight: 600 }}>Don't worry — your stars and gear are safe.</p>
          <div style={{ maxWidth: 520, width: '90%', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#fca5a5', wordBreak: 'break-word', maxHeight: 120, overflow: 'auto' }}>
            {this.state.msg}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <button onClick={() => this.reset()} style={{ fontFamily: 'inherit', fontWeight: 900, fontSize: '1.1rem', padding: '14px 24px', borderRadius: 16, border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', boxShadow: '0 5px 0 #16a34a' }}>🔄 Try Again</button>
            <button onClick={() => { this.reset(); this.props.onHome && this.props.onHome(); }} style={{ fontFamily: 'inherit', fontWeight: 900, fontSize: '1.1rem', padding: '14px 24px', borderRadius: 16, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', boxShadow: '0 5px 0 #2563eb' }}>🏠 Home</button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.epoch}>{this.props.children}</React.Fragment>;
  }
}

// --- localStorage helpers (game state is namespaced PER PROFILE) ---
// Each profile gets its own stars/level/stage/gear/etc. under `toy_land_<profileId>_<key>`.
const LEGACY_PREFIX = 'toy_land_';
const nsPrefix = () => `toy_land_${getActiveProfileId() || 'default'}_`;
// Keys that should be isolated per profile + migrated from the old flat layout once.
const GAME_KEYS = ['stars', 'stage', 'current_stage', 'features', 'equipped_features', 'achievements', 'purchased_items', 'hero_level', 'hero_exp', 'login_streak', 'reward_claimed_today', 'daily_quests', 'pet_love', 'pet_bond_level', 'pet_color', 'pet_accessory', 'last_login_date', 'profile'];

const storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(nsPrefix() + key);
      if (val === null) return fallback;
      return val;
    } catch { return fallback; }
  },
  getInt(key, fallback = 0) {
    const val = localStorage.getItem(nsPrefix() + key);
    return val ? parseInt(val, 10) : fallback;
  },
  getJSON(key, fallback = null) {
    try {
      const val = localStorage.getItem(nsPrefix() + key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    const k = nsPrefix() + key;
    if (typeof value === 'object') localStorage.setItem(k, JSON.stringify(value));
    else localStorage.setItem(k, String(value));
  },
  remove(key) { localStorage.removeItem(nsPrefix() + key); },
};

// One-time (global): copy the old flat `toy_land_*` game data into the FIRST profile's
// namespace. Runs once ever — new profiles afterward start completely fresh.
function migrateLegacyGameData() {
  try {
    const flag = 'toy_land_migrated_v1';
    if (localStorage.getItem(flag)) return;
    GAME_KEYS.forEach((key) => {
      const legacy = localStorage.getItem(LEGACY_PREFIX + key);
      const target = nsPrefix() + key;
      if (legacy !== null && localStorage.getItem(target) === null) {
        localStorage.setItem(target, legacy);
      }
    });
    localStorage.setItem(flag, '1');
  } catch (e) { /* ignore */ }
}

// --- Constants ---
const classicGamesList = [
  { id: 'lab1', title: 'See-Saw Balance', icon: '⚖️', category: 'Balance & Addition', categoryColor: '#3b82f6', categoryShadow: '#2563eb', categoryBG: '#eff6ff', description: 'Level both sides of the see-saw scale with weights, and discover secret clubhouse math equations!' },
  { id: 'lab6', title: 'Frog Lilypad Jumper', icon: '🐸', category: 'Balance & Addition', categoryColor: '#3b82f6', categoryShadow: '#2563eb', categoryBG: '#eff6ff', description: 'Guide the frog along the visual number line to solve addition and subtraction hop problems!' },
  { id: 'lab11', title: 'Shape Balance Riddles', icon: '🤹', category: 'Balance & Addition', categoryColor: '#3b82f6', categoryShadow: '#2563eb', categoryBG: '#eff6ff', description: 'Solve logical ratio riddles by balancing shapes like stars, triangles, and circles!' },
  { id: 'lab2', title: 'Cookie Monster Subtraction', icon: '🍪', category: 'Subtraction', categoryColor: '#eab308', categoryShadow: '#ca8a04', categoryBG: '#fef9c3', description: 'Feed cookies to the monster to practice visual subtraction and learn what happens when there is a cookie deficit!' },
  { id: 'lab3', title: 'Tree Time Machine', icon: '🌳', category: 'Subtraction', categoryColor: '#eab308', categoryShadow: '#ca8a04', categoryBG: '#fef9c3', description: 'Travel through time to count birds on branches, using algebra and takeaway skills to find the initial count!' },
  { id: 'lab12', title: 'Alligator Comparisons', icon: '🐊', category: 'Comparisons', categoryColor: '#22c55e', categoryShadow: '#16a34a', categoryBG: '#dcfce7', description: 'Compare groups of fish and feed the alligator by pointing its mouth to the larger group!' },
  { id: 'lab4', title: 'Magic Tray Snapper', icon: '🧮', category: 'Grouping & Tens', categoryColor: '#ef4444', categoryShadow: '#dc2626', categoryBG: '#fee2e2', description: 'Snap dots into magic trays to fill 10-frames and learn how grouping helps double-digit math!' },
  { id: 'lab5', title: 'Carrot Farming Grid', icon: '🥕', category: 'Multiplication', categoryColor: '#ef4444', categoryShadow: '#dc2626', categoryBG: '#fee2e2', description: 'Plant rows and columns in the carrot garden to visually master multiplication commutative grids!' },
  { id: 'lab13', title: 'Skip Count Balloon Pop', icon: '🎈', category: 'Multiplication', categoryColor: '#ef4444', categoryShadow: '#dc2626', categoryBG: '#fee2e2', description: 'Pop floating balloons matching the skip-counting sequences (2s, 3s, 5s, 10s)!' },
  { id: 'lab7', title: 'Pizza Fractions', icon: '🍕', category: 'Geometry & Fractions', categoryColor: '#ec4899', categoryShadow: '#db2777', categoryBG: '#fce7f3', description: 'Slice and bake pizzas into halves, thirds, or fourths to satisfy exact orders!' },
  { id: 'lab8', title: 'Telling Time Clock', icon: '⏰', category: 'Measurements', categoryColor: '#ec4899', categoryShadow: '#db2777', categoryBG: '#fce7f3', description: 'Drag the hour and minute clock hands to match target digital cards and learn clock reading!' },
  { id: 'lab9', title: 'Tangram Block Builder', icon: '📐', category: 'Geometry', categoryColor: '#ec4899', categoryShadow: '#db2777', categoryBG: '#fce7f3', description: 'Rotate and drag geometric puzzle blocks to fit them inside various animal silhouettes!' },
  { id: 'lab10', title: 'Money Toy Market', icon: '🪙', category: 'Measurements', categoryColor: '#ec4899', categoryShadow: '#db2777', categoryBG: '#fce7f3', description: 'Pay for custom toys by selecting exact quarters, dimes, nickels, and pennies!' },
  { id: 'lab14', title: 'Measurement Bug Ruler', icon: '📏', category: 'Measurements', categoryColor: '#ec4899', categoryShadow: '#db2777', categoryBG: '#fce7f3', description: 'Use the wooden ruler tool to measure the precise length of caterpillars, bugs, and pencils!' },
  { id: 'shop', title: 'Sticker Shop & Toy Store', icon: '🏪', category: 'Rewards', categoryColor: '#a855f7', categoryShadow: '#9333ea', categoryBG: '#f3e8ff', description: 'Exchange your stars for customized stickers, toys, and cool character themes!' },
  { id: 'print', title: 'Printable Board Games', icon: '🖨️', category: 'Offline Fun', categoryColor: '#a855f7', categoryShadow: '#9333ea', categoryBG: '#f3e8ff', description: 'Download and print flashcards and lilypad board game setups to play math offline with parents!' },
  { id: 'parent', title: 'Diagnostic Report Card', icon: '📊', category: 'Parent Stats', categoryColor: '#a855f7', categoryShadow: '#9333ea', categoryBG: '#f3e8ff', description: 'Analyze accuracy ratios, diagnostic summaries, and performance recommendations!' }
];

const ACHIEVEMENT_LIST = [
  { id: 'explorer', name: 'Scout Explorer', icon: '🧭', desc: 'Clear 3 stages in 3D Math Quest', starBonus: 20 },
  { id: 'bridge_builder', name: 'Bridge Builder', icon: '🌉', desc: 'Build 3 addition bridges', starBonus: 20 },
  { id: 'stair_climber', name: 'Stair Climber', icon: '🧗', desc: 'Climb 3 subtraction stairs', starBonus: 20 },
  { id: 'log_cutter', name: 'Log Cutter', icon: '🪓', desc: 'Cut 3 river logs', starBonus: 20 },
  { id: 'area_designer', name: 'Area Designer', icon: '📐', desc: 'Build 3 area grids', starBonus: 20 },
  { id: 'balance_scale', name: 'Scale Master', icon: '⚖️', desc: 'Balance 3 see-saw scales', starBonus: 20 },
  { id: 'star_collector', name: 'Star Collector', icon: '💎', desc: 'Get 100 or more stars', starBonus: 20 },
  { id: 'evolved', name: 'Super Evolved', icon: '🦸‍♂️', desc: 'Unlock 10 character parts', starBonus: 20 },
  { id: 'streak_master', name: 'Streak Legend', icon: '🔥', desc: 'Get a 5x combo streak', starBonus: 20 },
  { id: 'champion', name: 'Grand Champion', icon: '👑', desc: 'Clear all 24 stages!', starBonus: 50 }
];

const SHOP_ITEMS = [
  { id: 'pet_phoenix', name: 'Phoenix Buddy', icon: '🛸', category: 'pets', cost: 120, desc: 'A glowing phoenix friend that flies with you!' },
  { id: 'pet_panda', name: 'Space Panda Pal', icon: '🐼', category: 'pets', cost: 150, desc: 'A cute space panda who cheers you on!' },
  { id: 'pet_robot', name: 'Robo Helper', icon: '🤖', category: 'pets', cost: 180, desc: 'A friendly robot buddy with spinning lights.' },
  { id: 'cape_rainbow', name: 'Rainbow Wings', icon: '🌈', category: 'clothes', cost: 80, desc: 'Sparkly rainbow wings that glow behind you!' },
  { id: 'suit_astronaut', name: 'Space Suit', icon: '🚀', category: 'clothes', cost: 160, desc: 'A shiny white space suit for adventures!' },
  { id: 'armor_gold', name: 'Gold Armor', icon: '🛡️', category: 'clothes', cost: 200, desc: 'Super strong gold armor that looks amazing!' },
  { id: 'aura_lightning', name: 'Lightning Power', icon: '⚡', category: 'powers', cost: 100, desc: 'Zappy lightning bolts spin around you!' },
  { id: 'aura_fire', name: 'Fire Power', icon: '🔥', category: 'powers', cost: 140, desc: 'Cool flames circle around your hero!' },
  { id: 'aura_frost', name: 'Ice Power', icon: '❄️', category: 'powers', cost: 160, desc: 'A freezing ice shield floats around you!' }
];

const HERO_TITLES = [
  "Little Sprout", "Math Beginner", "Number Explorer", "Addition Ace",
  "Subtraction Star", "Shape Finder", "Pattern Spotter", "Equation Helper",
  "Math Wizard", "Number Champion", "Math Superhero"
];

const getHeroTitle = (level) => {
  if (level <= 0) return HERO_TITLES[0];
  if (level >= HERO_TITLES.length) return "Math Legend";
  return HERO_TITLES[level];
};

// --- Reducer ---
const BACKUP_KEYS = [
  'stars', 'stage', 'current_stage', 'features', 'equipped_features',
  'purchased_items', 'hero_level', 'hero_exp', 'profile', 'daily_quests',
  'login_streak', 'reward_claimed_today', 'achievements', 'pet_love',
  'pet_bond_level', 'pet_color', 'pet_accessory'
];

function initState() {
  ensureProfile();            // make sure there's an active profile (namespace target)
  migrateLegacyGameData();    // once: carry old flat progress into the first profile
  const isAdmin = storage.get('admin_active') === 'true';
  const savedStage = storage.getInt('stage', 1);
  const savedCurrent = storage.getInt('current_stage', savedStage);
  return {
    activeView: 'dashboard',
    isAdminMode: isAdmin,
    stars: isAdmin ? 9999 : (storage.getInt('stars', 0) || (() => { const p = storage.getJSON('profile'); return p?.stars || 0; })()),
    maxStageUnlocked: isAdmin ? 24 : savedStage,
    currentStage: isAdmin ? 1 : savedCurrent,
    unlockedFeatures: isAdmin ? Array.from({ length: 24 }, (_, i) => i) : storage.getJSON('features', []),
    equippedFeatures: isAdmin ? Array.from({ length: 24 }, (_, i) => i) : (storage.getJSON('equipped_features') || storage.getJSON('features', [])),
    soundOn: true,
    selectedClassicGame: null,
    achievements: storage.getJSON('achievements', []),
    toast: null,
    sandboxType: 'bridge',
    sandboxTarget: 10,
    purchasedItems: storage.getJSON('purchased_items', []),
    activeShopCategory: 'pets',
    shopPreviewItem: null,
    consecutiveLogins: storage.getInt('login_streak', 1),
    dailyRewardClaimed: storage.get('reward_claimed_today') === 'true',
    showDailyModal: false,
    dailyQuests: storage.getJSON('daily_quests', []),
    heroLevel: storage.getInt('hero_level', 1),
    heroExp: storage.getInt('hero_exp', 0),
    frenzyActive: false,
    frenzyTimeLeft: 0,
    petLove: storage.getInt('pet_love', 0),
    petBondLevel: storage.getInt('pet_bond_level', 1),
    petFloatEmojis: [],
    petColor: storage.get('pet_color', 'blue'),
    petAccessory: storage.get('pet_accessory', 'none'),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, ...action.payload };
    case 'SET_VIEW': return { ...state, activeView: action.payload, selectedClassicGame: null };
    case 'ADD_FLOAT_EMOJI': return { ...state, petFloatEmojis: [...state.petFloatEmojis, action.payload] };
    case 'REMOVE_FLOAT_EMOJI': return { ...state, petFloatEmojis: state.petFloatEmojis.filter(e => e.id !== action.payload) };
    case 'RESET': return { ...initState(), activeView: 'dashboard', isAdminMode: false };
    case 'RELOAD': return { ...initState(), activeView: state.activeView, soundOn: state.soundOn };
    default: return state;
  }
}


export default function App() {
  const [state, dispatch] = useReducer(reducer, null, initState);
  const {
    activeView, isAdminMode, stars, maxStageUnlocked, currentStage,
    unlockedFeatures, equippedFeatures, soundOn, selectedClassicGame,
    achievements, toast, sandboxType, sandboxTarget, purchasedItems,
    activeShopCategory, shopPreviewItem, consecutiveLogins, dailyRewardClaimed,
    showDailyModal, dailyQuests, heroLevel, heroExp, frenzyActive, frenzyTimeLeft,
    petLove, petBondLevel, petFloatEmojis, petColor, petAccessory
  } = state;

  const isMountedRef = useRef(false);
  const set = (payload) => dispatch({ type: 'SET', payload });

  // --- Kid profiles + adaptive learning (cached in localStorage) ---
  const [profileUI, setProfileUI] = useState({ modal: false, report: false, ver: 0 });
  const refreshProfiles = () => setProfileUI((s) => ({ ...s, ver: s.ver + 1 }));
  useEffect(() => { ensureProfile(); refreshProfiles(); }, []);
  const activeProfile = getActiveProfile();

  // --- Save profile helper ---
  const saveProfile = (newStars, newStage, newFeatures) => {
    if (isAdminMode) return;
    storage.set('stars', newStars);
    storage.set('stage', newStage);
    storage.set('features', newFeatures);
    const profile = storage.getJSON('profile') || {
      stars: 0, attempts: {}, config: { addition: true, subtraction: true, range: 10 },
      themesOwned: ['classic'], themeEquipped: 'classic', stickersOwned: [], hintsUnlocked: [], costumesOwned: []
    };
    profile.stars = newStars;
    storage.set('profile', profile);
  };

  // --- URL params on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlStage = params.get('stage');
    const urlView = params.get('view');
    if (urlStage || urlView) {
      let stageVal = 1;
      let maxVal = storage.getInt('stage', 1);
      if (urlStage) {
        const parsed = parseInt(urlStage);
        if (!isNaN(parsed)) {
          stageVal = Math.max(1, Math.min(24, parsed));
          maxVal = Math.max(maxVal, stageVal);
          storage.set('current_stage', stageVal);
          storage.set('stage', maxVal);
          set({ currentStage: stageVal, maxStageUnlocked: maxVal });
        }
      }
      if (urlView) set({ activeView: urlView });
    }
  }, []);

  // --- Sync profile on view change ---
  useEffect(() => {
    const syncProfile = () => {
      if (isAdminMode) return;
      let starsVal = 0;
      const savedProfile = storage.getJSON('profile');
      if (savedProfile?.stars) starsVal = savedProfile.stars;
      if (!starsVal) starsVal = storage.getInt('stars', 0);
      const savedStage = storage.getInt('stage', 1);
      const savedCurrent = storage.getInt('current_stage', savedStage);
      const validated = Math.max(1, Math.min(24, Math.min(savedCurrent, savedStage)));
      set({
        stars: starsVal || stars,
        maxStageUnlocked: savedStage || maxStageUnlocked,
        currentStage: validated || currentStage,
        unlockedFeatures: storage.getJSON('features', []),
        equippedFeatures: storage.getJSON('equipped_features') || storage.getJSON('features', []),
        achievements: storage.getJSON('achievements', []),
        purchasedItems: storage.getJSON('purchased_items', []),
        consecutiveLogins: storage.getInt('login_streak', 1),
        dailyRewardClaimed: storage.get('reward_claimed_today') === 'true',
        dailyQuests: storage.getJSON('daily_quests', []),
        heroLevel: storage.getInt('hero_level', 1),
        heroExp: storage.getInt('hero_exp', 0),
        petLove: storage.getInt('pet_love', 0),
        petBondLevel: storage.getInt('pet_bond_level', 1),
      });
    };
    syncProfile();
    isMountedRef.current = true;
    window.addEventListener('storage', syncProfile);
    return () => window.removeEventListener('storage', syncProfile);
  }, [activeView, isAdminMode]);

  useEffect(() => { storage.set('current_stage', currentStage); }, [currentStage]);

  // --- iframe message handling ---
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data) return;
      if (e.data.type === 'evolution3d_ready') {
        const iframe = document.getElementById('evo3d-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'evolution3d_init', coins: stars, stage: currentStage, features: unlockedFeatures }, '*');
        }
      } else if (e.data.type === 'evolution3d_reward') {
        const clearedStage = e.data.stage;
        const earnedCoins = e.data.coins;
        playSound('chime');
        const finalStage = Math.min(24, clearedStage + 1);
        storage.set('current_stage', finalStage);
        const newFeatures = [...unlockedFeatures];
        const featureIdx = clearedStage - 1;
        if (featureIdx < 24 && !newFeatures.includes(featureIdx)) newFeatures.push(featureIdx);
        const nextStars = stars + earnedCoins;
        const newMax = Math.max(maxStageUnlocked, finalStage);
        set({ stars: nextStars, maxStageUnlocked: newMax, currentStage: finalStage, unlockedFeatures: newFeatures });
        saveProfile(nextStars, newMax, newFeatures);
      } else if (e.data.type === 'evolution3d_close') {
        set({ activeView: 'dashboard' });
      } else if (e.data.type === 'evolution3d_open') {
        set({ activeView: 'mathquest3d' });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [stars, currentStage, maxStageUnlocked, unlockedFeatures, isAdminMode]);

  // --- Daily login & quests ---
  const generateQuests = (seedDate) => {
    const newQuests = [
      { id: 'quest_solve', desc: 'Solve 5 math puzzles in 3D Quest', target: 5, current: 0, reward: 15, claimed: false },
      { id: 'quest_streak', desc: 'Get a 3x combo streak', target: 3, current: 0, reward: 15, claimed: false },
      { id: 'quest_minigame', desc: 'Play 1 mini-game', target: 1, current: 0, reward: 10, claimed: false }
    ];
    set({ dailyQuests: newQuests });
    storage.set('daily_quests', newQuests);
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = storage.get('last_login_date');
    if (lastLogin !== today) {
      storage.set('reward_claimed_today', 'false');
      let streak = 1;
      if (lastLogin) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastLogin === yesterday.toISOString().split('T')[0]) {
          streak = Math.min(5, consecutiveLogins + 1);
        }
      }
      set({ consecutiveLogins: streak, dailyRewardClaimed: false });
      storage.set('login_streak', streak);
      storage.set('last_login_date', today);
      generateQuests(today);
      setTimeout(() => set({ showDailyModal: true }), 1000);
    } else {
      if (!storage.getJSON('daily_quests')?.length) generateQuests(today);
    }
  }, []);

  // --- Star frenzy timer ---
  useEffect(() => {
    if (!frenzyActive || frenzyTimeLeft <= 0) return;
    const interval = setInterval(() => {
      set({ frenzyTimeLeft: frenzyTimeLeft - 1 });
      if (frenzyTimeLeft <= 1) set({ frenzyActive: false });
    }, 1000);
    return () => clearInterval(interval);
  }, [frenzyActive, frenzyTimeLeft]);

  // --- Core actions ---
  const triggerToast = (name, desc) => {
    set({ toast: { name, desc } });
    setTimeout(() => set({ toast: null }), 5000);
  };

  const addHeroExp = (amount) => {
    let nextExp = heroExp + amount;
    let nextLevel = heroLevel;
    let leveledUp = false;
    while (nextExp >= nextLevel * 100) {
      nextExp -= nextLevel * 100;
      nextLevel += 1;
      leveledUp = true;
    }
    set({ heroExp: nextExp, heroLevel: nextLevel });
    storage.set('hero_exp', nextExp);
    storage.set('hero_level', nextLevel);
    if (leveledUp) {
      const bonusStars = nextLevel * 20;
      const newStars = stars + bonusStars;
      set({ stars: newStars });
      saveProfile(newStars, maxStageUnlocked, unlockedFeatures);
      playSound('chime');
      triggerToast(`🚀 LEVEL UP! Level ${nextLevel}!`, `You are now "${getHeroTitle(nextLevel)}"! (+${bonusStars} Stars!)`);
    }
  };

  const updateQuestProgress = (actionType, value) => {
    const next = dailyQuests.map(q => {
      if (q.claimed) return q;
      if (actionType === 'solve' && q.id === 'quest_solve') return { ...q, current: Math.min(q.target, q.current + value) };
      if (actionType === 'streak' && q.id === 'quest_streak') return { ...q, current: Math.min(q.target, Math.max(q.current, value)) };
      if (actionType === 'minigame' && q.id === 'quest_minigame') return { ...q, current: Math.min(q.target, q.current + value) };
      return q;
    });
    set({ dailyQuests: next });
    storage.set('daily_quests', next);
  };

  const addStars = (amount) => {
    const finalAmount = frenzyActive ? amount * 2 : amount;
    const next = stars + finalAmount;
    set({ stars: next });
    saveProfile(next, maxStageUnlocked, unlockedFeatures);
    addHeroExp(finalAmount * 10);
    if (activeView.startsWith('mini-') || activeView === 'classic-labs') updateQuestProgress('minigame', 1);
  };

  const checkAndUnlockAchievements = (stageCompleted, currentStars, featuresList, maxStreak = 0) => {
    let unlockedAny = false;
    const current = [...achievements];
    const check = (id, name, desc, bonus = 20) => {
      if (!current.includes(id)) {
        current.push(id);
        unlockedAny = true;
        addStars(bonus);
        triggerToast(name, desc);
      }
    };
    if (stageCompleted >= 3) check('explorer', '🧭 Scout Explorer', 'Cleared 3 stages! (+20 Stars)');
    if (featuresList.length >= 10) check('evolved', '🦸 Super Evolved', 'Unlocked 10 character parts! (+20 Stars)');
    if (stageCompleted >= 24) check('champion', '👑 Grand Champion', 'Cleared all 24 stages! (+50 Stars)', 50);
    if (currentStars >= 100) check('star_collector', '💎 Star Collector', 'Got 100+ stars! (+20 Stars)');
    if (maxStreak >= 5) check('streak_master', '🔥 Streak Legend', '5x combo streak! (+20 Stars)');
    let bridgeCount = 0, hillCount = 0, subBridgeCount = 0, areaCount = 0, balanceCount = 0;
    for (let i = 1; i <= Math.min(24, stageCompleted); i++) {
      const p = getStageParams(i);
      if (p?.type === 'bridge') bridgeCount++;
      else if (p?.type === 'hill') hillCount++;
      else if (p?.type === 'sub_bridge') subBridgeCount++;
      else if (p?.type === 'area') areaCount++;
      else if (p?.type === 'balance') balanceCount++;
    }
    if (bridgeCount >= 3) check('bridge_builder', '🌉 Bridge Builder', 'Built 3 bridges! (+20 Stars)');
    if (hillCount >= 3) check('stair_climber', '🧗 Stair Climber', 'Climbed 3 stairs! (+20 Stars)');
    if (subBridgeCount >= 3) check('log_cutter', '🪓 Log Cutter', 'Cut 3 logs! (+20 Stars)');
    if (areaCount >= 3) check('area_designer', '📐 Area Designer', 'Built 3 grids! (+20 Stars)');
    if (balanceCount >= 3) check('balance_scale', '⚖️ Scale Master', 'Balanced 3 scales! (+20 Stars)');
    if (unlockedAny) {
      storage.set('achievements', current);
      set({ achievements: current });
    }
  };

  const handleLevelComplete = (earnedCoins, redirectView = 'stats', maxStreak = 0) => {
    playSound('chime');
    const featureIdx = currentStage - 1;
    const newFeatures = [...unlockedFeatures];
    if (featureIdx < 24 && !newFeatures.includes(featureIdx)) newFeatures.push(featureIdx);
    const finalStage = Math.min(24, currentStage + 1);
    storage.set('current_stage', finalStage);
    const nextEquipped = [...equippedFeatures];
    if (featureIdx < 24 && !nextEquipped.includes(featureIdx)) {
      nextEquipped.push(featureIdx);
      storage.set('equipped_features', nextEquipped);
    }
    let coinsToAdd = frenzyActive ? earnedCoins * 2 : earnedCoins;
    if (frenzyActive) triggerToast('🔥 STAR FRENZY!', `Double Stars! Got ${coinsToAdd} Stars!`);
    const nextStars = stars + coinsToAdd;
    const newMax = Math.max(maxStageUnlocked, finalStage);
    set({ stars: nextStars, maxStageUnlocked: newMax, currentStage: finalStage, unlockedFeatures: newFeatures, equippedFeatures: nextEquipped });
    saveProfile(nextStars, newMax, newFeatures);
    setTimeout(() => checkAndUnlockAchievements(finalStage, nextStars, newFeatures, maxStreak), 800);
    addHeroExp(coinsToAdd * 10);
    updateQuestProgress('solve', 1);
    if (redirectView) set({ activeView: redirectView });
  };

  const claimQuestReward = (questId) => {
    const quest = dailyQuests.find(q => q.id === questId);
    if (quest && !quest.claimed && quest.current >= quest.target) {
      playSound('chime');
      addStars(quest.reward);
      const next = dailyQuests.map(q => q.id === questId ? { ...q, claimed: true } : q);
      set({ dailyQuests: next });
      storage.set('daily_quests', next);
    }
  };

  const claimDailyReward = () => {
    if (dailyRewardClaimed) return;
    playSound('chime');
    const rewards = [10, 15, 25, 35, 50];
    const reward = rewards[Math.min(4, consecutiveLogins - 1)];
    addStars(reward);
    set({ dailyRewardClaimed: true, showDailyModal: false });
    storage.set('reward_claimed_today', 'true');
    triggerToast('🎁 Daily Reward!', `Got ${reward} Stars! Day ${consecutiveLogins} streak!`);
  };

  const feedPet = (foodCost) => {
    if (stars < foodCost) { playSound('buzz'); alert(`You need ${foodCost} more stars for pet food!`); return; }
    playSound('chime');
    playPetVoice('happy'); // the pet chirps happily when fed
    const nextStars = stars - foodCost;
    set({ stars: nextStars });
    saveProfile(nextStars, maxStageUnlocked, unlockedFeatures);
    const emojis = ['❤️', '😋', '🎉', '✨', '🥰', '🐾'];
    const id = Date.now() + Math.random();
    dispatch({ type: 'ADD_FLOAT_EMOJI', payload: { id, emoji: emojis[Math.floor(Math.random() * emojis.length)], x: Math.random() * 80 - 40, y: Math.random() * -30 } });
    setTimeout(() => dispatch({ type: 'REMOVE_FLOAT_EMOJI', payload: id }), 1500);
    const nextLove = petLove + 25;
    if (nextLove >= 100) {
      const nextBond = petBondLevel + 1;
      set({ petLove: 0, petBondLevel: nextBond });
      storage.set('pet_love', 0);
      storage.set('pet_bond_level', nextBond);
      setTimeout(() => { playPetVoice('excited'); playSound('chime'); addStars(25); triggerToast('💖 Pet Level Up!', 'Your pet loves you! +25 Stars!'); }, 500);
    } else {
      set({ petLove: nextLove });
      storage.set('pet_love', nextLove);
    }
  };

  const buyShopItem = (item) => {
    if (stars < item.cost) { playSound('buzz'); alert(`You need ${item.cost - stars} more stars!`); return; }
    playSound('chime');
    const nextStars = stars - item.cost;
    const nextPurchased = [...purchasedItems, item.id];
    set({ stars: nextStars, purchasedItems: nextPurchased });
    storage.set('purchased_items', nextPurchased);
    saveProfile(nextStars, maxStageUnlocked, unlockedFeatures);
    setTimeout(() => toggleShopItemEquip(item.id), 100);
    triggerToast('🎉 New Gear!', `You got ${item.name}!`);
  };

  const toggleFeatureEquip = (idx) => {
    playSound('click');
    const next = equippedFeatures.includes(idx) ? equippedFeatures.filter(x => x !== idx) : [...equippedFeatures, idx];
    set({ equippedFeatures: next });
    storage.set('equipped_features', next);
  };

  const toggleShopItemEquip = (itemId) => {
    playSound('click');
    const itemObj = SHOP_ITEMS.find(i => i.id === itemId);
    if (!itemObj) return;
    let next;
    if (equippedFeatures.includes(itemId)) {
      next = equippedFeatures.filter(x => x !== itemId);
    } else {
      next = equippedFeatures.filter(f => {
        if (itemObj.category === 'pets') return f !== 12 && f !== 'pet_phoenix' && f !== 'pet_panda' && f !== 'pet_robot';
        if (itemObj.category === 'clothes') {
          if (itemId === 'cape_rainbow') return f !== 6 && f !== 'cape_rainbow';
          if (itemId === 'suit_astronaut' || itemId === 'armor_gold') return f !== 1 && f !== 2 && f !== 4 && f !== 16 && f !== 17 && f !== 18 && f !== 'suit_astronaut' && f !== 'armor_gold';
        }
        if (itemObj.category === 'powers') return f !== 13 && f !== 'aura_lightning' && f !== 'aura_fire' && f !== 'aura_frost';
        return true;
      });
      next.push(itemId);
    }
    set({ equippedFeatures: next });
    storage.set('equipped_features', next);
  };

  const getEquippedPet = () => {
    if (equippedFeatures.includes('pet_phoenix')) return { id: 'pet_phoenix', name: 'Phoenix Buddy', icon: '🐦', food: 'Berries 🍒' };
    if (equippedFeatures.includes('pet_panda')) return { id: 'pet_panda', name: 'Space Panda', icon: '🐼', food: 'Cookies 🍪' };
    if (equippedFeatures.includes('pet_robot')) return { id: 'pet_robot', name: 'Robo Helper', icon: '🤖', food: 'Batteries ⚡' };
    if (equippedFeatures.includes(12)) return { id: 12, name: 'Pet Dragon', icon: '🐉', food: 'Treats 🍖' };
    return null;
  };

  const getPreviewFeatures = () => {
    if (!shopPreviewItem) return equippedFeatures;
    const previewObj = SHOP_ITEMS.find(i => i.id === shopPreviewItem);
    if (!previewObj) return equippedFeatures;
    return equippedFeatures.filter(f => {
      if (previewObj.category === 'pets') return f !== 12 && f !== 'pet_phoenix' && f !== 'pet_panda' && f !== 'pet_robot';
      if (previewObj.category === 'clothes') {
        if (previewObj.id === 'cape_rainbow') return f !== 6 && f !== 'cape_rainbow';
        if (previewObj.id === 'suit_astronaut' || previewObj.id === 'armor_gold') return f !== 1 && f !== 2 && f !== 4 && f !== 16 && f !== 17 && f !== 18 && f !== 'suit_astronaut' && f !== 'armor_gold';
      }
      if (previewObj.category === 'powers') return f !== 13 && f !== 'aura_lightning' && f !== 'aura_fire' && f !== 'aura_frost';
      return true;
    }).concat([shopPreviewItem]);
  };

  const toggleSound = () => { const next = !soundOn; set({ soundOn: next }); setSoundEnabled(next); playSound('click'); };

  const handleStageSelect = (stageNum) => {
    playSound('click');
    const validated = Math.max(1, Math.min(24, Math.min(stageNum, maxStageUnlocked)));
    storage.set('current_stage', validated);
    set({ currentStage: validated, activeView: 'mathquest3d' });
  };

  // --- Runner game rewards: coins -> stars, earned power-ups -> unlock + equip hero gear ---
  const handleRunnerReward = (coins, earnedFeatureIdxs = []) => {
    if (coins > 0) addStars(coins);
    if (earnedFeatureIdxs.length) {
      const newFeatures = [...unlockedFeatures];
      const newEquipped = [...equippedFeatures];
      earnedFeatureIdxs.forEach(idx => {
        if (typeof idx === 'number' && idx >= 0 && idx < 24) {
          if (!newFeatures.includes(idx)) newFeatures.push(idx);
          if (!newEquipped.includes(idx)) newEquipped.push(idx);
        }
      });
      set({ unlockedFeatures: newFeatures, equippedFeatures: newEquipped });
      storage.set('features', newFeatures);
      storage.set('equipped_features', newEquipped);
      saveProfile(stars + coins, maxStageUnlocked, newFeatures);
      const names = earnedFeatureIdxs.map(i => FEATURE_NAMES[i]).filter(Boolean).join(', ');
      if (names) triggerToast('⚡ Power-Ups Earned!', `You won: ${names}!`);
    }
  };

  const triggerStarFrenzy = () => {
    if (frenzyActive) return;
    playSound('chime');
    set({ frenzyActive: true, frenzyTimeLeft: 30 });
    triggerToast('🔥 STAR FRENZY!', 'Double Stars for 30 seconds! Go fast!');
  };

  const changePetColor = (color) => { set({ petColor: color }); storage.set('pet_color', color); };
  const changePetAccessory = (mod) => { set({ petAccessory: mod }); storage.set('pet_accessory', mod); };

  // --- Admin ---
  const handleAdminClick = () => {
    playSound('click');
    if (isAdminMode) {
      const backup = storage.getJSON('admin_backup');
      if (backup) {
        BACKUP_KEYS.forEach(key => {
          if (backup[nsPrefix() + key] !== undefined) localStorage.setItem(nsPrefix() + key, backup[nsPrefix() + key]);
          else localStorage.removeItem(nsPrefix() + key);
        });
      }
      storage.remove('admin_backup');
      storage.remove('admin_active');
      set({
        isAdminMode: false,
        stars: storage.getInt('stars', 0),
        maxStageUnlocked: storage.getInt('stage', 1),
        currentStage: storage.getInt('current_stage', 1),
        unlockedFeatures: storage.getJSON('features', []),
        equippedFeatures: storage.getJSON('equipped_features') || storage.getJSON('features', []),
        achievements: storage.getJSON('achievements', []),
        purchasedItems: storage.getJSON('purchased_items', []),
        heroLevel: storage.getInt('hero_level', 1),
        heroExp: storage.getInt('hero_exp', 0),
        petLove: storage.getInt('pet_love', 0),
        petBondLevel: storage.getInt('pet_bond_level', 1),
        petColor: storage.get('pet_color', 'blue'),
        petAccessory: storage.get('pet_accessory', 'none'),
      });
      alert("Admin Mode off. Progress restored!");
    } else {
      const pwd = window.prompt("Enter Admin Password:");
      if (pwd === '12345') {
        const backupData = {};
        BACKUP_KEYS.forEach(key => { const val = localStorage.getItem(nsPrefix() + key); if (val !== null) backupData[nsPrefix() + key] = val; });
        storage.set('admin_backup', backupData);
        storage.set('admin_active', 'true');
        const allFeatures = Array.from({ length: 24 }, (_, i) => i);
        set({ isAdminMode: true, stars: 9999, maxStageUnlocked: 24, unlockedFeatures: allFeatures, equippedFeatures: allFeatures });
        alert("Admin Mode on! 9,999 Stars, everything unlocked.");
      } else if (pwd !== null) {
        alert("Wrong password!");
      }
    }
  };

  const resetEntireGame = () => {
    if (!window.confirm("Are you sure? This will erase ALL your stars and progress!")) return;
    playSound('click');
    BACKUP_KEYS.forEach(key => storage.remove(key));
    storage.remove('admin_backup');
    storage.remove('admin_active');
    storage.remove('last_login_date');
    const defaultProfile = {
      stars: 0, attempts: {}, config: { addition: true, subtraction: true, range: 10 },
      themesOwned: ['classic'], themeEquipped: 'classic', stickersOwned: [], hintsUnlocked: [], costumesOwned: []
    };
    storage.set('profile', defaultProfile);
    storage.set('stage', 1);
    storage.set('current_stage', 1);
    storage.set('features', []);
    storage.set('stars', 0);
    set({
      activeView: 'dashboard', isAdminMode: false, stars: 0, currentStage: 1, maxStageUnlocked: 1,
      unlockedFeatures: [], equippedFeatures: [], achievements: [], purchasedItems: [],
      consecutiveLogins: 1, dailyRewardClaimed: false, heroLevel: 1, heroExp: 0,
      petLove: 0, petBondLevel: 1, petColor: 'blue', petAccessory: 'none'
    });
    generateQuests(new Date().toISOString().split('T')[0]);
  };

  // --- Shared styles ---
  const btnStyle = { minHeight: '48px', minWidth: '48px', fontSize: '1.1rem', padding: '12px 20px' };


  // ==================== RENDER ====================
  return (
    <div className="app-container">
      {/* Toast notification */}
      {toast && (
        <div className="no-print" style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '4px solid #d97706',
          borderRadius: '20px', padding: '14px 24px', boxShadow: '0 10px 25px rgba(245,158,11,0.4)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: '12px',
          fontFamily: "'Fredoka', sans-serif", animation: 'slideDownIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)'
        }}>
          <style>{`@keyframes slideDownIn { 0% { transform: translate(-50%, -100px); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }`}</style>
          <span style={{ fontSize: '2.5rem' }}>🏆</span>
          <div style={{ display: 'flex', flexDirection: 'column', color: '#78350f', textAlign: 'left' }}>
            <span style={{ fontWeight: '900', fontSize: '1.2rem' }}>{toast.name}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{toast.desc}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header>
        <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => { playSound('click'); set({ activeView: 'dashboard', selectedClassicGame: null }); }}>
          <span className="logo-icon">🎈</span>
          <h1>Toy Land Play Lab</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => { playSound('click'); setProfileUI((s) => ({ ...s, modal: true })); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ede9fe', border: '3px solid #8b5cf6', padding: '6px 14px', borderRadius: '9999px', fontWeight: '800', color: '#6b21a8', fontSize: '1.05rem', boxShadow: '0 3px 0 #8b5cf6', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '1.2rem' }}>{activeProfile ? activeProfile.avatar : '🦸'}</span>
            <span>{activeProfile ? activeProfile.name : 'Player'}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '3px solid #0284c7', padding: '8px 16px', borderRadius: '9999px', fontWeight: '800', color: '#0369a1', fontSize: '1.05rem', boxShadow: '0 3px 0 #0284c7' }}>
            🎖️ <span>Lvl {heroLevel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef08a', border: '3px solid #eab308', padding: '8px 16px', borderRadius: '9999px', fontWeight: '800', color: '#854d0e', fontSize: '1.05rem', boxShadow: '0 3px 0 #eab308' }}>
            🪙 <span>{stars} Stars</span>
          </div>
          <button className="bubble-btn" onClick={toggleSound} style={btnStyle}>
            {soundOn ? '🔊 On' : '🔇 Off'}
          </button>
          <button className="bubble-btn warning" onClick={handleAdminClick} style={{ ...btnStyle, background: isAdminMode ? '#22c55e' : '#f59e0b', color: 'white', borderColor: isAdminMode ? '#16a34a' : '#d97706', boxShadow: isAdminMode ? '0 3px 0 #15803d' : '0 3px 0 #b45309' }}>
            🔑 {isAdminMode ? 'Admin On' : 'Admin'}
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-container no-print">
        {[
          ['dashboard', '🏠 Home'],
          ['mathquest3d', '🚀 3D Math Quest'],
          ['runner', '🏃 Run Game'],
          ['sandbox', '🧪 Sandbox'],
          ['classic-labs', '🎮 Practice Lab'],
          ['stats', '🏆 My Hero'],
          ['shop3d', '🏪 Shop'],
        ].map(([view, label]) => (
          <button
            key={view}
            className={`bubble-btn ${activeView === view ? 'active' : ''}`}
            onClick={() => { playSound('click'); set({ activeView: view, selectedClassicGame: null }); }}
            style={{ ...btnStyle, fontSize: '1rem', padding: '10px 16px' }}
          >
            {label}
          </button>
        ))}
        <button
          className="bubble-btn"
          onClick={() => { playSound('click'); setProfileUI((s) => ({ ...s, modal: true })); }}
          style={{ ...btnStyle, fontSize: '1rem', padding: '10px 16px', background: '#8b5cf6', color: 'white', borderColor: '#6d28d9', boxShadow: '0 3px 0 #6d28d9' }}
        >
          👤 Players & Report
        </button>
      </nav>

      {/* Main content */}
      <main style={{ flexGrow: 1, position: 'relative' }}>
        <Suspense fallback={<GameLoader />}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (
          <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* 3D Quest Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4)', borderRadius: '24px',
              padding: '30px', marginBottom: '30px', color: 'white', display: 'flex', flexWrap: 'wrap',
              gap: '20px', alignItems: 'center', boxShadow: '0 10px 25px rgba(99,102,241,0.35)',
              position: 'relative', overflow: 'hidden', border: '4px solid #a78bfa'
            }}>
              <div style={{ position: 'absolute', right: '-30px', bottom: '-30px', fontSize: '10rem', opacity: 0.12, userSelect: 'none' }}>🦸‍♂️</div>
              <div style={{ flex: 1, minWidth: '260px', zIndex: 1 }}>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '800', marginBottom: '12px' }}>🌟 Main Game</div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: '900', margin: '0 0 10px 0' }}>3D Math Quest!</h2>
                <p style={{ fontSize: '1.1rem', margin: '0 0 12px 0', opacity: 0.95, lineHeight: '1.5' }}>
                  Help your hero grow stronger by solving 24 fun math puzzles! 🧮✨
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                  {['➕ Addition', '➖ Subtraction', '✖️ Multiply', '⚖️ Balance', '🕐 Clocks', '🍕 Fractions'].map(tag => (
                    <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '8px' }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '180px', zIndex: 1, margin: '0 auto' }}>
                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🦸‍♂️</div>
                <button className="bubble-btn success" onClick={() => { playSound('click'); set({ activeView: 'mathquest3d' }); }} style={{ fontSize: '1.3rem', padding: '14px 28px', background: '#facc15', color: '#1e293b', borderColor: '#eab308', boxShadow: '0 6px 0 #ca8a04', minHeight: '56px' }}>
                  🚀 Play Stage {currentStage}!
                </button>
                {maxStageUnlocked > 1 && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>Stage:</span>
                    <select value={currentStage} onChange={(e) => { playSound('click'); const val = parseInt(e.target.value); storage.set('current_stage', val); set({ currentStage: val }); }}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '2px solid #a78bfa', background: 'white', color: '#4f46e5', fontWeight: '800', cursor: 'pointer', minHeight: '36px' }}>
                      {Array.from({ length: maxStageUnlocked }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>Stage {i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 2D Practice Lab Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669, #06b6d4)', borderRadius: '24px',
              padding: '28px', marginBottom: '30px', color: 'white', display: 'flex', flexWrap: 'wrap',
              gap: '20px', alignItems: 'center', boxShadow: '0 8px 22px rgba(16,185,129,0.3)',
              position: 'relative', overflow: 'hidden', border: '4px solid #34d399'
            }}>
              <div style={{ position: 'absolute', right: '-25px', bottom: '-25px', fontSize: '9rem', opacity: 0.1, userSelect: 'none' }}>🎮</div>
              <div style={{ flex: 1, minWidth: '260px', zIndex: 1 }}>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '800', marginBottom: '12px' }}>🕹️ Practice Games</div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 8px 0' }}>14 Fun Mini-Games!</h2>
                <p style={{ fontSize: '1.05rem', margin: 0, opacity: 0.95 }}>
                  Play fractions, clocks, money, puzzles, and more! 🎉
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '180px', zIndex: 1, margin: '0 auto' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>🎮</div>
                <button className="bubble-btn success" onClick={() => { playSound('click'); set({ activeView: 'classic-labs' }); }} style={{ fontSize: '1.2rem', padding: '12px 24px', background: '#fbbf24', color: '#1e293b', borderColor: '#eab308', boxShadow: '0 5px 0 #ca8a04', minHeight: '52px' }}>
                  🎮 Open Practice Lab
                </button>
              </div>
            </div>

            {/* Daily Quests */}
            <div style={{ background: '#fcf6ff', border: '4px solid #a855f7', borderRadius: '24px', padding: '20px', marginBottom: '30px', boxShadow: '0 8px 20px rgba(168,85,247,0.15)', fontFamily: "'Fredoka', sans-serif" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px dashed #d8b4fe', paddingBottom: '8px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#6b21a8', fontSize: '1.4rem' }}>✨ Today's Quests ✨</h3>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#7c3aed', background: '#f3e8ff', padding: '4px 12px', borderRadius: '99px' }}>Resets Daily!</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dailyQuests.map(quest => {
                  const canClaim = quest.current >= quest.target && !quest.claimed;
                  const pct = Math.min(100, (quest.current / quest.target) * 100);
                  return (
                    <div key={quest.id} style={{
                      display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                      background: quest.claimed ? '#f1f5f9' : 'white', border: quest.claimed ? '2px solid #cbd5e1' : '2px solid #e9d5ff',
                      borderRadius: '16px', padding: '14px 18px', gap: '12px', opacity: quest.claimed ? 0.7 : 1
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.3rem' }}>{quest.claimed ? '✅' : canClaim ? '🌟' : '🎯'}</span>
                          <span style={{ fontWeight: '800', color: quest.claimed ? '#94a3b8' : '#475569', fontSize: '1rem' }}>{quest.desc}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flexGrow: 1, height: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: quest.claimed ? '#cbd5e1' : '#a855f7', borderRadius: '99px', transition: 'width 0.3s ease' }}></div>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#64748b' }}>{quest.current}/{quest.target}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#854d0e', background: '#fef08a', padding: '4px 10px', borderRadius: '99px', border: '1px solid #eab308' }}>🪙 +{quest.reward}</div>
                        <button disabled={!canClaim} onClick={() => claimQuestReward(quest.id)}
                          className={`bubble-btn ${quest.claimed ? '' : canClaim ? 'success' : 'primary'}`}
                          style={{ ...btnStyle, padding: '8px 16px', fontSize: '0.95rem', opacity: quest.claimed ? 0.5 : canClaim ? 1 : 0.6, cursor: canClaim ? 'pointer' : 'default' }}>
                          {quest.claimed ? '✅ Done!' : canClaim ? '🎁 Claim!' : '🔒 Locked'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Learning Report card */}
            {(() => {
              const st = getStats();
              return (
                <div style={{ background: '#eff6ff', border: '4px solid #0ea5e9', borderRadius: '24px', padding: '20px', marginBottom: '30px', boxShadow: '0 8px 20px rgba(14,165,233,0.15)', fontFamily: "'Fredoka', sans-serif" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '3px dashed #bae6fd', paddingBottom: '10px', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, color: '#0369a1', fontSize: '1.4rem' }}>📊 {st ? `${st.avatar} ${st.name}'s` : ''} Learning Report</h3>
                    <button className="bubble-btn primary" onClick={() => { playSound('click'); setProfileUI((s) => ({ ...s, report: true })); }} style={{ ...btnStyle, fontSize: '0.95rem', padding: '8px 16px' }}>See Full Report →</button>
                  </div>
                  {st && st.totalPuzzles > 0 ? (
                    <div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <span style={{ background: '#e0f2fe', border: '2px solid #38bdf8', borderRadius: '99px', padding: '6px 14px', fontWeight: '800', color: '#075985' }}>🧩 {st.totalPuzzles} puzzles</span>
                        <span style={{ background: '#dcfce7', border: '2px solid #4ade80', borderRadius: '99px', padding: '6px 14px', fontWeight: '800', color: '#166534' }}>✅ {Math.round(st.accuracy * 100)}% correct</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                        <div style={{ background: 'white', border: '2px solid #bbf7d0', borderRadius: '14px', padding: '10px 14px' }}>
                          <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.9rem', marginBottom: '4px' }}>😌 Easy (relaxing)</div>
                          <div style={{ color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>{st.easiest.length ? st.easiest.join(', ') : 'Keep playing to master skills!'}</div>
                        </div>
                        <div style={{ background: 'white', border: '2px solid #fecaca', borderRadius: '14px', padding: '10px 14px' }}>
                          <div style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.9rem', marginBottom: '4px' }}>🔁 Repeating to teach</div>
                          <div style={{ color: '#475569', fontWeight: '700', fontSize: '0.85rem' }}>{st.hardest.length ? st.hardest.join(', ') : 'Nothing tricky right now 🎉'}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#64748b', fontWeight: '700', margin: 0 }}>
                      No puzzles solved yet! Play the <b>🏃 Run Game</b> and grab a power-up to start a timed math puzzle — your progress shows up here.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Trophy Shelf */}
            <div className="trophy-shelf-container">
              <h3 className="trophy-shelf-title">🏆 My Trophies 🏆</h3>
              <div className="trophy-shelf-grid">
                {[
                  { id: 1, name: 'Beginner Cup', icon: '🏆', req: 5, label: 'Stage 5' },
                  { id: 2, name: 'Expert Shield', icon: '🛡️', req: 10, label: 'Stage 10' },
                  { id: 3, name: 'Master Goblet', icon: '🏺', req: 15, label: 'Stage 15' },
                  { id: 4, name: 'Champion Crown', icon: '👑', req: 20, label: 'Stage 20' },
                  { id: 5, name: 'Graduation!', icon: '🎓', req: 24, label: 'All Done!' }
                ].map(t => {
                  const unlocked = maxStageUnlocked >= t.req;
                  return (
                    <div key={t.id} className={`trophy-pedestal ${unlocked ? 'unlocked' : ''}`}>
                      <span className="trophy-icon">{t.icon}</span>
                      <span className="trophy-name">{t.name}</span>
                      <span className="trophy-status">{unlocked ? '🎉 Got it!' : t.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Games Grid */}
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: '800', borderBottom: '3px dashed #cbd5e1', paddingBottom: '8px', margin: '30px 0 15px 0' }}>🎮 All Practice Games</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {classicGamesList.map(game => (
                <div key={game.id} className="game-card" onClick={() => { playSound('click'); set({ activeView: 'classic-labs', selectedClassicGame: game.id }); }}
                  style={{ borderColor: game.categoryColor, boxShadow: `0 6px 0 ${game.categoryShadow}` }}>
                  <div className="game-card-icon">{game.icon}</div>
                  <div className="game-card-title" style={{ color: game.categoryColor }}>{game.title}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', background: game.categoryBG, color: game.categoryColor, padding: '2px 8px', borderRadius: '9999px', marginBottom: '8px' }}>{game.category}</div>
                  <p className="game-card-desc" style={{ minHeight: '60px' }}>{game.description}</p>
                  <button className="bubble-btn" style={{ marginTop: 'auto', width: '100%', background: game.categoryColor, borderColor: game.categoryColor, color: 'white', boxShadow: `0 4px 0 ${game.categoryShadow}`, ...btnStyle, fontSize: '1rem' }}>
                    ▶️ Play!
                  </button>
                </div>
              ))}
            </div>

            {/* Reset */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px', borderTop: '3px dashed #cbd5e1', paddingTop: '25px' }}>
              <button className="bubble-btn danger" onClick={resetEntireGame} style={{ ...btnStyle, background: '#ef4444', borderColor: '#dc2626', color: '#fff', boxShadow: '0 5px 0 #b91c1c' }}>
                ⚠️ Start Over (Reset Everything)
              </button>
            </div>
          </div>
        )}


        {/* ===== 3D MATH QUEST ===== */}
        {activeView === 'mathquest3d' && (
          <div style={{ width: '100%', height: 'calc(100vh - 120px)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#f8fafc', borderBottom: '4px solid #e2e8f0', zIndex: 10, flexWrap: 'wrap', gap: '8px' }}>
              <button className="bubble-btn danger" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={btnStyle}>
                ✕ Go Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="bubble-btn primary" disabled={currentStage <= 1}
                  onClick={() => { playSound('click'); const prev = Math.max(1, currentStage - 1); storage.set('current_stage', prev); set({ currentStage: prev }); }}
                  style={{ ...btnStyle, opacity: currentStage <= 1 ? 0.4 : 1 }}>
                  ◀ Back
                </button>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e293b', fontFamily: "'Fredoka', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🦸‍♂️ Stage:
                  <select value={currentStage} onChange={(e) => { playSound('click'); const val = parseInt(e.target.value); storage.set('current_stage', val); set({ currentStage: val }); }}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '2px solid #cbd5e1', background: 'white', color: '#1e293b', fontWeight: '800', cursor: 'pointer', minHeight: '36px' }}>
                    {Array.from({ length: maxStageUnlocked }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>Stage {i + 1}</option>
                    ))}
                  </select>
                </span>
                <button className="bubble-btn primary" disabled={currentStage >= maxStageUnlocked}
                  onClick={() => { playSound('click'); const next = Math.min(24, Math.min(maxStageUnlocked, currentStage + 1)); storage.set('current_stage', next); set({ currentStage: next }); }}
                  style={{ ...btnStyle, opacity: currentStage >= maxStageUnlocked ? 0.4 : 1 }}>
                  Next ▶
                </button>
              </div>
              <button className="bubble-btn danger" onClick={resetEntireGame} style={{ ...btnStyle, background: '#ef4444', borderColor: '#dc2626', boxShadow: '0 4px 0 #b91c1c' }}>
                ⚠️ Reset
              </button>
            </div>
            <div style={{ flexGrow: 1, position: 'relative' }}>
              <MathQuest3D
                key={currentStage}
                stageNum={currentStage}
                features={equippedFeatures}
                petColor={petColor}
                petAccessory={petAccessory}
                onLevelComplete={(earnedCoins, nextView, maxStreak) => handleLevelComplete(earnedCoins, nextView || 'stats', maxStreak || 0)}
                soundEnabled={soundOn}
              />
            </div>
          </div>
        )}

        {/* ===== RUN GAME (endless runner) ===== */}
        {activeView === 'runner' && (
          <div style={{ width: '100%', height: 'calc(100vh - 120px)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#0f172a', borderBottom: '4px solid #1e293b', zIndex: 10 }}>
              <button className="bubble-btn danger" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={btnStyle}>✕ Go Back</button>
              <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#c084fc', fontFamily: "'Fredoka', sans-serif" }}>🏃 Teleporter Run</span>
              <div style={{ width: '110px' }}></div>
            </div>
            <div style={{ flexGrow: 1, position: 'relative' }}>
              <ErrorBoundary onHome={() => set({ activeView: 'dashboard' })}>
                <RunnerGame
                  key={`run-${currentStage}-${stars}`}
                  level={currentStage <= 8 ? 1 : currentStage <= 16 ? 2 : 3}
                  features={equippedFeatures}
                  unlockedFeatures={unlockedFeatures}
                  petColor={petColor}
                  petAccessory={petAccessory}
                  onEarnReward={handleRunnerReward}
                  onExit={() => { playSound('click'); set({ activeView: 'dashboard' }); }}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* ===== MINI-GAMES ===== */}
        {activeView === 'mini-cookie' && (
          <div style={{ padding: '24px', maxWidth: '640px', margin: '30px auto' }}>
            <button className="bubble-btn" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={btnStyle}>← Back Home</button>
            <CookieMonsterGame onEarnStars={addStars} />
          </div>
        )}
        {activeView === 'mini-seesaw' && (
          <div style={{ padding: '24px', maxWidth: '640px', margin: '30px auto' }}>
            <button className="bubble-btn" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={btnStyle}>← Back Home</button>
            <SeeSawGame onEarnStars={addStars} />
          </div>
        )}
        {activeView === 'mini-alligator' && (
          <div style={{ padding: '24px', maxWidth: '640px', margin: '30px auto' }}>
            <button className="bubble-btn" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={btnStyle}>← Back Home</button>
            <AlligatorGame onEarnStars={addStars} />
          </div>
        )}

        {/* ===== CLASSIC 2D LABS ===== */}
        {activeView === 'classic-labs' && (
          <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            {selectedClassicGame === null ? (
              <div style={{ flexGrow: 1, overflowY: 'auto', padding: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: '800', margin: 0 }}>🎮 Practice Lab: 14 Games!</h2>
                  <button className="bubble-btn danger" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={btnStyle}>← Back Home</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  {classicGamesList.map(game => (
                    <div key={game.id} className="game-card" onClick={() => { playSound('click'); set({ selectedClassicGame: game.id }); }}
                      style={{ borderColor: game.categoryColor, boxShadow: `0 6px 0 ${game.categoryShadow}` }}>
                      <div className="game-card-icon">{game.icon}</div>
                      <div className="game-card-title" style={{ color: game.categoryColor }}>{game.title}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', background: game.categoryBG, color: game.categoryColor, padding: '2px 8px', borderRadius: '9999px', marginBottom: '8px' }}>{game.category}</div>
                      <p className="game-card-desc" style={{ minHeight: '60px' }}>{game.description}</p>
                      <button className="bubble-btn" style={{ marginTop: 'auto', width: '100%', background: game.categoryColor, borderColor: game.categoryColor, color: 'white', boxShadow: `0 4px 0 ${game.categoryShadow}`, ...btnStyle, fontSize: '1rem' }}>
                        ▶️ Play!
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <button className="bubble-btn" onClick={() => { playSound('click'); set({ selectedClassicGame: null }); }} style={btnStyle}>← Back to Games</button>
                  <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#4b5563', fontFamily: "'Fredoka', sans-serif" }}>
                    {classicGamesList.find(g => g.id === selectedClassicGame)?.icon} {classicGamesList.find(g => g.id === selectedClassicGame)?.title}
                  </span>
                </div>
                <iframe
                  src={`/legacy-vanilla/index.html?game=${selectedClassicGame}`}
                  title="Classic 2D Labs"
                  style={{ flexGrow: 1, width: '100%', border: '4px solid #34d399', borderRadius: '24px', background: '#f8fafc', boxShadow: '0 10px 25px rgba(16,185,129,0.15)' }}
                />
              </div>
            )}
          </div>
        )}


        {/* ===== STATS / HERO VIEW ===== */}
        {activeView === 'stats' && (
          <div className="progress-panel" style={{ maxWidth: '900px', margin: '30px auto' }}>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: '800', margin: '0 0 15px 0', borderBottom: '3px dashed #cbd5e1', paddingBottom: '10px' }}>
              🏆 My Hero & Gear Room
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
              {/* 3D Character */}
              <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'sticky', top: '20px' }}>
                <div style={{ width: '100%', height: '320px', background: '#f8fafc', border: '4px solid #cbd5e1', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.05)' }}>
                  <HeroCanvas features={equippedFeatures} petColor={petColor} petAccessory={petAccessory} />
                </div>
                <div style={{ fontWeight: '900', fontSize: '1.4rem', color: '#1e293b', marginTop: '12px' }}>
                  {getHeroTitle(heroLevel)} (Lvl {heroLevel})
                </div>
                <div style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: '800', marginBottom: '8px' }}>
                  Parts Unlocked: {unlockedFeatures.length} / 24
                </div>
                {/* XP Bar */}
                <div style={{ width: '100%', padding: '0 10px', boxSizing: 'border-box', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                    <span>XP</span>
                    <span>{heroExp} / {heroLevel * 100}</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${(heroExp / (heroLevel * 100)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>

                {/* Pet Care */}
                {getEquippedPet() && (
                  <div style={{ width: '100%', padding: '14px', background: '#f0fdf4', border: '3px solid #bbf7d0', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#166534', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getEquippedPet().icon} {getEquippedPet().name} (Bond Lvl {petBondLevel})
                    </div>
                    <div style={{ position: 'absolute', top: '-25px', pointerEvents: 'none' }}>
                      {petFloatEmojis.map(e => (
                        <span key={e.id} className="floating-emoji" style={{ left: `${e.x}px`, transform: `translateY(${e.y}px)` }}>{e.emoji}</span>
                      ))}
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#dcfce7', borderRadius: '99px', overflow: 'hidden', margin: '4px 0 10px 0' }}>
                      <div style={{ width: `${petLove}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s ease' }}></div>
                    </div>
                    <button className="bubble-btn success" onClick={() => feedPet(5)} style={{ width: '100%', ...btnStyle, fontSize: '1rem', justifyContent: 'center' }}>
                      🍪 Feed Pet (5 Stars)
                    </button>
                    {/* Pet color */}
                    <div style={{ width: '100%', borderTop: '2px dashed #bbf7d0', marginTop: '12px', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>🎨 Color:</div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '10px' }}>
                        {[['blue', '#60a5fa'], ['red', '#ef4444'], ['green', '#22c55e'], ['gold', '#fbbf24']].map(([name, hex]) => (
                          <button key={name} onClick={() => { playSound('click'); changePetColor(name); }}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', background: hex, border: petColor === name ? '4px solid #166534' : '3px solid white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} title={name} />
                        ))}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#166534', marginBottom: '6px' }}>⚙️ Accessory:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                        {['none', 'antenna', 'visor', 'jetpack', 'hat'].map(mod => (
                          <button key={mod} onClick={() => { playSound('click'); changePetAccessory(mod); }}
                            style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: '800', borderRadius: '10px', border: '2px solid', borderColor: petAccessory === mod ? '#166534' : '#cbd5e1', background: petAccessory === mod ? '#22c55e' : 'white', color: petAccessory === mod ? 'white' : '#475569', cursor: 'pointer', minHeight: '36px' }}>
                            {mod.charAt(0).toUpperCase() + mod.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {maxStageUnlocked >= 24 && (
                  <button className="bubble-btn success" onClick={() => { playSound('click'); set({ activeView: 'graduation' }); }}
                    style={{ marginTop: '20px', width: '100%', ...btnStyle, fontSize: '1.15rem', fontWeight: '900', background: 'linear-gradient(135deg, #eab308, #ca8a04)', borderColor: '#a16207', boxShadow: '0 5px 0 #854d0e', color: 'white', justifyContent: 'center' }}>
                    🎓 See My Diploma!
                  </button>
                )}
              </div>

              {/* Gear locker */}
              <div style={{ flex: 1.5, minWidth: '280px' }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.15rem' }}>⚙️ My Gear Locker</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 12px 0', fontWeight: '600' }}>Tap to equip or unequip gear on your hero!</p>
                <div className="locker-grid" style={{ maxHeight: '250px', overflowY: 'auto', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '2px solid #e2e8f0' }}>
                  {FEATURE_NAMES.map((name, idx) => {
                    const isUnlocked = unlockedFeatures.includes(idx);
                    const isEquipped = equippedFeatures.includes(idx);
                    const emojis = ['🚀', '🛡️', '🪽', '🟡', '🧤', '👁️', '🎒', '🌟', '👊', '❄️', '🔥', '🥽', '🤖', '💫', '☀️', '🔦', '🦾', '👢', '🎖️', '🫧', '🔫', '😇', '👑', '⭐'];
                    const icon = emojis[idx] || '✨';
                    return isUnlocked ? (
                      <div key={idx} className={`locker-item ${isEquipped ? 'equipped' : ''}`} onClick={() => toggleFeatureEquip(idx)}>
                        <span className="locker-item-icon">{icon}</span>
                        <span className="locker-item-name">{name}</span>
                        <button className="locker-item-btn" style={{ minHeight: '36px' }}>{isEquipped ? 'Remove' : 'Wear'}</button>
                      </div>
                    ) : (
                      <div key={idx} className="locker-item locked" style={{ opacity: 0.5, cursor: 'not-allowed', background: '#f1f5f9', borderStyle: 'dashed' }}>
                        <span className="locker-item-icon">🔒</span>
                        <span className="locker-item-name" style={{ color: '#94a3b8' }}>Stage {idx + 1}</span>
                        <span className="locker-item-btn" style={{ background: '#cbd5e1', color: '#94a3b8' }}>Locked</span>
                      </div>
                    );
                  })}
                </div>

                {purchasedItems.length > 0 && (
                  <>
                    <h3 style={{ margin: '15px 0 5px 0', fontSize: '1.15rem' }}>🏪 Shop Gear</h3>
                    <div className="locker-grid" style={{ maxHeight: '200px', overflowY: 'auto', background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', margin: '15px 0' }}>
                      {SHOP_ITEMS.filter(item => purchasedItems.includes(item.id)).map(item => {
                        const isEquipped = equippedFeatures.includes(item.id);
                        return (
                          <div key={item.id} className={`locker-item ${isEquipped ? 'equipped' : ''}`} onClick={() => toggleShopItemEquip(item.id)}>
                            <span className="locker-item-icon">{item.icon}</span>
                            <span className="locker-item-name">{item.name}</span>
                            <button className="locker-item-btn" style={{ minHeight: '36px' }}>{isEquipped ? 'Remove' : 'Wear'}</button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <h3 style={{ margin: '20px 0 10px 0', fontSize: '1.15rem' }}>🗺️ Jump to Stage:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const num = idx + 1;
                    const unlocked = num <= maxStageUnlocked;
                    return (
                      <button key={num} className={`bubble-btn ${currentStage === num ? 'active' : ''}`} disabled={!unlocked}
                        onClick={() => handleStageSelect(num)} style={{ ...btnStyle, padding: '8px', fontSize: '1rem', textAlign: 'center', justifyContent: 'center', opacity: unlocked ? 1 : 0.4 }}>
                        {num}
                      </button>
                    );
                  })}
                </div>
                <button className="bubble-btn danger" onClick={resetEntireGame}
                  style={{ marginTop: '25px', width: '100%', ...btnStyle, background: '#ef4444', borderColor: '#dc2626', color: '#fff', boxShadow: '0 4px 0 #b91c1c', justifyContent: 'center' }}>
                  ⚠️ Start Over (Reset)
                </button>
              </div>
            </div>

            {/* Achievements */}
            <div className="achievements-case">
              <h3 className="achievements-case-title">🏆 Achievements</h3>
              <div className="achievements-grid">
                {ACHIEVEMENT_LIST.map(ach => {
                  const unlocked = achievements.includes(ach.id);
                  return (
                    <div key={ach.id} className={`achievement-card ${unlocked ? 'unlocked' : ''}`}>
                      <div className="achievement-card-icon">{unlocked ? ach.icon : '🔒'}</div>
                      <div className="achievement-card-info" style={{ textAlign: 'left' }}>
                        <span className="achievement-card-name">{ach.name}</span>
                        <span className="achievement-card-desc">{ach.desc}</span>
                        <span className="achievement-card-payout">{unlocked ? '✅ Done!' : `🪙 +${ach.starBonus} Stars`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


        {/* ===== SANDBOX LAB ===== */}
        {activeView === 'sandbox' && (
          <div className="progress-panel" style={{ maxWidth: '600px', margin: '30px auto', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: '800', margin: '0 0 15px 0', borderBottom: '3px dashed #cbd5e1', paddingBottom: '10px' }}>
              🧪 Sandbox Lab
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: '600', marginBottom: '25px' }}>
              Make your own math puzzles! Pick a type and a number, then solve it! 🎨
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '3px solid #cbd5e1', marginBottom: '25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '800', color: '#475569', fontSize: '1.05rem' }}>1. Pick a puzzle type:</label>
                <select value={sandboxType} onChange={(e) => { playSound('click'); set({ sandboxType: e.target.value }); }}
                  style={{ padding: '12px 14px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', minHeight: '48px' }}>
                  <option value="bridge">➕ Bridge (Adding)</option>
                  <option value="hill">🧗 Hill Climber (Stair Adding)</option>
                  <option value="sub_bridge">➖ Log River (Take Away)</option>
                  <option value="area">✖️ Area Builder (Multiply)</option>
                  <option value="balance">⚖️ Scale Balancer (Equations)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '800', color: '#475569', fontSize: '1.05rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>2. Pick your number:</span>
                  <strong style={{ color: '#6366f1', fontSize: '1.3rem' }}>{sandboxTarget}</strong>
                </label>
                <input type="range" min="2" max="30" value={sandboxTarget} onChange={(e) => set({ sandboxTarget: parseInt(e.target.value) })}
                  style={{ width: '100%', height: '12px', borderRadius: '9999px', background: '#e2e8f0', cursor: 'pointer', accentColor: '#6366f1' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '800' }}>
                  <span>Easy: 2</span><span>Hard: 30</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="bubble-btn success" onClick={() => { playSound('click'); set({ activeView: 'sandbox-game' }); }}
                style={{ fontSize: '1.3rem', padding: '16px 28px', background: '#22c55e', borderColor: '#16a34a', boxShadow: '0 5px 0 #15803d', color: 'white', width: '100%', justifyContent: 'center', minHeight: '56px' }}>
                🚀 Start Sandbox!
              </button>
              <button className="bubble-btn" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }} style={{ width: '100%', justifyContent: 'center', ...btnStyle }}>
                ✕ Back Home
              </button>
            </div>
          </div>
        )}

        {/* ===== SANDBOX GAME ===== */}
        {activeView === 'sandbox-game' && (
          <div style={{ width: '100%', height: 'calc(100vh - 120px)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#f8fafc', borderBottom: '4px solid #e2e8f0', zIndex: 10 }}>
              <button className="bubble-btn danger" onClick={() => { playSound('click'); set({ activeView: 'sandbox' }); }} style={btnStyle}>
                ✕ Exit Sandbox
              </button>
              <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#6366f1', fontFamily: "'Fredoka', sans-serif" }}>🧪 Sandbox Mode 🧪</span>
              <div style={{ width: '120px' }}></div>
            </div>
            <div style={{ flexGrow: 1, position: 'relative' }}>
              <MathQuest3D
                key={`sandbox-${sandboxType}-${sandboxTarget}`}
                stageNum={1}
                features={equippedFeatures}
                petColor={petColor}
                petAccessory={petAccessory}
                sandboxMode={true}
                sandboxType={sandboxType}
                sandboxTarget={sandboxTarget}
                onLevelComplete={(earnedCoins, nextView) => handleLevelComplete(earnedCoins, nextView || 'sandbox')}
                soundEnabled={soundOn}
              />
            </div>
          </div>
        )}

        {/* ===== GRADUATION ===== */}
        {activeView === 'graduation' && (
          <div className="diploma-backdrop">
            <div className="no-print" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
              {Array.from({ length: 30 }).map((_, idx) => {
                const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
                const col = colors[idx % colors.length];
                const left = Math.random() * 100;
                const size = 6 + Math.random() * 12;
                const delay = Math.random() * 6;
                const duration = 4 + Math.random() * 5;
                return (
                  <div key={idx} style={{
                    position: 'absolute', top: '-20px', left: `${left}%`, width: `${size}px`, height: `${size}px`,
                    background: col, borderRadius: idx % 2 === 0 ? '50%' : '0%', opacity: 0.75,
                    transform: `rotate(${Math.random() * 360}deg)`, animation: `fallConfetti ${duration}s linear infinite`, animationDelay: `${delay}s`
                  }} />
                );
              })}
              <style>{`@keyframes fallConfetti { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(110vh) rotate(720deg); } }`}</style>
            </div>
            <div className="diploma-certificate" style={{ zIndex: 10 }}>
              <div className="diploma-header">🎓 Graduation Diploma 🎓</div>
              <div className="diploma-ribbon">📜</div>
              <div className="diploma-subtitle">Grade 1 & 2 Math Champion!</div>
              <div className="diploma-presents">This says that the amazing</div>
              <div className="diploma-name">Math Superhero</div>
              <div className="diploma-body">
                finished ALL 24 stages of <strong>3D Math Quest</strong>!
                You built bridges, climbed stairs, cut logs, balanced scales, told time, sliced fractions, and found patterns.
                You are a real math champion! Great job! 🎉🌟
              </div>
              <div className="diploma-signatures">
                <div className="diploma-sig-line">
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.2rem', color: '#1e3a8a', marginBottom: '2px' }}>Toy Land Teacher</div>
                  <span>Head Teacher</span>
                </div>
                <div className="diploma-sig-line">
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.2rem', color: '#1e3a8a', marginBottom: '2px' }}>Math Helper</div>
                  <span>Assistant</span>
                </div>
              </div>
            </div>
            <div className="diploma-actions no-print" style={{ zIndex: 10, display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button className="bubble-btn success" onClick={() => window.print()}
                style={{ fontSize: '1.2rem', padding: '14px 28px', background: '#fbbf24', borderColor: '#d97706', boxShadow: '0 5px 0 #b45309', color: '#78350f', minHeight: '56px' }}>
                🖨️ Print My Diploma!
              </button>
              <button className="bubble-btn" onClick={() => { playSound('click'); set({ activeView: 'dashboard' }); }}
                style={{ fontSize: '1.2rem', padding: '14px 28px', minHeight: '56px' }}>
                🏠 Go Home
              </button>
            </div>
          </div>
        )}


        {/* ===== 3D HERO SHOP ===== */}
        {activeView === 'shop3d' && (
          <div className="progress-panel" style={{ maxWidth: '900px', margin: '30px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px dashed #cbd5e1', paddingBottom: '10px', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: '800', margin: 0 }}>🏪 Hero Shop</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#fef08a', border: '2px solid #eab308', padding: '6px 14px', borderRadius: '99px', fontWeight: '900', color: '#854d0e', fontSize: '1rem' }}>🪙 {stars} Stars</div>
                {frenzyActive && (
                  <div style={{ background: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '900', animation: 'pulse 1s infinite' }}>🔥 {frenzyTimeLeft}s (2x!)</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
              {/* 3D Preview */}
              <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'sticky', top: '20px' }}>
                <div style={{ width: '100%', height: '320px', background: '#f8fafc', border: '4px solid #a855f7', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 8px 20px rgba(168,85,247,0.15)' }}>
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#a855f7', color: 'white', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800', zIndex: 10 }}>🔮 Preview</div>
                  <HeroCanvas features={getPreviewFeatures()} petColor={petColor} petAccessory={petAccessory} />
                </div>
                <div style={{ width: '100%', marginTop: '15px', padding: '12px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px' }}>
                  <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#1e293b', textAlign: 'center' }}>{getHeroTitle(heroLevel)} (Lvl {heroLevel})</div>
                  <div style={{ width: '100%', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '800', color: '#64748b', marginBottom: '2px' }}>
                      <span>XP</span><span>{heroExp} / {heroLevel * 100}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${(heroExp / (heroLevel * 100)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #c084fc)', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                </div>
                {/* Pet in shop */}
                {getEquippedPet() && (
                  <div style={{ width: '100%', marginTop: '15px', padding: '14px', background: '#f0fdf4', border: '3px solid #bbf7d0', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#166534', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getEquippedPet().icon} {getEquippedPet().name} (Bond Lvl {petBondLevel})
                    </div>
                    <div style={{ position: 'absolute', top: '-25px', pointerEvents: 'none' }}>
                      {petFloatEmojis.map(e => (
                        <span key={e.id} className="floating-emoji" style={{ left: `${e.x}px`, transform: `translateY(${e.y}px)` }}>{e.emoji}</span>
                      ))}
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#dcfce7', borderRadius: '99px', overflow: 'hidden', margin: '4px 0 10px 0' }}>
                      <div style={{ width: `${petLove}%`, height: '100%', background: '#22c55e', transition: 'width 0.3s ease' }}></div>
                    </div>
                    <button className="bubble-btn success" onClick={() => feedPet(5)} style={{ width: '100%', ...btnStyle, fontSize: '1rem', justifyContent: 'center' }}>
                      🍪 Feed Pet (5 Stars)
                    </button>
                  </div>
                )}
              </div>

              {/* Shop items */}
              <div style={{ flex: 1.5, minWidth: '280px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[['pets', '🛸 Pets'], ['clothes', '🛡️ Clothes'], ['powers', '⚡ Powers']].map(([cat, label]) => (
                    <button key={cat} className={`bubble-btn ${activeShopCategory === cat ? 'active' : ''}`}
                      onClick={() => { playSound('click'); set({ activeShopCategory: cat }); }}
                      style={{ flex: 1, justifyContent: 'center', ...btnStyle, fontSize: '1rem', padding: '10px 14px' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '16px' }}>
                  {SHOP_ITEMS.filter(item => item.category === activeShopCategory).map(item => {
                    const isPurchased = purchasedItems.includes(item.id);
                    const isEquipped = equippedFeatures.includes(item.id);
                    const isPreviewing = shopPreviewItem === item.id;
                    return (
                      <div key={item.id} onClick={() => { playSound('click'); set({ shopPreviewItem: item.id }); }}
                        style={{
                          background: 'white', border: isEquipped ? '3px solid #38bdf8' : isPreviewing ? '3px dashed #a855f7' : '3px solid #e2e8f0',
                          borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                          textAlign: 'center', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s ease'
                        }}>
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: isEquipped ? '#0284c7' : isPurchased ? '#64748b' : '#eab308', color: 'white', padding: '3px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '900' }}>
                          {isEquipped ? '✅ On' : isPurchased ? 'Owned' : `🪙 ${item.cost}`}
                        </div>
                        <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{item.icon}</span>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{item.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px 0', flexGrow: 1, lineHeight: '1.3' }}>{item.desc}</p>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                          {!isPurchased ? (
                            <button className="bubble-btn success" onClick={() => buyShopItem(item)} disabled={stars < item.cost}
                              style={{ ...btnStyle, fontSize: '0.9rem', padding: '8px', justifyContent: 'center', opacity: stars < item.cost ? 0.5 : 1 }}>
                              🛒 Buy!
                            </button>
                          ) : (
                            <button className={`bubble-btn ${isEquipped ? '' : 'primary'}`} onClick={() => toggleShopItemEquip(item.id)}
                              style={{ ...btnStyle, fontSize: '0.9rem', padding: '8px', justifyContent: 'center' }}>
                              {isEquipped ? 'Take Off' : 'Wear It!'}
                            </button>
                          )}
                          <button className="bubble-btn" onClick={() => { playSound('click'); set({ shopPreviewItem: isPreviewing ? null : item.id }); }}
                            style={{ fontSize: '0.8rem', padding: '6px', justifyContent: 'center', background: isPreviewing ? '#f3e8ff' : '#f1f5f9', color: isPreviewing ? '#a855f7' : '#475569', borderColor: isPreviewing ? '#c084fc' : '#cbd5e1', minHeight: '36px' }}>
                            {isPreviewing ? '✕ Stop Preview' : '👁️ Preview'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        </Suspense>
      </main>

      {/* ===== DAILY REWARD MODAL ===== */}
      {showDailyModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', zIndex: 99999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.3s ease-out'
        }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes popUp { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
          <div style={{
            background: 'white', border: '5px solid #a855f7', borderRadius: '32px', padding: '30px',
            maxWidth: '560px', width: '90%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'popUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275)'
          }}>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", color: '#6b21a8', fontWeight: '900', fontSize: '1.8rem', margin: '0 0 10px 0' }}>
              🎁 Daily Star Chest!
            </h2>
            <p style={{ color: '#64748b', fontWeight: '700', fontSize: '1rem', margin: '0 0 20px 0' }}>
              Come back every day to get more stars! Keep your streak going! 🔥
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' }}>
              {[10, 15, 25, 35, 50].map((val, idx) => {
                const dayNum = idx + 1;
                const isCurrent = dayNum === consecutiveLogins;
                const isPast = dayNum < consecutiveLogins;
                return (
                  <div key={dayNum} style={{
                    background: isCurrent ? '#f3e8ff' : isPast ? '#f1f5f9' : '#ffffff',
                    border: isCurrent ? '3px solid #a855f7' : '2px solid #cbd5e1',
                    borderRadius: '16px', padding: '12px 6px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', position: 'relative', opacity: isPast ? 0.75 : 1
                  }}>
                    {isPast && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#22c55e', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</span>}
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: isCurrent ? '#7c3aed' : '#94a3b8' }}>Day {dayNum}</span>
                    <span style={{ fontSize: '2rem', margin: '4px 0' }}>🎁</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#854d0e' }}>🪙 {val}</span>
                    {dayNum === 5 && <div style={{ position: 'absolute', bottom: '-8px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#78350f', padding: '2px 6px', borderRadius: '99px', fontSize: '0.6rem', fontWeight: '900', border: '1px solid #d97706' }}>BONUS!</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="bubble-btn success" onClick={claimDailyReward}
                style={{ width: '100%', padding: '14px', fontSize: '1.2rem', justifyContent: 'center', minHeight: '56px' }}>
                🎉 Open Today's Chest!
              </button>
              <button className="bubble-btn" onClick={() => { playSound('click'); set({ showDailyModal: false }); }}
                style={{ width: '100%', padding: '10px', fontSize: '1rem', justifyContent: 'center', background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1', minHeight: '48px' }}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROFILE MANAGER ===== */}
      {profileUI.modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', border: '5px solid #8b5cf6', borderRadius: '28px', padding: '26px', width: '90%', maxWidth: '520px', fontFamily: "'Fredoka', sans-serif", maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 14px 0', color: '#6b21a8', fontWeight: 900, textAlign: 'center' }}>👤 Player Profiles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {listProfiles().map((p) => {
                const isActive = activeProfile && p.id === activeProfile.id;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => { playSound('click'); setActiveProfile(p.id); dispatch({ type: 'RELOAD' }); refreshProfiles(); }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, border: `3px solid ${isActive ? '#8b5cf6' : '#e2e8f0'}`, background: isActive ? '#f3e8ff' : 'white', color: '#1e293b', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', minHeight: 48 }}>
                      <span style={{ fontSize: '1.6rem' }}>{p.avatar}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{p.name}</span>
                      {isActive && <span style={{ color: '#16a34a', fontWeight: 900 }}>✓ Playing</span>}
                    </button>
                    {listProfiles().length > 1 && (
                      <button onClick={() => { if (window.confirm(`Delete ${p.name}'s profile?`)) { deleteProfile(p.id); dispatch({ type: 'RELOAD' }); refreshProfiles(); } }}
                        style={{ width: 44, height: 44, borderRadius: 12, border: '2px solid #fecaca', background: '#fee2e2', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* create new */}
            <div style={{ borderTop: '2px dashed #e9d5ff', paddingTop: 14 }}>
              <div style={{ fontWeight: 800, color: '#6b21a8', marginBottom: 8 }}>➕ New Player</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {['🦸', '🦊', '🐼', '🐯', '🤖', '🦄', '🐸', '🐲'].map((av) => (
                  <button key={av} onClick={() => setProfileUI((s) => ({ ...s, newAvatar: av }))}
                    style={{ fontSize: '1.5rem', width: 44, height: 44, borderRadius: 12, cursor: 'pointer', border: `3px solid ${profileUI.newAvatar === av ? '#8b5cf6' : '#e2e8f0'}`, background: profileUI.newAvatar === av ? '#f3e8ff' : 'white' }}>{av}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={profileUI.newName || ''} maxLength={16} placeholder="Type a name…"
                  onChange={(e) => setProfileUI((s) => ({ ...s, newName: e.target.value }))}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '2px solid #cbd5e1', fontSize: '1rem', fontFamily: 'inherit', minHeight: 48 }} />
                <button onClick={() => { playSound('chime'); createProfile(profileUI.newName, profileUI.newAvatar || '🦸'); dispatch({ type: 'RELOAD' }); setProfileUI((s) => ({ ...s, newName: '', ver: s.ver + 1 })); }}
                  className="bubble-btn success" style={{ ...btnStyle, padding: '10px 18px' }}>Add</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => { playSound('click'); setProfileUI((s) => ({ ...s, report: true })); }}
                className="bubble-btn primary" style={{ ...btnStyle, flex: 1, justifyContent: 'center' }}>📊 Learning Report</button>
              <button onClick={() => setProfileUI((s) => ({ ...s, modal: false }))}
                className="bubble-btn" style={{ ...btnStyle, flex: 1, justifyContent: 'center' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LEARNING REPORT (parent view) ===== */}
      {profileUI.report && (() => {
        const st = getStats();
        const statusColor = { locked: '#94a3b8', new: '#64748b', learning: '#3b82f6', 'needs-help': '#ef4444', mastered: '#22c55e' };
        const statusLabel = { locked: 'Locked', new: 'New', learning: 'Learning', 'needs-help': 'Needs practice', mastered: 'Mastered ⭐' };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', border: '5px solid #0ea5e9', borderRadius: '28px', padding: '26px', width: '92%', maxWidth: '560px', fontFamily: "'Fredoka', sans-serif", maxHeight: '92vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 6px 0', color: '#0369a1', fontWeight: 900, textAlign: 'center' }}>📊 Learning Report</h2>
              {st ? (
                <>
                  <div style={{ textAlign: 'center', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>{st.avatar} {st.name}</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <span style={{ background: '#e0f2fe', border: '2px solid #38bdf8', borderRadius: 99, padding: '6px 14px', fontWeight: 800, color: '#075985' }}>🧩 {st.totalPuzzles} puzzles</span>
                    <span style={{ background: '#dcfce7', border: '2px solid #4ade80', borderRadius: 99, padding: '6px 14px', fontWeight: 800, color: '#166534' }}>✅ {Math.round(st.accuracy * 100)}% correct</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {st.skills.map((sk) => (
                      <div key={sk.id} style={{ opacity: sk.status === 'locked' ? 0.5 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>{sk.label}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', background: statusColor[sk.status], padding: '2px 8px', borderRadius: 99 }}>{statusLabel[sk.status]}</span>
                        </div>
                        <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round(sk.mastery * 100)}%`, height: '100%', background: statusColor[sk.status] }} />
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>
                          {sk.attempts ? `${sk.correct}/${sk.attempts} correct (${Math.round(sk.accuracy * 100)}%)` : 'Not tried yet'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, fontSize: '0.9rem', color: '#475569', fontWeight: 700 }}>
                    <p style={{ margin: '4px 0' }}>😌 Easy / used to relax: {st.easiest.length ? st.easiest.join(', ') : '—'}</p>
                    <p style={{ margin: '4px 0' }}>🔁 Repeating to teach: {st.hardest.length ? st.hardest.join(', ') : '—'}</p>
                  </div>
                </>
              ) : <p style={{ textAlign: 'center', color: '#64748b' }}>No data yet — play the Run game's puzzles!</p>}
              <button onClick={() => setProfileUI((s) => ({ ...s, report: false }))}
                className="bubble-btn" style={{ ...btnStyle, width: '100%', justifyContent: 'center', marginTop: 18 }}>Close</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
