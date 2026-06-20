// src/utils/sound.js - Synthesizing cartoon sound effects using Web Audio API

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.warn("Audio autoplay blocked by browser policy:", err));
    }
    return audioCtx;
}

export function isSoundEnabled() {
    return soundEnabled;
}

export function setSoundEnabled(enabled) {
    soundEnabled = enabled;
    return soundEnabled;
}

export function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(550, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'pop') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(1100, now + 0.07);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.07);

            osc.start(now);
            osc.stop(now + 0.075);
        } else if (type === 'sad') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.55);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.005, now + 0.55);

            osc.start(now);
            osc.stop(now + 0.55);
        } else if (type === 'whoosh') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(450, now + 0.4);

            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'coin') {
            const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6
            freqs.forEach((freq, idx) => {
                const noteTime = now + idx * 0.08;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);
                gain.gain.setValueAtTime(0.08, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.005, noteTime + 0.25);

                osc.start(noteTime);
                osc.stop(noteTime + 0.3);
            });
        } else if (type === 'chime') {
            const freqs = [880.00, 987.77, 1174.66, 1318.51, 1567.98]; // A5 -> B5 -> D6 -> E6 -> G6
            freqs.forEach((freq, idx) => {
                const noteTime = now + idx * 0.06;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, noteTime);
                gain.gain.setValueAtTime(0.05, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);

                osc.start(noteTime);
                osc.stop(noteTime + 0.35);
            });
        } else if (type === 'success') {
            // Happy cartoon bounce arpeggio
            const freqs = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // E4 -> G4 -> C5 -> E5 -> G5 -> C6
            freqs.forEach((freq, idx) => {
                const noteTime = now + idx * 0.07;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);
                gain.gain.setValueAtTime(0.1, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.2);

                osc.start(noteTime);
                osc.stop(noteTime + 0.22);
            });
        } else if (type === 'crunch') {
            // Synthesize crunch
            makeCrunch(ctx, now);
            makeCrunch(ctx, now + 0.15);
            makeCrunch(ctx, now + 0.3);
            setTimeout(() => {
                playChirp(ctx, ctx.currentTime);
                playChirp(ctx, ctx.currentTime + 0.12);
            }, 450);
        } else if (type === 'flap') {
            for (let i = 0; i < 3; i++) {
                const fTime = now + i * 0.12;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(180, fTime);
                osc.frequency.exponentialRampToValueAtTime(40, fTime + 0.1);
                gain.gain.setValueAtTime(0.12, fTime);
                gain.gain.linearRampToValueAtTime(0.01, fTime + 0.1);
                osc.start(fTime);
                osc.stop(fTime + 0.1);
            }
            setTimeout(() => {
                const cTime = ctx.currentTime;
                playBirdChirp(ctx, cTime, 880);
                playBirdChirp(ctx, cTime + 0.08, 1200);
            }, 300);
        } else if (type === 'creak') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(240, now + 0.35);

            lfo.frequency.setValueAtTime(12, now);
            lfoGain.gain.setValueAtTime(15, now);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.3);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);

            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 0.35);
            osc.stop(now + 0.35);
        } else if (type === 'crash') {
            // Noisy thud + descending tone
            const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(0.25, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            noise.connect(nGain); nGain.connect(ctx.destination);
            noise.start(now); noise.stop(now + 0.2);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === 'powerup') {
            // Rising sparkly arpeggio
            const freqs = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51];
            freqs.forEach((freq, idx) => {
                const nt = now + idx * 0.05;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, nt);
                gain.gain.setValueAtTime(0.09, nt);
                gain.gain.exponentialRampToValueAtTime(0.005, nt + 0.18);
                osc.start(nt); osc.stop(nt + 0.2);
            });
        }
    } catch (e) {
        console.error("Audio synthesis failed: ", e);
    }
}

// Helpers
function makeCrunch(ctx, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.08);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.08);
}

function playChirp(ctx, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, time);
    osc.frequency.exponentialRampToValueAtTime(1600, time + 0.05);
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
}

function playBirdChirp(ctx, time, freq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq + 400, time + 0.08);
    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.085);
}

