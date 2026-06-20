// src/components/MathTutor.jsx
// Short, animated, voiced mini-lessons that TEACH how to solve an add/subtract problem,
// using proven 2nd-grade mental-math strategies (count on, make-a-ten, count up, place value).
import React, { useState, useEffect, useRef } from 'react';
import { speak, numToWords } from '../utils/sound';

const STEP_MS = 2100;

/* ---------- strategy chooser ---------- */
function chooseStrategy(a, op, b) {
  if (op === '+') {
    if (a >= 10 || b >= 10) return 'placeAdd';      // two-digit-ish -> tens & ones
    if (a + b > 10) return 'makeTenAdd';            // crosses 10 -> make a friendly ten
    return 'countOn';                               // small -> count on
  }
  return 'countUp';                                 // subtraction -> count up ("think addition")
}

/* ---------- build the lesson frames ---------- */
function buildPlan(a, op, b, ans) {
  const strat = chooseStrategy(a, op, b);

  if (strat === 'countOn') {
    const big = Math.max(a, b), small = Math.min(a, b);
    return {
      kind: 'line', tip: 'Start with the BIGGER number, then count on!',
      min: 0, max: a + b,
      frames: [
        { say: `Start at the bigger number, ${numToWords(big)}.`, marker: big, arcs: [] },
        { say: `Now count on ${numToWords(small)} more.`, marker: a + b, arcs: [{ from: big, to: a + b, label: `+${small}` }] },
        { say: `That lands on ${numToWords(ans)}. ${numToWords(a)} plus ${numToWords(b)} equals ${numToWords(ans)}.`, marker: ans, arcs: [{ from: big, to: a + b, label: `+${small}` }] },
      ],
    };
  }

  if (strat === 'makeTenAdd') {
    const start = Math.max(a, b), other = Math.min(a, b);
    const need = 10 - start;          // how many to borrow to reach 10
    const rest = other - need;        // what's left after making 10
    return {
      kind: 'ten', tip: 'Jump to the friendly 10 first!',
      frames: [
        { say: `Let's make a ten! Start with ${numToWords(start)}.`, filled: start, glow: [] },
        { say: `Take ${numToWords(need)} from the ${numToWords(other)} to fill the ten.`, filled: 10, glow: range(start, 10) },
        { say: `${numToWords(other)} minus ${numToWords(need)} leaves ${numToWords(rest)}. Ten plus ${numToWords(rest)} is ${numToWords(ans)}.`, filled: 10 + rest, glow: range(10, 10 + rest) },
      ],
    };
  }

  if (strat === 'placeAdd') {
    const aT = Math.floor(a / 10) * 10, aO = a % 10;
    const bT = Math.floor(b / 10) * 10, bO = b % 10;
    return {
      kind: 'place', tip: 'Add the tens and the ones separately!',
      a, b, ans, aT, aO, bT, bO,
      frames: [
        { say: `Break ${numToWords(a)} and ${numToWords(b)} into tens and ones.`, show: 0 },
        { say: `Add the tens: ${numToWords(aT)} plus ${numToWords(bT)} is ${numToWords(aT + bT)}.`, show: 1 },
        { say: `Add the ones: ${numToWords(aO)} plus ${numToWords(bO)} is ${numToWords(aO + bO)}.`, show: 2 },
        { say: `Put them together: ${numToWords(ans)}.`, show: 3 },
      ],
    };
  }

  // countUp (subtraction, "think addition") — chunked jumps on a number line
  const jumps = countUpJumps(b, a);
  const frames = [{ say: `To find ${numToWords(a)} minus ${numToWords(b)}, count UP from ${numToWords(b)}.`, marker: b, arcs: [] }];
  let cur = b; const arcs = [];
  jumps.forEach((j) => {
    arcs.push({ from: cur, to: cur + j, label: `+${j}` });
    cur += j;
    frames.push({ say: `Jump ${numToWords(j)} to ${numToWords(cur)}.`, marker: cur, arcs: arcs.slice() });
  });
  frames.push({ say: `Add the jumps: that's ${numToWords(ans)}. So ${numToWords(a)} minus ${numToWords(b)} equals ${numToWords(ans)}.`, marker: a, arcs: arcs.slice() });
  return { kind: 'line', tip: 'Subtracting is just counting UP!', min: b, max: a, frames };
}

function range(from, to) { const r = []; for (let i = from; i < to; i++) r.push(i); return r; }
function countUpJumps(from, to) {
  const jumps = []; let cur = from;
  const toTen = (10 - (cur % 10)) % 10;
  if (toTen > 0 && cur + toTen <= to) { jumps.push(toTen); cur += toTen; }
  const tens = Math.floor((to - cur) / 10) * 10;
  if (tens > 0) { jumps.push(tens); cur += tens; }
  const ones = to - cur;
  if (ones > 0) { jumps.push(ones); cur += ones; }
  return jumps.length ? jumps : [to - from];
}

