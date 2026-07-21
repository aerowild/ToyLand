// src/components/MathTutor.jsx
// Short, animated, voiced mini-lessons that TEACH how to solve an add/subtract problem,
// using proven 2nd-grade strategies: decomposition tree (break into tens & ones),
// make-a-ten (ten-frames), count on, and count up ("think addition").
import React, { useState, useEffect, useRef } from 'react';
import { speak, numToWords, primeSpeech } from '../utils/sound';

/* ---------- strategy chooser ---------- */
// A number is "near a ten" when its ones digit is 8 or 9 (e.g. 19, 28) — round it up.
function pickCompBase(a, b) {
  const cands = [];
  for (const [base, other] of [[a, b], [b, a]]) {
    if (base % 10 === 8 || base % 10 === 9) {
      const need = 10 - (base % 10);
      if (other >= need) cands.push({ base, other, need });
    }
  }
  cands.sort((x, y) => (x.need - y.need) || (y.base - x.base)); // closest to a ten, then larger
  return cands[0] || null;
}

function chooseStrategy(a, op, b) {
  if (op === '+') {
    if (pickCompBase(a, b)) return 'compensate'; // 19+9 -> 20+8 (round to a friendly ten)
    if (a >= 10 || b >= 10) return 'tree';        // two-digit-ish -> branch into tens & ones
    if (a + b > 10) return 'makeTenAdd';          // crosses 10 -> make a friendly ten
    return 'countOn';                             // small -> count on
  }
  return 'countUp';                               // subtraction -> count up ("think addition")
}

/* ---------- lesson builders ---------- */
function buildPlan(a, op, b, ans) {
  const strat = chooseStrategy(a, op, b);
  if (strat === 'compensate') return planCompensation(a, b, ans);
  if (strat === 'tree') return planTree(a, b, ans);
  if (strat === 'makeTenAdd') return planMakeTen(a, b, ans);
  if (strat === 'countOn') return planCountOn(a, b, ans);
  return planCountUp(a, b, ans);
}

// COMPENSATION: round a near-ten addend up to the ten and take the same from the other.
// 19 + 9 -> (borrow 1) 20 + 8 = 28. Shown on a number line.
function planCompensation(a, b, ans) {
  const { base, other, need } = pickCompBase(a, b);
  const rounded = base + need;
  const other2 = other - need;
  return {
    kind: 'line', tip: 'Round to a friendly ten, then adjust!', min: base, max: ans,
    frames: [
      { say: `Let's add ${numToWords(a)} plus ${numToWords(b)}. Look — ${numToWords(base)} is really close to ${numToWords(rounded)}!`, marker: base, arcs: [] },
      { say: `Start at ${numToWords(base)}.`, marker: base, arcs: [] },
      { say: `Borrow ${numToWords(need)} from ${numToWords(other)} to jump up to a friendly ${numToWords(rounded)}.`, marker: rounded, arcs: [{ from: base, to: rounded, label: `+${need}` }] },
      { say: `That leaves ${numToWords(other2)}. Now ${numToWords(rounded)} plus ${numToWords(other2)} is easy: ${numToWords(ans)}!`, marker: ans, arcs: [{ from: base, to: rounded, label: `+${need}` }, { from: rounded, to: ans, label: `+${other2}` }] },
    ],
  };
}

