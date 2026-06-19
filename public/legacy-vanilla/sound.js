// sound.js - Synthesizing cartoon sound effects using Web Audio API

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function toggleSound(enabled) {
    soundEnabled = enabled;
    const btn = document.getElementById('sound-toggle');
    if (btn) {
        btn.innerHTML = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
        btn.classList.toggle('muted', !soundEnabled);
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        if (type === 'click') {
            // High-pitched playful blip
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
            // Snappy suction pop
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
        } else if (type === 'crunch') {
            // Cookie Monster Eating: Crunch-crunch-crunch + "Yum Yum" chirp
            // Crunch 1
            makeCrunch(ctx, now);
            // Crunch 2
            makeCrunch(ctx, now + 0.15);
            // Crunch 3
            makeCrunch(ctx, now + 0.3);
            
            // "Yum Yum" cute chimes
            setTimeout(() => {
                playChirp(ctx, ctx.currentTime);
                playChirp(ctx, ctx.currentTime + 0.12);
            }, 450);
        } else if (type === 'flap') {
            // Bird Flap + Chirps
            // Wing Flaps (low rumbling sweeps)
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
            // Cute chirping chimes
            setTimeout(() => {
                const cTime = ctx.currentTime;
                playBirdChirp(ctx, cTime, 880);
                playBirdChirp(ctx, cTime + 0.08, 1200);
            }, 300);
        } else if (type === 'creak') {
            // See-saw creaking hinge
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

            lfo.frequency.setValueAtTime(12, now); // vibrato rate
            lfoGain.gain.setValueAtTime(15, now);  // vibrato depth

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.3);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);

            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 0.35);
            osc.stop(now + 0.35);
        } else if (type === 'sad') {
            // Funny falling slide-down pitch (sad boo/sigh)
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
        } else if (type === 'fanfare') {
            // Major brassy victory chimes (C4 -> E4 -> G4 -> C5 -> E5 -> G5)
            const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
            
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.45);
                
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.5);
            });

            // Play final big chords together
            setTimeout(() => {
                const cTime = ctx.currentTime;
                [523.25, 659.25, 783.99, 1046.50].forEach(f => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(f, cTime);
                    gain.gain.setValueAtTime(0.08, cTime);
                    gain.gain.exponentialRampToValueAtTime(0.005, cTime + 0.6);
                    osc.start(cTime);
                    osc.stop(cTime + 0.6);
                });
            }, 450);
        } else if (type === 'success') {
            // A quick happy sparkle arpeggio
            const freqs = [523.25, 659.25, 783.99, 1046.50];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);

                gain.gain.setValueAtTime(0, now + idx * 0.06);
                gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.25);

                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.3);
            });
        } else if (type === 'splash') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'chime') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(880, now);
            osc2.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.4);
            osc2.stop(now + 0.4);
        } else if (type === 'slide') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.22);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.linearRampToValueAtTime(0.005, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'coin') {
            // Happy coin collect jingle - two bright chimes
            const freqs = [1046.50, 1318.51, 1567.98]; // C6, E6, G6
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                gain.gain.setValueAtTime(0, now + idx * 0.07);
                gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.07 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.07 + 0.2);
                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.25);
            });
        } else if (type === 'ticktock') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
        }
    } catch (e) {
        console.warn("Audio Context init blocked until screen clicked.", e);
    }
}

// Helpers for synthesis
function makeCrunch(ctx, time) {
    // Generate white-noise-like crunching sounds using an oscillator with frequency drift
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.linearRampToValueAtTime(30, time + 0.08);

    // Fast volume drops
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.08);
}

function playChirp(ctx, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, time); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, time + 0.08); // E6
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.08);
}

function playBirdChirp(ctx, time, startFreq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.linearRampToValueAtTime(startFreq + 300, time + 0.06);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.06);
    osc.start(time);
    osc.stop(time + 0.06);
}