export function playStreakComboSound(streakCount) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        // Major scale base frequencies: C4 (261.6), D4 (293.7), E4 (329.6), F4 (349.2), G4 (392.0), A4 (440.0), B4 (493.9), C5 (523.3)
        const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
        const baseIdx = Math.min(scale.length - 1, Math.max(0, streakCount - 1));
        const baseFreq = scale[baseIdx];
        
        // Play ascending arpeggio notes
        const offsets = [1, 1.25, 1.5, 2]; // root, third, fifth, octave
        offsets.forEach((ratio, idx) => {
            const noteTime = now + idx * 0.05;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * ratio, noteTime);
            
            // Adjust volume - slightly louder for bigger streaks
            const vol = 0.06 + Math.min(0.06, streakCount * 0.005);
            gain.gain.setValueAtTime(vol, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);
            
            osc.start(noteTime);
            osc.stop(noteTime + 0.25);
        });
    } catch (e) {
        console.warn("Sound combo synthesis failed:", e);
    }
}



/* ===================== UPGRADED AUDIO (original synth) ===================== */

// Small tone helper
function blip(ctx, time, freq, type, dur, vol, slideTo) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, time + dur);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);
    osc.start(time); osc.stop(time + dur + 0.02);
}

function noiseBurst(ctx, time, dur, vol, filterFreq) {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.0005, time + dur);
    if (filterFreq) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq; src.connect(f); f.connect(g); }
    else src.connect(g);
    g.connect(ctx.destination);
    src.start(time); src.stop(time + dur);
}

// --- Crash sounds specific to the thing you hit ---
export function playCrash(cause) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext(); const now = ctx.currentTime;
        switch (cause) {
            case 'car':
                blip(ctx, now, 330, 'square', 0.5, 0.14, 280);       // horn beep
                blip(ctx, now + 0.04, 247, 'square', 0.5, 0.12, 220);
                noiseBurst(ctx, now, 0.35, 0.22, 1500);               // metal crunch
                break;
            case 'bike':
            case 'bicycle':
                blip(ctx, now, 1760, 'sine', 0.18, 0.12);             // bell ring
                blip(ctx, now + 0.12, 2093, 'sine', 0.16, 0.1);
                noiseBurst(ctx, now + 0.05, 0.2, 0.14, 2500);          // rattle
                break;
            case 'animal':
                blip(ctx, now, 700, 'sawtooth', 0.18, 0.13, 1300);     // yelp up
                blip(ctx, now + 0.16, 1100, 'sawtooth', 0.22, 0.12, 400); // down
                break;
            case 'pedestrian':
                blip(ctx, now, 200, 'sine', 0.22, 0.14, 120);          // soft "oof"
                noiseBurst(ctx, now, 0.12, 0.08, 800);
                break;
            case 'barrier':
            default:
                blip(ctx, now, 160, 'square', 0.3, 0.14, 70);          // wood clatter
                noiseBurst(ctx, now, 0.25, 0.2, 1000);
                noiseBurst(ctx, now + 0.08, 0.18, 0.14, 700);
                break;
        }
    } catch (e) { /* ignore */ }
}

// --- Distinct power-up activation sounds ---
export function playPowerup(power) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext(); const now = ctx.currentTime;
        if (power === 'magnet') {
            // wobble
            for (let i = 0; i < 4; i++) blip(ctx, now + i * 0.07, 440 + (i % 2 ? 180 : 0), 'sine', 0.1, 0.08);
        } else if (power === 'jetpack') {
            blip(ctx, now, 200, 'sawtooth', 0.5, 0.12, 1400);          // whoosh up
            noiseBurst(ctx, now, 0.5, 0.1, 3000);
        } else if (power === 'boost') {
            [523, 659, 784, 1047, 1319].forEach((f, i) => blip(ctx, now + i * 0.045, f, 'square', 0.12, 0.09)); // fast zap up
        } else if (power === 'double') {
            blip(ctx, now, 880, 'sine', 0.18, 0.09);
            blip(ctx, now + 0.08, 1320, 'sine', 0.22, 0.09);
            blip(ctx, now + 0.16, 1760, 'sine', 0.25, 0.08);
        } else if (power === 'shield') {
            [392, 494, 587, 784].forEach((f, i) => blip(ctx, now + i * 0.02, f, 'triangle', 0.5, 0.06)); // dome chord
        } else {
            blip(ctx, now, 660, 'sine', 0.2, 0.09);
        }
    } catch (e) { /* ignore */ }
}