// Decomposition TREE: 17 + 7 -> 17 branches to 10 & 7, circle the ones (7+7=14), then 10 + 14 = 24.
function planTree(a, b, ans) {
  const aT = Math.floor(a / 10) * 10, aO = a % 10;
  const bT = Math.floor(b / 10) * 10, bO = b % 10;
  const bHasTens = b >= 10;
  const onesSum = aO + bO;
  const tensSum = aT + bT;

  const nodes = [
    { id: 'A', x: 150, y: 42, val: a, fill: '#e0f2fe', sc: '#0284c7' },
    { id: 'B', x: 330, y: 42, val: b, fill: '#e0f2fe', sc: '#0284c7' },
    { id: 'aT', x: 92, y: 126, val: aT, fill: '#dbeafe', sc: '#3b82f6' },
    { id: 'aO', x: 206, y: 126, val: aO, fill: '#fef3c7', sc: '#f59e0b' },
    { id: 'bO', x: bHasTens ? 392 : 330, y: 126, val: bO, fill: '#fef3c7', sc: '#f59e0b' },
    { id: 'sumOnes', x: 252, y: 208, val: onesSum, fill: '#fde68a', sc: '#d97706' },
    { id: 'ans', x: 240, y: 274, val: ans, fill: '#bbf7d0', sc: '#16a34a' },
  ];
  if (bHasTens) nodes.splice(4, 0, { id: 'bT', x: 300, y: 126, val: bT, fill: '#dbeafe', sc: '#3b82f6' });

  const edges = [['A', 'aT'], ['A', 'aO'], ['B', 'bO'], ['aO', 'sumOnes'], ['bO', 'sumOnes'], ['aT', 'ans'], ['sumOnes', 'ans']];
  if (bHasTens) { edges.push(['B', 'bT'], ['bT', 'ans']); }

  const baseShow = ['A', 'B', 'aT', 'aO', 'bO'].concat(bHasTens ? ['bT'] : []);
  const tensNodes = ['aT'].concat(bHasTens ? ['bT'] : []);

  const frames = [
    { say: `Let's add ${numToWords(a)} plus ${numToWords(b)}. First, we break the numbers apart.`, show: ['A', 'B'] },
    { say: `${numToWords(a)} breaks into ${numToWords(aT)} and ${numToWords(aO)}${bHasTens ? `, and ${numToWords(b)} into ${numToWords(bT)} and ${numToWords(bO)}` : ''}.`, show: baseShow },
    { say: `Circle the ones and add them: ${numToWords(aO)} plus ${numToWords(bO)} makes ${numToWords(onesSum)}.`, show: baseShow.concat('sumOnes'), flash: ['aO', 'bO', 'sumOnes'], circle: ['aO', 'bO'] },
  ];

  if (onesSum >= 10) {
    // The ones made a NEW ten (e.g. 7 + 7 = 14). Show it explicitly:
    // bring 10 and 14 together, then add the tens digits (1 + 1 = 2) and the ones digit.
    const tensDigits = tensNodes.map((id) => (id === 'aT' ? aT : bT) / 10) // e.g. [1] or [1,1]
      .concat(Math.floor(onesSum / 10));                                   // tens digit of the ones-sum (14 -> 1)
    const tensDigitSum = tensDigits.reduce((s, d) => s + d, 0);            // == Math.floor(ans/10)
    const onesDigit = onesSum % 10;                                        // the leftover ones (14 -> 4)
    const tensWords = tensDigits.map(numToWords).join(' plus ');
    const digitHiTens = tensNodes.map((id) => ({ id, place: 'tens' })).concat({ id: 'sumOnes', place: 'tens' });

    frames.push(
      { say: `Now bring the parts together${bHasTens ? '' : `: ${numToWords(tensSum)} plus ${numToWords(onesSum)}`}.`, show: baseShow.concat('sumOnes'), flash: tensNodes.concat('sumOnes') },
      { say: `Add the tens: ${tensWords} makes ${numToWords(tensDigitSum)} tens — that's ${numToWords(tensDigitSum * 10)}.`, show: baseShow.concat('sumOnes'), digitHi: digitHiTens },
      { say: `So ${numToWords(tensDigitSum * 10)} and ${numToWords(onesDigit)} more makes ${numToWords(ans)}!`, show: baseShow.concat('sumOnes', 'ans'), flash: ['ans'], digitHi: [{ id: 'sumOnes', place: 'ones' }, { id: 'ans', place: 'tens' }, { id: 'ans', place: 'ones' }] },
    );
  } else {
    // No new ten formed (e.g. 23 + 5): the tens combine simply.
    frames.push(
      { say: `Now add the tens: ${numToWords(tensSum)} plus ${numToWords(onesSum)} is ${numToWords(ans)}.`, show: baseShow.concat('sumOnes', 'ans'), flash: tensNodes.concat('sumOnes', 'ans') },
    );
  }

  return { kind: 'tree', nodes, edges, tip: 'Break big numbers into tens and ones!', frames };
}

function planCountOn(a, b, ans) {
  const big = Math.max(a, b), small = Math.min(a, b);
  return {
    kind: 'line', tip: 'Start with the BIGGER number, then count on!', min: 0, max: a + b,
    frames: [
      { say: `Let's add ${numToWords(a)} plus ${numToWords(b)} by COUNTING ON.`, marker: big, arcs: [] },
      { say: `Start at the bigger number, ${numToWords(big)}.`, marker: big, arcs: [] },
      { say: `Now count on ${numToWords(small)} more.`, marker: a + b, arcs: [{ from: big, to: a + b, label: `+${small}` }] },
      { say: `We land on ${numToWords(ans)}. So ${numToWords(a)} plus ${numToWords(b)} equals ${numToWords(ans)}.`, marker: ans, arcs: [{ from: big, to: a + b, label: `+${small}` }] },
    ],
  };
}