/* ---------- visuals ---------- */
function NumberLine({ min, max, marker, arcs }) {
  const W = 460, padX = 26, baseY = 96;
  const span = Math.max(1, max - min);
  const x = (v) => padX + ((v - min) / span) * (W - padX * 2);
  const showEvery = span <= 20 ? 1 : span <= 40 ? 5 : 10;
  const ticks = [];
  for (let v = min; v <= max; v += showEvery) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return (
    <svg viewBox={`0 0 ${W} 120`} style={{ width: '100%', maxWidth: 460 }}>
      <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="#94a3b8" strokeWidth="3" />
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={x(v)} y1={baseY - 6} x2={x(v)} y2={baseY + 6} stroke="#94a3b8" strokeWidth="2" />
          <text x={x(v)} y={baseY + 22} textAnchor="middle" fontSize="13" fontWeight="700" fill="#475569">{v}</text>
        </g>
      ))}
      {arcs.map((arc, i) => {
        const x1 = x(arc.from), x2 = x(arc.to); const mid = (x1 + x2) / 2; const h = 42;
        return (
          <g key={i}>
            <path d={`M ${x1} ${baseY} Q ${mid} ${baseY - h} ${x2} ${baseY}`} fill="none" stroke="#a855f7" strokeWidth="3" markerEnd="url(#ah)" />
            <text x={mid} y={baseY - h + 6} textAnchor="middle" fontSize="15" fontWeight="900" fill="#7c3aed">{arc.label}</text>
          </g>
        );
      })}
      <defs>
        <marker id="ah" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a855f7" /></marker>
      </defs>
      <circle cx={x(marker)} cy={baseY} r="9" fill="#22c55e" stroke="#fff" strokeWidth="2" style={{ transition: 'cx 0.5s ease' }} />
    </svg>
  );
}

function TenFrames({ filled, glow }) {
  const cells = [];
  for (let i = 0; i < 20; i++) cells.push(i);
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      {[0, 1].map((f) => (
        <div key={f} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: 6, background: '#f1f5f9', borderRadius: 10, border: '2px solid #cbd5e1' }}>
          {cells.slice(f * 10, f * 10 + 10).map((idx) => {
            const on = idx < filled;
            const hot = glow.includes(idx);
            return <div key={idx} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #cbd5e1', background: on ? (hot ? '#f59e0b' : '#22c55e') : 'white', transition: 'background 0.3s' }} />;
          })}
        </div>
      ))}
    </div>
  );
}

function PlaceValue({ plan, show }) {
  const { aT, aO, bT, bO, ans } = plan;
  const cell = (label, val, color) => (
    <div style={{ flex: 1, background: 'white', border: `2px solid ${color}`, borderRadius: 12, padding: '8px 6px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>{val}</div>
    </div>
  );
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {cell('Tens', `${aT} + ${bT}`, '#3b82f6')}
        {cell('Ones', `${aO} + ${bO}`, '#f59e0b')}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, opacity: show >= 1 ? 1 : 0.25, transition: 'opacity 0.3s' }}>{cell('Tens make', aT + bT, '#3b82f6')}</div>
        <div style={{ flex: 1, opacity: show >= 2 ? 1 : 0.25, transition: 'opacity 0.3s' }}>{cell('Ones make', aO + bO, '#f59e0b')}</div>
      </div>
      <div style={{ marginTop: 12, textAlign: 'center', fontSize: '1.6rem', fontWeight: 900, color: show >= 3 ? '#16a34a' : '#cbd5e1', transition: 'color 0.3s' }}>
        {aT + bT} + {aO + bO} = {show >= 3 ? ans : '?'}
      </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function MathTutor({ a, op, b, answer, onDone }) {
  const planRef = useRef(buildPlan(a, op, b, answer));
  const plan = planRef.current;
  const [step, setStep] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    plan.frames.forEach((f, i) => {
      timers.current.push(setTimeout(() => {
        setStep(i);
        speak(f.say, { rate: 0.84, pitch: 1.05, volume: 1, voiceIndex: 0, clear: true, minGap: 0 });
      }, i * STEP_MS));
    });
    timers.current.push(setTimeout(() => { finish(); }, plan.frames.length * STEP_MS + 500));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    timers.current.forEach(clearTimeout);
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    if (onDone) onDone();
  };

  const frame = plan.frames[step] || plan.frames[0];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka', sans-serif" }}>
      <div style={{ background: 'white', border: '5px solid #0ea5e9', borderRadius: 28, padding: 24, width: '92%', maxWidth: 540, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
        <h2 style={{ margin: '0 0 4px 0', color: '#0369a1', fontWeight: 900, fontSize: '1.4rem' }}>🧑‍🏫 Let's learn it!</h2>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', margin: '4px 0 14px 0' }}>{a} {op} {b} = {answer}</div>

        <div style={{ minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {plan.kind === 'line' && <NumberLine min={plan.min} max={plan.max} marker={frame.marker} arcs={frame.arcs} />}
          {plan.kind === 'ten' && <TenFrames filled={frame.filled} glow={frame.glow} />}
          {plan.kind === 'place' && <PlaceValue plan={plan} show={frame.show} />}
        </div>

        <div style={{ minHeight: 44, color: '#334155', fontWeight: 700, fontSize: '1.05rem', margin: '10px 0' }}>{frame.say}</div>
        <div style={{ background: '#fef9c3', border: '2px solid #fbbf24', borderRadius: 12, padding: '8px 12px', color: '#854d0e', fontWeight: 800, fontSize: '0.95rem' }}>💡 {plan.tip}</div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '12px 0 4px 0' }}>
          {plan.frames.map((_, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i <= step ? '#0ea5e9' : '#e2e8f0' }} />
          ))}
        </div>

        <button onClick={finish} style={{ marginTop: 10, fontFamily: 'inherit', fontWeight: 900, fontSize: '1rem', padding: '12px 22px', borderRadius: 14, border: 'none', background: '#64748b', color: 'white', cursor: 'pointer', boxShadow: '0 4px 0 #475569' }}>⏭️ Skip</button>
      </div>
    </div>
  );
}