// --- Coin with rising pitch (combo feel, resets after an octave) ---
let coinStep = 0;
export function playCoinPitch(reset) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext(); const now = ctx.currentTime;
        if (reset) coinStep = 0;
        const scale = [659.25, 698.46, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51];
        const f = scale[coinStep % scale.length];
        coinStep = (coinStep + 1) % (scale.length * 2);
        blip(ctx, now, f, 'sine', 0.12, 0.09);
        blip(ctx, now + 0.04, f * 1.5, 'sine', 0.1, 0.05);
    } catch (e) { /* ignore */ }
}
export function resetCoinPitch() { coinStep = 0; }

// --- Urgency tick for timed puzzles ---
export function playTick(urgent) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext(); const now = ctx.currentTime;
        blip(ctx, now, urgent ? 1200 : 800, 'square', 0.06, urgent ? 0.1 : 0.06);
        if (urgent) blip(ctx, now + 0.07, 1500, 'square', 0.05, 0.08);
    } catch (e) { /* ignore */ }
}

// --- Spoken reactions with VOICE VARIETY (browser speech) ---
const GREETINGS_NEUTRAL = ['Hi there!', 'Hello!', 'Good morning!', 'Nice day!', 'Hey, friend!'];
const GREETINGS_FAST = ['Whoa, slow down!', 'Hey, watch it!', 'Too fast!', 'Careful there!', 'Coming through!', 'Oh my!'];
const GREETINGS_CHEER = ['Wow, go go go!', 'Awesome running!', 'You are speedy!', 'Nice moves!'];

// Voice pool (loaded async by the browser)
let _voices = [];
let _femaleVoice = undefined; // cached pick
function loadVoices() {
    try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const all = window.speechSynthesis.getVoices() || [];
        const en = all.filter(v => /^en(-|_|$)/i.test(v.lang));
        _voices = en.length ? en : all;
        _femaleVoice = undefined; // re-pick when the list changes
    } catch (e) { /* ignore */ }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    loadVoices();
    try { window.speechSynthesis.onvoiceschanged = loadVoices; } catch (e) { /* ignore */ }
}

// Choose the most natural-sounding female English voice available.
const FEMALE_HINTS = ['female', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'serena', 'allison', 'ava', 'susan', 'zira', 'hazel', 'aria', 'jenny', 'sonia', 'natasha', 'libby', 'michelle', 'amelie', 'kathy', 'google uk english female', 'google us english'];
function pickFemaleVoice() {
    if (_femaleVoice !== undefined) return _femaleVoice;
    if (!_voices.length) loadVoices();
    let best = null, bestScore = -1;
    _voices.forEach((v) => {
        const n = (v.name || '').toLowerCase();
        let score = 0;
        if (FEMALE_HINTS.some((f) => n.includes(f))) score += 10;
        if (n.includes('natural')) score += 6;       // prefer "Natural"/neural voices = organic
        if (n.includes('google')) score += 4;
        if (n.includes('online') || n.includes('premium') || n.includes('enhanced')) score += 3;
        if (/^en-us/i.test(v.lang)) score += 2; else if (/^en/i.test(v.lang)) score += 1;
        if (score > bestScore) { bestScore = score; best = v; }
    });
    _femaleVoice = best || null;
    return _femaleVoice;
}

let lastSpeakAt = 0;
// opts: { rate, pitch, volume, voiceIndex, female, clear, minGap, onEnd }
export function speak(text, opts = {}) {
    if (!soundEnabled) return;
    try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        if (!_voices.length) loadVoices();
        const nowMs = Date.now();
        const minGap = opts.minGap != null ? opts.minGap : 1200;
        if (nowMs - lastSpeakAt < minGap) return; // throttle so it isn't spammy
        lastSpeakAt = nowMs;
        const u = new SpeechSynthesisUtterance(text);
        // Natural defaults: gentle rate, near-normal pitch (organic, not robotic)
        u.rate = opts.rate != null ? opts.rate : (opts.female ? 0.92 : (0.92 + Math.random() * 0.28));
        u.pitch = opts.pitch != null ? opts.pitch : (opts.female ? 1.05 : (0.8 + Math.random() * 0.8));
        u.volume = opts.volume != null ? opts.volume : 0.95;
        let voice = null;
        if (opts.female) voice = pickFemaleVoice();
        if (!voice && _voices.length) {
            const idx = opts.voiceIndex != null ? (opts.voiceIndex % _voices.length) : Math.floor(Math.random() * _voices.length);
            voice = _voices[idx];
        }
        if (voice) u.voice = voice;
        if (opts.onEnd) { u.onend = opts.onEnd; u.onerror = opts.onEnd; }
        if (opts.clear) window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
}