function planMakeTen(a, b, ans) {
  const start = Math.max(a, b), other = Math.min(a, b);
  const need = 10 - start, rest = other - need;
  return {
    kind: 'ten', tip: 'Jump to the friendly 10 first!',
    frames: [
      { say: `Let's add ${numToWords(a)} plus ${numToWords(b)} by MAKING A TEN.`, filled: 0, glow: [] },
      { say: `Start with ${numToWords(start)} dots.`, filled: start, glow: range(0, start) },
      { say: `We need ${numToWords(need)} more to fill the ten, so take ${numToWords(need)} from the ${numToWords(other)}.`, filled: 10, glow: range(start, 10) },
      { say: `That leaves ${numToWords(rest)}. Ten plus ${numToWords(rest)} is ${numToWords(ans)}!`, filled: 10 + rest, glow: range(10, 10 + rest) },
    ],
  };
}

function planCountUp(a, b, ans) {
  const jumps = countUpJumps(b, a);
  const frames = [
    { say: `Let's solve ${numToWords(a)} minus ${numToWords(b)}. The trick: subtracting is COUNTING UP.`, marker: b, arcs: [] },
    { say: `Start at the smaller number, ${numToWords(b)}.`, marker: b, arcs: [] },
  ];
  let cur = b; const arcs = [];
  jumps.forEach((j) => {
    arcs.push({ from: cur, to: cur + j, label: `+${j}` });
    cur += j;
    frames.push({ say: `Jump up ${numToWords(j)} to reach ${numToWords(cur)}.`, marker: cur, arcs: arcs.slice() });
  });
  frames.push({ say: `Add up the jumps: that makes ${numToWords(ans)}. So ${numToWords(a)} minus ${numToWords(b)} equals ${numToWords(ans)}.`, marker: a, arcs: arcs.slice() });
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
function TreeViz({ nodes, edges, frame }) {
  const W = 480, H = 300, bw = 58, bh = 38;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const show = new Set(frame.show || []);
  const flash = new Set(frame.flash || []);
  const circleIds = (frame.circle || []).map((id) => byId[id]).filter(Boolean);
  let circle = null;
  if (circleIds.length) {
    const xs = circleIds.map((n) => n.x), ys = circleIds.map((n) => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    circle = { cx, cy, rx: (Math.max(...xs) - Math.min(...xs)) / 2 + bw / 2 + 10, ry: bh / 2 + 12 };
  }

  // Per-digit layout so individual digits (e.g. the "1" in 10 and the "1" in 14) can be ringed.
  const DW = 15;
  const digitX = (n, idx) => n.x - ((String(n.val).length - 1) * DW) / 2 + idx * DW;
  const placeIdx = (n, place) => { const len = String(n.val).length; return place === 'tens' ? len - 2 : len - 1; };
  const digitHi = (frame.digitHi || []).map((h) => {
    const n = byId[h.id]; if (!n || !show.has(h.id)) return null;
    const idx = placeIdx(n, h.place); if (idx < 0) return null;
    return { x: digitX(n, idx), y: n.y };
  }).filter(Boolean);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 480 }}>
      {edges.map(([f, t], i) => {
        const A = byId[f], B = byId[t];
        const vis = show.has(f) && show.has(t);
        return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#94a3b8" strokeWidth="2.5" style={{ opacity: vis ? 1 : 0, transition: 'opacity 0.45s' }} />;
      })}
      {circle && <ellipse className="tutor-circle" cx={circle.cx} cy={circle.cy} rx={circle.rx} ry={circle.ry} fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 5" />}
      {nodes.map((n) => {
        const vis = show.has(n.id);
        const digits = String(n.val).split('');
        return (
          <g key={n.id} className={flash.has(n.id) ? 'tutor-flash' : ''} style={{ opacity: vis ? 1 : 0, transition: 'opacity 0.45s, transform 0.45s', transform: vis ? 'scale(1)' : 'scale(0.6)', transformOrigin: `${n.x}px ${n.y}px` }}>
            <rect x={n.x - bw / 2} y={n.y - bh / 2} width={bw} height={bh} rx="10" fill={n.fill} stroke={n.sc} strokeWidth="3" />
            {digits.map((d, di) => (
              <text key={di} x={digitX(n, di)} y={n.y + 7} textAnchor="middle" fontSize="20" fontWeight="900" fill="#1e293b">{d}</text>
            ))}
          </g>
        );
      })}
      {digitHi.map((h, i) => (
        <ellipse key={`dh${i}`} className="tutor-circle" cx={h.x} cy={h.y} rx="11" ry="15" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="5 4" />
      ))}
    </svg>
  );
}

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
      <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#a855f7" /></marker></defs>
      <circle cx={x(marker)} cy={baseY} r="9" fill="#22c55e" stroke="#fff" strokeWidth="2" style={{ transition: 'cx 0.7s ease' }} />
    </svg>
  );
}

function TenFrames({ filled, glow }) {
  const cells = []; for (let i = 0; i < 20; i++) cells.push(i);
  return (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
      {[0, 1].map((f) => (
        <div key={f} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, padding: 6, background: '#f1f5f9', borderRadius: 10, border: '2px solid #cbd5e1' }}>
          {cells.slice(f * 10, f * 10 + 10).map((idx) => {
            const on = idx < filled; const hot = glow.includes(idx);
            return <div key={idx} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #cbd5e1', background: on ? (hot ? '#f59e0b' : '#22c55e') : 'white', transition: 'background 0.45s' }} />;
          })}
        </div>
      ))}
    </div>
  );
}

/* ---------- main ---------- */
export default function MathTutor({ a, op, b, answer, onDone }) {
  // Build the lesson once per mount (a new problem remounts this component).
  const [plan] = useState(() => buildPlan(a, op, b, answer));
  const [step, setStep] = useState(0);
  const lastIndex = plan.frames.length - 1;
  const isLast = step >= lastIndex;
  // #7: the answer stays hidden until the child taps through to the FINAL step.
  const revealAnswer = isLast;

  const sayFrame = (i) => {
    const f = plan.frames[i];
    if (!f) return;
    // resume() unwedges Chrome/Safari speech after repeated cancel() (2nd+ tutorial going silent).
    try { window.speechSynthesis.resume(); } catch (e) { /* ignore */ }
    speak(f.say, { female: true, rate: 0.9, pitch: 1.05, volume: 1, clear: true, minGap: 0 });
  };

  // Prime once; cancel any speech on unmount.
  useEffect(() => {
    primeSpeech();
    return () => { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } };
  }, []);

  // Narrate the current step whenever it changes (kid controls the pace by tapping).
  useEffect(() => {
    try { window.speechSynthesis.cancel(); window.speechSynthesis.resume(); } catch (e) { /* ignore */ }
    const id = setTimeout(() => sayFrame(step), step === 0 ? 300 : 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const next = () => { if (step < lastIndex) setStep(step + 1); };
  const replay = () => { if (step === 0) sayFrame(0); else setStep(0); };
  const skip = () => setStep(lastIndex);
  const ok = () => { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } if (onDone) onDone(); };

  const frame = plan.frames[step] || plan.frames[0];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka', sans-serif" }}>
      <div style={{ background: 'white', border: '5px solid #0ea5e9', borderRadius: 28, padding: 24, width: '92%', maxWidth: 560, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
        <h2 style={{ margin: '0 0 4px 0', color: '#0369a1', fontWeight: 900, fontSize: '1.4rem' }}>🧑‍🏫 Let's learn it — tap along!</h2>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', margin: '4px 0 12px 0' }}>
          {a} {op} {b} = <span style={{ color: revealAnswer ? '#16a34a' : '#a855f7' }}>{revealAnswer ? answer : '?'}</span>
        </div>

        <div style={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {plan.kind === 'tree' && <TreeViz nodes={plan.nodes} edges={plan.edges} frame={frame} />}
          {plan.kind === 'line' && <NumberLine min={plan.min} max={plan.max} marker={frame.marker} arcs={frame.arcs} />}
          {plan.kind === 'ten' && <TenFrames filled={frame.filled} glow={frame.glow} />}
        </div>

        <div style={{ minHeight: 48, color: '#334155', fontWeight: 700, fontSize: '1.05rem', margin: '10px 0' }}>{frame.say}</div>
        <div style={{ background: '#fef9c3', border: '2px solid #fbbf24', borderRadius: 12, padding: '8px 12px', color: '#854d0e', fontWeight: 800, fontSize: '0.95rem' }}>💡 {plan.tip}</div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '12px 0 4px 0' }}>
          {plan.frames.map((_, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i <= step ? '#0ea5e9' : '#e2e8f0' }} />)}
        </div>

        {isLast ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <button onClick={replay} style={{ fontFamily: 'inherit', fontWeight: 900, fontSize: '1rem', padding: '12px 22px', borderRadius: 14, border: 'none', background: '#a855f7', color: 'white', cursor: 'pointer', boxShadow: '0 4px 0 #7c3aed' }}>🔁 Replay</button>
            <button onClick={ok} style={{ fontFamily: 'inherit', fontWeight: 900, fontSize: '1rem', padding: '12px 26px', borderRadius: 14, border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', boxShadow: '0 4px 0 #16a34a' }}>👍 OK, got it!</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <button onClick={skip} style={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '0.95rem', padding: '12px 18px', borderRadius: 14, border: 'none', background: '#64748b', color: 'white', cursor: 'pointer', boxShadow: '0 4px 0 #475569' }}>⏭️ Skip</button>
            <button onClick={next} style={{ fontFamily: 'inherit', fontWeight: 900, fontSize: '1.05rem', padding: '12px 30px', borderRadius: 14, border: 'none', background: '#0ea5e9', color: 'white', cursor: 'pointer', boxShadow: '0 4px 0 #0284c7' }}>👉 Next step</button>
          </div>
        )}
      </div>
    </div>
  );
}