export function speakPedestrian(kind) {
    let pool;
    if (kind === 'fast') pool = GREETINGS_FAST;
    else if (kind === 'cheer') pool = GREETINGS_CHEER;
    else pool = GREETINGS_NEUTRAL;
    // each pedestrian gets a different random voice + pitch (variety)
    speak(pool[Math.floor(Math.random() * pool.length)], { voiceIndex: Math.floor(Math.random() * 99), pitch: 0.8 + Math.random() * 0.8 });
}

// --- Number-to-words (0..100 covers 2nd grade) + spoken equation for teaching ---
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function numToWords(n) {
    n = Math.round(Math.abs(n));
    if (n < 20) return ONES[n];
    if (n < 100) { const t = Math.floor(n / 10), o = n % 10; return TENS[t] + (o ? '-' + ONES[o] : ''); }
    if (n === 100) return 'one hundred';
    return String(n);
}
// Speaks "twelve minus ten equals two" clearly (teaching voice: slower, steady).
export function speakEquation(a, op, b, ans) {
    const word = op === '+' ? 'plus' : op === '-' ? 'minus' : op === '×' || op === '*' ? 'times' : op;
    const phrase = `${numToWords(a)} ${word} ${numToWords(b)} equals ${numToWords(ans)}`;
    speak(phrase, { rate: 0.82, pitch: 1.05, volume: 1.0, voiceIndex: 0, clear: true, minGap: 0 });
}

// --- Looping background music (original cheerful chiptune) ---
let musicTimer = null;
let musicStep = 0;
const MUSIC_MELODY = [523.25, 0, 659.25, 523.25, 587.33, 0, 392.0, 0, 440.0, 0, 523.25, 493.88, 392.0, 0, 0, 0];
const MUSIC_BASS = [130.81, 0, 130.81, 0, 174.61, 0, 174.61, 0, 196.0, 0, 196.0, 0, 146.83, 0, 196.0, 0];
export function startBackgroundMusic() {
    if (!soundEnabled || musicTimer) return;
    try {
        getAudioContext();
        musicStep = 0;
        const stepDur = 0.19;
        const playStep = () => {
            if (!soundEnabled) return;
            const ctx = getAudioContext(); const now = ctx.currentTime + 0.01;
            const m = MUSIC_MELODY[musicStep % MUSIC_MELODY.length];
            const b = MUSIC_BASS[musicStep % MUSIC_BASS.length];
            if (m) blip(ctx, now, m, 'triangle', stepDur * 0.95, 0.04);
            if (b) blip(ctx, now, b, 'sawtooth', stepDur * 1.8, 0.03);
            musicStep++;
        };
        playStep();
        musicTimer = setInterval(playStep, stepDur * 1000);
    } catch (e) { /* ignore */ }
}
export function stopBackgroundMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}


// --- Soft, calm looping music for the math stages (gentle pentatonic pad) ---
let calmTimer = null;
let calmStep = 0;
const CALM_MELODY = [523.25, 0, 659.25, 0, 587.33, 0, 783.99, 0, 659.25, 0, 587.33, 0, 440.0, 0, 0, 0];
const CALM_BASS = [130.81, 0, 0, 0, 174.61, 0, 0, 0, 196.0, 0, 0, 0, 146.83, 0, 0, 0];
export function startCalmMusic() {
    if (!soundEnabled || calmTimer) return;
    try {
        getAudioContext();
        calmStep = 0;
        const stepDur = 0.5; // slow + soothing
        const playStep = () => {
            if (!soundEnabled) return;
            const ctx = getAudioContext(); const now = ctx.currentTime + 0.01;
            const m = CALM_MELODY[calmStep % CALM_MELODY.length];
            const b = CALM_BASS[calmStep % CALM_BASS.length];
            if (m) blip(ctx, now, m, 'sine', stepDur * 1.6, 0.025);   // soft bell
            if (b) blip(ctx, now, b, 'sine', stepDur * 3.2, 0.022);   // gentle pad
            calmStep++;
        };
        playStep();
        calmTimer = setInterval(playStep, stepDur * 1000);
    } catch (e) { /* ignore */ }
}
export function stopCalmMusic() {
    if (calmTimer) { clearInterval(calmTimer); calmTimer = null; }
}
