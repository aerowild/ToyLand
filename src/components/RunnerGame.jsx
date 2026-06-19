// src/components/RunnerGame.jsx - Endless runner woven between math stages
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Hero3D from './Hero3D';
import MathQuest3D from './MathQuest3D';
import { FEATURE_NAMES, getRandomPraise } from '../utils/mathQuestState';
import { playSound, playCrash, playPowerup, playCoinPitch, playTick, speakPedestrian, startBackgroundMusic, stopBackgroundMusic } from '../utils/sound';

const LANES = [-1.8, 0, 1.8];
const RUN_Z = 0;            // character z
const SPAWN_Z = -48;        // where items appear
const DESPAWN_Z = 7;        // recycle past camera

/* ---------------- In-run arithmetic quiz ---------------- */
function makeProblem(level = 1) {
  const r = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const max = level >= 3 ? 50 : level >= 2 ? 20 : 10;
  const op = Math.random() < 0.5 ? '+' : '-';
  let a, b, ans;
  if (op === '+') { a = r(1, max); b = r(1, max); ans = a + b; }
  else { a = r(2, max); b = r(1, a); ans = a - b; }
  const choices = new Set([ans]);
  while (choices.size < 3) {
    const d = ans + r(-4, 4) || ans + 1;
    if (d >= 0) choices.add(d);
  }
  return { text: `${a} ${op} ${b} = ?`, answer: ans, choices: [...choices].sort(() => Math.random() - 0.5) };
}

function QuizModal({ title, subtitle, level, onSolved, onFailed, accent = '#a855f7', timeLimit = 0 }) {
  const [problem] = useState(() => makeProblem(level));
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null); // 'right' | 'wrong'
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const doneRef = useRef(false);

  const finish = (ok) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (ok) { setResult('right'); playSound('chime'); setTimeout(() => onSolved(), 900); }
    else { setResult('wrong'); playSound('buzz'); setTimeout(() => { if (onFailed) onFailed(); }, 1100); }
  };

  useEffect(() => {
    if (!timeLimit) return;
    let lastWhole = Math.ceil(timeLimit);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.1) { clearInterval(id); finish(false); return 0; }
        const next = t - 0.1;
        const whole = Math.ceil(next);
        if (whole !== lastWhole && whole > 0) { lastWhole = whole; playTick(whole <= 3); }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [timeLimit]);

  const choose = (c) => {
    if (result) return;
    setPicked(c);
    finish(c === problem.answer);
  };

  const pct = timeLimit ? Math.max(0, (timeLeft / timeLimit) * 100) : 100;

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.78)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', border: `5px solid ${accent}`, borderRadius: '28px', padding: '28px', width: '90%', maxWidth: '460px', textAlign: 'center', fontFamily: "'Fredoka', sans-serif", boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>
        <h2 style={{ margin: '0 0 4px 0', color: accent, fontWeight: 900, fontSize: '1.5rem' }}>{title}</h2>
        {subtitle && <p style={{ margin: '0 0 10px 0', color: '#64748b', fontWeight: 700 }}>{subtitle}</p>}
        {timeLimit > 0 && (
          <div style={{ margin: '0 0 12px 0' }}>
            <div style={{ fontWeight: 900, color: timeLeft < 3 ? '#ef4444' : '#475569', marginBottom: 4 }}>⏱️ {Math.ceil(timeLeft)}s</div>
            <div style={{ height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: timeLeft < 3 ? '#ef4444' : accent, transition: 'width 0.1s linear' }} />
            </div>
          </div>
        )}
        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e293b', margin: '6px 0 18px 0' }}>{problem.text}</div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {problem.choices.map((c) => {
            const isPicked = picked === c;
            const bg = result && isPicked ? (result === 'right' ? '#22c55e' : '#ef4444') : '#f1f5f9';
            const col = result && isPicked ? 'white' : '#1e293b';
            return (
              <button key={c} onClick={() => choose(c)} disabled={!!result}
                style={{ minWidth: '88px', minHeight: '64px', fontSize: '1.6rem', fontWeight: 900, borderRadius: '16px', border: `3px solid ${accent}`, background: bg, color: col, cursor: result ? 'default' : 'pointer', boxShadow: `0 5px 0 ${accent}` }}>
                {c}
              </button>
            );
          })}
        </div>
        {result === 'right' && <p style={{ color: '#16a34a', fontWeight: 800, marginTop: '14px' }}>{getRandomPraise()}</p>}
        {result === 'wrong' && <p style={{ color: '#ef4444', fontWeight: 800, marginTop: '14px' }}>The answer was {problem.answer}.</p>}
      </div>
    </div>
  );
}

/* ---------------- Colorful obstacle actors (cars, bikes, people, animals) ---------------- */
const CAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];
const BUILDING_COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#f87171', '#38bdf8'];
const SHIRT_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'];

function Wheel({ x, z, r = 0.22 }) {
  return (
    <mesh position={[x, r, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, 0.16, 14]} />
      <meshStandardMaterial color="#1e293b" roughness={0.7} />
    </mesh>
  );
}

function ObstacleActor({ kind, color, overhead }) {
  if (overhead) {
    // Overhead gate — DUCK under it (gap below the bar)
    return (
      <group>
        {[-0.7, 0.7].map((x, i) => <mesh key={i} position={[x, 0.85, 0]}><cylinderGeometry args={[0.07, 0.08, 1.7, 10]} /><meshStandardMaterial color="#475569" metalness={0.6} /></mesh>)}
        <RoundedBox args={[1.7, 0.36, 0.3]} radius={0.06} smoothness={3} position={[0, 1.5, 0]} castShadow><meshStandardMaterial color="#f59e0b" emissive="#ea580c" emissiveIntensity={0.3} /></RoundedBox>
        {[-0.5, 0, 0.5].map((x, i) => <mesh key={i} position={[x, 1.5, 0.16]}><boxGeometry args={[0.16, 0.34, 0.02]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
        <mesh position={[0, 1.78, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} /></mesh>
      </group>
    );
  }
  if (kind === 'car') {
    return (
      <group>
        <RoundedBox args={[1.0, 0.42, 1.5]} radius={0.12} smoothness={3} position={[0, 0.42, 0]} castShadow><meshStandardMaterial color={color} metalness={0.4} roughness={0.35} /></RoundedBox>
        <RoundedBox args={[0.9, 0.4, 0.85]} radius={0.1} smoothness={3} position={[0, 0.78, -0.05]}><meshStandardMaterial color={color} metalness={0.4} roughness={0.35} /></RoundedBox>
        <mesh position={[0, 0.8, 0.34]}><boxGeometry args={[0.78, 0.3, 0.06]} /><meshStandardMaterial color="#bae6fd" metalness={0.6} roughness={0.1} /></mesh>
        <Wheel x={-0.5} z={0.5} /><Wheel x={0.5} z={0.5} /><Wheel x={-0.5} z={-0.5} /><Wheel x={0.5} z={-0.5} />
        {[-0.3, 0.3].map((x, i) => <mesh key={i} position={[x, 0.42, 0.77]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1} /></mesh>)}
      </group>
    );
  }
  if (kind === 'bike' || kind === 'bicycle') {
    const thin = kind === 'bicycle';
    return (
      <group>
        {[0.45, -0.45].map((z, i) => (
          thin
            ? <mesh key={i} position={[0, 0.3, z]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.28, 0.04, 8, 18]} /><meshStandardMaterial color="#1e293b" /></mesh>
            : <Wheel key={i} x={0} z={z} r={0.28} />
        ))}
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.8, 8]} /><meshStandardMaterial color={color} metalness={0.5} /></mesh>
        <mesh position={[0, 0.62, -0.1]}><boxGeometry args={[0.18, 0.08, 0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>
        <mesh position={[0, 0.72, 0.42]}><boxGeometry args={[0.36, 0.05, 0.05]} /><meshStandardMaterial color="#334155" /></mesh>
        {/* rider */}
        <mesh position={[0, 0.95, -0.05]}><capsuleGeometry args={[0.13, 0.28, 4, 10]} /><meshStandardMaterial color={SHIRT_COLORS[(color.length) % SHIRT_COLORS.length]} /></mesh>
        <mesh position={[0, 1.28, -0.05]}><sphereGeometry args={[0.14, 12, 12]} /><meshStandardMaterial color="#f5d0b0" /></mesh>
      </group>
    );
  }
  if (kind === 'pedestrian') {
    return (
      <group>
        {[-0.1, 0.1].map((x, i) => <mesh key={i} position={[x, 0.3, 0]}><capsuleGeometry args={[0.07, 0.3, 4, 8]} /><meshStandardMaterial color="#1e3a8a" /></mesh>)}
        <mesh position={[0, 0.78, 0]}><capsuleGeometry args={[0.18, 0.36, 4, 10]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 1.22, 0]}><sphereGeometry args={[0.18, 14, 14]} /><meshStandardMaterial color="#f5d0b0" /></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#7c2d12" /></mesh>
      </group>
    );
  }
  if (kind === 'animal') {
    return (
      <group>
        <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.22, 0.5, 6, 12]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 0.6, 0.4]}><sphereGeometry args={[0.22, 14, 14]} /><meshStandardMaterial color={color} /></mesh>
        {[-0.14, 0.14].map((x, i) => <mesh key={i} position={[x, 0.78, 0.42]} rotation={[0.3, 0, 0]}><coneGeometry args={[0.07, 0.16, 8]} /><meshStandardMaterial color={color} /></mesh>)}
        {[[-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]].map(([x, z], i) => <mesh key={i} position={[x, 0.14, z]}><cylinderGeometry args={[0.06, 0.06, 0.3, 8]} /><meshStandardMaterial color={color} /></mesh>)}
        <mesh position={[0, 0.55, -0.45]} rotation={[-0.6, 0, 0]}><cylinderGeometry args={[0.04, 0.02, 0.3, 8]} /><meshStandardMaterial color={color} /></mesh>
        {[-0.08, 0.08].map((x, i) => <mesh key={i} position={[x, 0.66, 0.6]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#0b1220" /></mesh>)}
      </group>
    );
  }
  // barrier (construction): striped + flashing top
  return (
    <group>
      {[-0.4, 0.4].map((x, i) => <mesh key={i} position={[x, 0.35, 0]}><cylinderGeometry args={[0.05, 0.06, 0.7, 8]} /><meshStandardMaterial color="#475569" /></mesh>)}
      <RoundedBox args={[1.1, 0.3, 0.18]} radius={0.04} smoothness={3} position={[0, 0.75, 0]} castShadow><meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={0.3} /></RoundedBox>
      {[-0.33, 0, 0.33].map((x, i) => <mesh key={i} position={[x, 0.75, 0.1]}><boxGeometry args={[0.12, 0.32, 0.02]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
      <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1} /></mesh>
    </group>
  );
}

const OBSTACLE_KINDS = ['car', 'bike', 'bicycle', 'pedestrian', 'animal', 'barrier'];

// Floating, glowing power-up pickup icons
function PowerupIcon({ power }) {
  if (power === 'magnet') {
    return (
      <group>
        <mesh position={[0, 0.12, 0]}><torusGeometry args={[0.22, 0.09, 10, 20, Math.PI]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} metalness={0.5} /></mesh>
        {[-0.22, 0.22].map((x, i) => <mesh key={i} position={[x, -0.08, 0]}><cylinderGeometry args={[0.09, 0.09, 0.14, 10]} /><meshStandardMaterial color="#e2e8f0" emissive="#cbd5e1" emissiveIntensity={0.4} metalness={0.7} /></mesh>)}
      </group>
    );
  }
  if (power === 'jetpack') {
    return (
      <group>
        <RoundedBox args={[0.3, 0.4, 0.22]} radius={0.06} smoothness={3}><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.7} metalness={0.6} /></RoundedBox>
        <mesh position={[0, -0.3, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.1, 0.28, 10]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.3} transparent opacity={0.85} /></mesh>
        <mesh position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.05, 0.16, 10]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.5} transparent opacity={0.95} /></mesh>
      </group>
    );
  }
  if (power === 'boost') {
    return <mesh rotation={[0, 0, -0.2]}><coneGeometry args={[0.18, 0.5, 5]} /><meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={1.1} /></mesh>;
  }
  if (power === 'double') {
    return (
      <group>
        {[-0.08, 0.08].map((x, i) => <mesh key={i} position={[x, 0, x]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.24, 0.24, 0.07, 16]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} metalness={0.7} /></mesh>)}
      </group>
    );
  }
  // shield
  return <mesh><sphereGeometry args={[0.28, 18, 18]} /><meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.6} transparent opacity={0.55} metalness={0.4} /></mesh>;
}

/* ---------------- Static colorful world (rendered once, scrolled via refs) ---------------- */
const StaticWorld = React.memo(function StaticWorld({ sceneRef, engine }) {
  const sc = sceneRef.current;
  const bRefs = useRef([]);
  const tRefs = useRef([]);
  const dRefs = useRef([]);
  const birdRefs = useRef([]);
  const tramRefs = useRef([]);

  useFrame((state, delta) => {
    const e = engine.current;
    if (e.paused) return;
    const dt = Math.min(delta, 0.05);
    const move = e.speed * dt;
    const t = state.clock.elapsedTime;
    sc.dashes.forEach((d, i) => { d.z += move; if (d.z > DESPAWN_Z) d.z -= sc.DSPAN; const m = dRefs.current[i]; if (m) m.position.z = d.z; });
    sc.trees.forEach((o, i) => { o.z += move; if (o.z > DESPAWN_Z) o.z -= sc.TSPAN; const m = tRefs.current[i]; if (m) m.position.z = o.z; });
    sc.buildings.forEach((b, i) => { b.z += move; if (b.z > DESPAWN_Z) b.z -= sc.BSPAN; const m = bRefs.current[i]; if (m) m.position.z = b.z; });
    sc.birds.forEach((b, i) => { b.z += move * 0.5; if (b.z > DESPAWN_Z + 6) { b.z -= 70; b.x = -8 + Math.random() * 16; } const m = birdRefs.current[i]; if (m) { m.position.z = b.z; m.position.x = b.x; m.rotation.z = Math.sin(t * 6 + i) * 0.4; } });
    sc.trams.forEach((tr, i) => { tr.z += tr.sp * dt * 4 + move * 0.4; if (tr.z > 16) tr.z -= 100; const m = tramRefs.current[i]; if (m) m.position.z = tr.z; });
  });

  return (
    <group>
      <color attach="background" args={['#afe3ff']} />
      <fogExp2 attach="fog" color="#cdeeff" density={0.012} />
      <ambientLight intensity={0.85} color="#ffffff" />
      <hemisphereLight skyColor="#bae6fd" groundColor="#86efac" intensity={0.7} />
      <directionalLight position={[6, 12, 4]} intensity={1.3} color="#fff7e0" />
      <mesh position={[8, 9, -20]}><sphereGeometry args={[1.6, 18, 18]} /><meshBasicMaterial color="#fff3b0" /></mesh>
      {[[-7, 7, -22], [6, 8, -30], [-3, 9, -40]].map((p, i) => (
        <group key={i} position={p}>
          {[[0, 0, 0], [0.9, -0.1, 0], [-0.9, -0.1, 0], [0.4, 0.4, 0]].map((o, k) => (
            <mesh key={k} position={o}><sphereGeometry args={[0.7, 10, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>
          ))}
        </group>
      ))}

      {/* Grass borders */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 6.5, -0.08, -18]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[8, 95]} />
          <meshStandardMaterial color="#5fd07a" roughness={1} />
        </mesh>
      ))}
      {/* Road */}
      <mesh position={[0, -0.04, -18]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6.2, 95]} />
        <meshStandardMaterial color="#64748b" roughness={0.95} />
      </mesh>
      {[-3.1, 3.1].map((x, i) => (
        <mesh key={i} position={[x, 0.12, -18]}>
          <boxGeometry args={[0.24, 0.3, 95]} />
          <meshStandardMaterial color="#f8fafc" emissive="#fbbf24" emissiveIntensity={0.15} />
        </mesh>
      ))}
      {/* lane dashes */}
      {sc.dashes.map((d, i) => (
        <mesh key={i} ref={(el) => (dRefs.current[i] = el)} position={[d.x, 0.01, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.14, 1.0]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      ))}
      {/* buildings (max 3 window rows for performance) */}
      {sc.buildings.map((b, i) => (
        <group key={i} ref={(el) => (bRefs.current[i] = el)} position={[b.x, b.h / 2, b.z]}>
          <mesh castShadow><boxGeometry args={[b.w, b.h, b.w]} /><meshStandardMaterial color={b.color} roughness={0.7} /></mesh>
          {Array.from({ length: Math.min(3, Math.max(2, Math.floor(b.h / 1.2))) }).map((_, r) => (
            [-0.28, 0.28].map((wx, c) => (
              <mesh key={`${r}-${c}`} position={[wx * b.w, -b.h / 2 + 0.6 + r * 0.8, b.w / 2 + 0.01]}>
                <planeGeometry args={[0.24, 0.34]} />
                <meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.5} />
              </mesh>
            ))
          ))}
          <mesh position={[0, b.h / 2 + 0.1, 0]}><boxGeometry args={[b.w + 0.1, 0.2, b.w + 0.1]} /><meshStandardMaterial color="#334155" /></mesh>
        </group>
      ))}
      {/* trees */}
      {sc.trees.map((tr, i) => (
        <group key={i} ref={(el) => (tRefs.current[i] = el)} position={[tr.x, 0, tr.z]}>
          <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.1, 0.13, 0.8, 8]} /><meshStandardMaterial color="#92400e" /></mesh>
          <mesh position={[0, 1.0, 0]}><sphereGeometry args={[0.45, 10, 10]} /><meshStandardMaterial color="#22c55e" /></mesh>
          <mesh position={[0.2, 1.3, 0.1]}><sphereGeometry args={[0.32, 10, 10]} /><meshStandardMaterial color="#16a34a" /></mesh>
        </group>
      ))}
      {/* birds */}
      {sc.birds.map((b, i) => (
        <group key={i} ref={(el) => (birdRefs.current[i] = el)} position={[b.x, b.y, b.z]}>
          <mesh position={[0.18, 0, 0]}><boxGeometry args={[0.05, 0.02, 0.4]} /><meshStandardMaterial color="#1e293b" /></mesh>
          <mesh position={[-0.18, 0, 0]}><boxGeometry args={[0.05, 0.02, 0.4]} /><meshStandardMaterial color="#334155" /></mesh>
          <mesh><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#1e293b" /></mesh>
        </group>
      ))}
      {/* side trams */}
      {sc.trams.map((tr, i) => (
        <group key={i} ref={(el) => (tramRefs.current[i] = el)} position={[tr.x, 0.5, tr.z]}>
          <RoundedBox args={[1.0, 1.3, 4.5]} radius={0.18} smoothness={2}><meshStandardMaterial color={tr.color} metalness={0.4} roughness={0.4} /></RoundedBox>
          {[-1.4, -0.4, 0.6, 1.6].map((z, k) => (
            <mesh key={k} position={[(tr.x < 0 ? 0.51 : -0.51), 0.2, z]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.6, 0.5]} /><meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.4} /></mesh>
          ))}
          <mesh position={[0, 0.72, 0]}><boxGeometry args={[1.05, 0.12, 4.5]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        </group>
      ))}
    </group>
  );
});

/* ---------------- 3D runner scene ---------------- */
function RunnerScene({ engine, features, petColor, petAccessory }) {
  const charRef = useRef();
  const itemGroupRef = useRef();
  const { camera } = useThree();

  // Static scenery data (positions updated each frame, read in JSX)
  const sceneRef = useRef(null);
  if (!sceneRef.current) {
    const buildings = [];
    [-1, 1].forEach((side) => {
      for (let k = 0; k < 5; k++) {
        buildings.push({
          x: side * (5.5 + Math.random() * 1.8),
          z: -k * 13 - (side < 0 ? 0 : 6),
          h: 2.6 + Math.random() * 4,
          w: 1.6 + Math.random() * 1.3,
          color: BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)],
        });
      }
    });
    const trees = [];
    [-1, 1].forEach((side) => {
      for (let k = 0; k < 5; k++) trees.push({ x: side * (3.7 + Math.random() * 0.5), z: -k * 13 - 5 });
    });
    const dashes = [];
    for (let i = 0; i < 28; i++) dashes.push({ x: i % 2 === 0 ? -0.9 : 0.9, z: -i * 2 });
    const birds = [];
    for (let i = 0; i < 5; i++) birds.push({ x: -8 + Math.random() * 16, y: 5 + Math.random() * 3, z: -10 - i * 9, sp: 1.5 + Math.random() * 1.5, ph: Math.random() * 6 });
    const trams = [
      { x: -9.5, z: -20, color: '#dc2626', sp: 6 },
      { x: 9.5, z: -55, color: '#16a34a', sp: 5 },
    ];
    sceneRef.current = { buildings, trees, dashes, birds, trams, BSPAN: 65, TSPAN: 65, DSPAN: 56 };
  }

  useEffect(() => {
    camera.position.set(0, 3.2, 6.5);
    camera.lookAt(0, 1, -6);
  }, [camera]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const e = engine.current;

    // --- timers (power-up effects, duck, invincibility) ---
    if (!e.paused) {
      e.invincible = Math.max(0, e.invincible - dt);
      e.fx.magnet = Math.max(0, e.fx.magnet - dt);
      e.fx.jetpack = Math.max(0, e.fx.jetpack - dt);
      e.fx.boost = Math.max(0, e.fx.boost - dt);
      e.fx.double = Math.max(0, e.fx.double - dt);
      if (e.duckTimer > 0) { e.duckTimer -= dt; if (e.duckTimer <= 0) e.ducking = false; }
    }

    // Character transform
    if (charRef.current) {
      const targetX = LANES[e.lane];
      charRef.current.position.x = THREE.MathUtils.damp(charRef.current.position.x, targetX, 14, dt);
      e.charX = charRef.current.position.x;
      if (!e.paused) {
        if (e.fx.jetpack > 0) {
          e.charY = THREE.MathUtils.damp(e.charY, 2.4, 6, dt); e.jumping = false; e.vy = 0;
        } else if (e.jumping) {
          e.vy -= 22 * dt; e.charY += e.vy * dt;
          if (e.charY <= 0) { e.charY = 0; e.jumping = false; e.vy = 0; }
        } else {
          e.charY = THREE.MathUtils.damp(e.charY, 0, 12, dt);
        }
      }
      charRef.current.position.y = e.charY;
      const squashY = e.ducking ? 0.5 : 1;
      const pulse = (e.invincible > 0 || e.fx.boost > 0) ? Math.sin(t * 30) * 0.05 : 0;
      charRef.current.scale.set(0.95 + pulse, (0.95 + pulse) * squashY, 0.95 + pulse);
    }

    if (e.paused) return;

    // Speed (boost ramps it up)
    const baseSpeed = Math.min(26, 12 + e.distance * 0.02);
    e.speed = baseSpeed * (e.fx.boost > 0 ? 1.7 : 1);
    const move = e.speed * dt;
    e.distance += move;

    // checkpoint countdown (seconds to next checkpoint)
    const secsToCp = (e.nextCheckpoint - e.distance) / Math.max(1, e.speed);
    e.cpCountdown = (secsToCp > 0 && secsToCp <= 5.4) ? Math.ceil(secsToCp) : 0;


    // spawn
    e.spawnTimer -= dt;
    if (e.spawnTimer <= 0) {
      e.spawnTimer = Math.max(0.75, 1.25 - e.distance * 0.0005);
      e.spawnRow();
    }

    // move + collide (x-based, supports crossing & oncoming objects)
    const px = (e.charX != null) ? e.charX : LANES[e.lane];
    for (let i = e.items.length - 1; i >= 0; i--) {
      const it = e.items[i];
      it.z += move + (it.extraSpeed ? it.extraSpeed * dt : 0);
      if (it.behavior === 'cross') {
        it.x += it.vx * dt;
        if (it.x > 2.6 || it.x < -2.6) it.vx *= -1;
      }
      if (it.type === 'coin' && e.fx.magnet > 0 && it.z > -12) {
        it.x = THREE.MathUtils.damp(it.x, px, 8, dt);
        it.y = THREE.MathUtils.damp(it.y, 0.6, 8, dt);
      }
      const ix = (it.x != null) ? it.x : LANES[it.lane];
      const near = it.z > RUN_Z - 0.7 && it.z < RUN_Z + 0.85;
      const hitX = Math.abs(ix - px) < 0.8;
      // Pedestrians/animals call out a greeting as they pass near you (not a hit)
      if (!it.greeted && it.behavior === 'cross' && it.z > RUN_Z - 1.5 && it.z < RUN_Z + 2) {
        it.greeted = true;
        if (Math.random() < 0.55) {
          const fast = e.speed > 18;
          speakPedestrian(fast ? 'fast' : (Math.random() < 0.4 ? 'cheer' : 'neutral'));
        }
      }
      if (!it.dead && near && hitX) {
        if (it.type === 'coin') {
          if (it.y < 1.1 || e.charY > 0.5) { it.dead = true; e.onCoin(); }
        } else if (it.type === 'teleporter') {
          it.dead = true; e.onTeleport();
        } else if (it.type === 'powerup') {
          it.dead = true; e.onPowerup(it.power);
        } else if (it.type === 'obstacle') {
          const safe = e.invincible > 0 || e.fx.jetpack > 0 || e.fx.boost > 0;
          const clears = it.overhead ? e.ducking : (e.charY > 0.85);
          if (!safe && !clears) { it.dead = true; e.onHit(it.kind); }
        }
      }
      const mesh = itemGroupRef.current && itemGroupRef.current.children.find(c => c.userData.id === it.id);
      if (mesh) {
        mesh.position.set(ix, it.type === 'obstacle' ? 0 : it.y, it.z);
        if (it.type === 'coin') mesh.rotation.y += dt * 4;
        if (it.type === 'teleporter') mesh.rotation.z += dt * 2;
        if (it.type === 'powerup') mesh.rotation.y += dt * 2.5;
      }
      if (it.z > DESPAWN_Z || it.dead) { e.items.splice(i, 1); e.removed = true; }
    }
    e.tick();
  });

  const laneX = (l) => LANES[l];
  const items = engine.current.items;

  return (
    <group>
      <StaticWorld sceneRef={sceneRef} engine={engine} />

      {/* Character (faces -z because Hero3D walk rotates to face its forward) */}
      <group ref={charRef} position={[0, 0, RUN_Z]}>
        <Hero3D features={features} isWalking={!engine.current.paused} scale={0.85} position={[0, 0, 0]} petColor={petColor} petAccessory={petAccessory} />
        {engine.current.shields > 0 && (
          <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.9, 20, 20]} /><meshStandardMaterial color="#38bdf8" transparent opacity={0.18} emissive="#0ea5e9" emissiveIntensity={0.4} /></mesh>
        )}
      </group>

      {/* Items */}
      <group ref={itemGroupRef}>
        {items.map((it) => {
          const ix = (it.x != null) ? it.x : laneX(it.lane);
          if (it.type === 'coin') {
            return (
              <mesh key={it.id} userData={{ id: it.id }} position={[ix, it.y, it.z]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.28, 0.28, 0.07, 18]} />
                <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} metalness={0.7} roughness={0.2} />
              </mesh>
            );
          }
          if (it.type === 'teleporter') {
            return (
              <group key={it.id} userData={{ id: it.id }} position={[ix, 1.1, it.z]}>
                <mesh><torusGeometry args={[0.7, 0.14, 14, 28]} /><meshStandardMaterial color="#a855f7" emissive="#c084fc" emissiveIntensity={1.3} /></mesh>
                <mesh><circleGeometry args={[0.6, 24]} /><meshBasicMaterial color="#7c3aed" transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
                <mesh><torusGeometry args={[0.42, 0.06, 10, 24]} /><meshStandardMaterial color="#e9d5ff" emissive="#d8b4fe" emissiveIntensity={1.1} /></mesh>
              </group>
            );
          }
          if (it.type === 'powerup') {
            return (
              <group key={it.id} userData={{ id: it.id }} position={[ix, it.y, it.z]}>
                <mesh><sphereGeometry args={[0.42, 16, 16]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.12} emissive="#ffffff" emissiveIntensity={0.3} /></mesh>
                <PowerupIcon power={it.power} />
              </group>
            );
          }
          // obstacle actor (car / bike / bicycle / pedestrian / animal / barrier / overhead gate)
          return (
            <group key={it.id} userData={{ id: it.id }} position={[ix, 0, it.z]}>
              <ObstacleActor kind={it.kind || 'barrier'} color={it.color || '#ef4444'} overhead={it.overhead} />
            </group>
          );
        })}
      </group>
    </group>
  );
}

/* ---------------- Orchestrator ---------------- */
export default function RunnerGame({ onExit, onEarnReward, features = [], unlockedFeatures = [], petColor = 'blue', petAccessory = 'none', level = 1 }) {
  const [, force] = useState(0);
  const [phase, setPhase] = useState('intro'); // intro, run, puzzle, dead, done, checkpoint, celebrate
  const [celebrateCount, setCelebrateCount] = useState(0);
  const [hud, setHud] = useState({ coins: 0, distance: 0, shields: 0 });
  const [puzzle, setPuzzle] = useState(null); // { reason: 'teleporter' | 'revive' }
  const earnedRef = useRef([]); // feature idxs earned this run

  // Pick a locked feature to award (fallback: any)
  const pickReward = useCallback(() => {
    const locked = FEATURE_NAMES.map((_, i) => i).filter(i => !unlockedFeatures.includes(i) && !earnedRef.current.includes(i));
    const pool = locked.length ? locked : FEATURE_NAMES.map((_, i) => i);
    return pool[Math.floor(Math.random() * pool.length)];
  }, [unlockedFeatures]);

  const [lastReward, setLastReward] = useState(null);

  // Imperative engine shared with the R3F scene
  const engine = useRef(null);
  if (!engine.current) {
    engine.current = {
      lane: 1, charX: 0, charY: 0, vy: 0, jumping: false, ducking: false, duckTimer: 0,
      speed: 12, distance: 0, coins: 0, shields: 0, invincible: 0,
      fx: { magnet: 0, jetpack: 0, boost: 0, double: 0 },
      paused: true, items: [], spawnTimer: 0.6, removed: false,
      lastTeleDist: -200, lastPowerDist: -120,
      checkpointCount: 0, nextCheckpoint: 900, checkpointActive: false, checkpointDist: 0,
      cpCountdown: 0, graceUntil: 60, _hudClock: 0,
      spawnRow() {
        const e = engine.current;
        e.removed = true; // item set changed -> trigger a render
        // Grace road: right after a checkpoint / start, only coins
        if (e.distance < e.graceUntil) {
          const lane = Math.floor(Math.random() * 3);
          for (let k = 0; k < 3; k++) e.items.push({ id: Math.random(), type: 'coin', lane, x: LANES[lane], y: 0.6, z: SPAWN_Z - k * 1.4 });
          return;
        }
        const roll = Math.random();
        const canTele = (e.distance - e.lastTeleDist) > 230;
        const canPower = (e.distance - e.lastPowerDist) > 110;
        if (canTele && roll < 0.09) {
          const lane = Math.floor(Math.random() * 3);
          e.items.push({ id: Math.random(), type: 'teleporter', lane, x: LANES[lane], y: 1.1, z: SPAWN_Z });
          e.lastTeleDist = e.distance;
        } else if (canPower && roll < 0.22) {
          // floating power-up pickup
          const POWERS = ['magnet', 'jetpack', 'boost', 'double', 'shield'];
          const power = POWERS[Math.floor(Math.random() * POWERS.length)];
          const lane = Math.floor(Math.random() * 3);
          e.items.push({ id: Math.random(), type: 'powerup', power, lane, x: LANES[lane], y: 1.0, z: SPAWN_Z });
          e.lastPowerDist = e.distance;
        } else {
          const lanes = [0, 1, 2];
          const blocked = Math.random() < 0.78 ? 1 : 2;
          for (let b = 0; b < blocked; b++) {
            const idx = Math.floor(Math.random() * lanes.length);
            const ln = lanes.splice(idx, 1)[0];
            const kind = OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)];
            const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
            const it = { id: Math.random(), type: 'obstacle', kind, color, lane: ln, x: LANES[ln], y: 0, z: SPAWN_Z };
            if ((kind === 'car' || kind === 'bike' || kind === 'bicycle') && Math.random() < 0.5) {
              it.behavior = 'oncoming'; it.extraSpeed = 6 + Math.random() * 6; // drives toward player
            } else if ((kind === 'pedestrian' || kind === 'animal') && Math.random() < 0.6) {
              it.behavior = 'cross'; it.vx = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.4); // crosses the street
            } else if (kind === 'barrier' && Math.random() < 0.45) {
              it.overhead = true; // must DUCK under
            }
            e.items.push(it);
          }
          const coinLane = lanes.length ? lanes[Math.floor(Math.random() * lanes.length)] : Math.floor(Math.random() * 3);
          const high = Math.random() < 0.3;
          for (let k = 0; k < 3; k++) e.items.push({ id: Math.random(), type: 'coin', lane: coinLane, x: LANES[coinLane], y: high ? 1.4 : 0.6, z: SPAWN_Z - k * 1.4 });
        }
      },
      onCoin() { engine.current.coins += (engine.current.fx.double > 0 ? 2 : 1); playCoinPitch(); },
      onPowerup(power) {
        const e = engine.current;
        playPowerup(power);
        const names = { magnet: '🧲 Coin Magnet!', jetpack: '🚀 Jetpack!', boost: '⚡ Speed Boost!', double: '✨ Double Coins!', shield: '🛡️ Shield!' };
        if (power === 'magnet') e.fx.magnet = 8;
        else if (power === 'jetpack') { e.fx.jetpack = 6; e.invincible = Math.max(e.invincible, 6); }
        else if (power === 'boost') { e.fx.boost = 4.5; e.invincible = Math.max(e.invincible, 4.5); }
        else if (power === 'double') e.fx.double = 10;
        else if (power === 'shield') e.shields += 1;
        setLastReward({ idx: -1, name: names[power] });
        setTimeout(() => setLastReward(null), 1800);
        setHud({ coins: e.coins, distance: Math.floor(e.distance), shields: e.shields, magnet: Math.ceil(e.fx.magnet), jetpack: Math.ceil(e.fx.jetpack), boost: Math.ceil(e.fx.boost), double: Math.ceil(e.fx.double), countdown: e.cpCountdown });
      },
      onTeleport() {
        engine.current.paused = true;
        playSound('chime');
        setPuzzle({ reason: 'teleporter', timeLimit: Math.random() < 0.5 ? 8 : 0 });
        setPhase('puzzle');
      },
      onHit(cause) {
        const e = engine.current;
        if (e.invincible > 0 || e.fx.jetpack > 0 || e.fx.boost > 0) return;
        playCrash(cause);
        if (e.shields > 0) { e.shields -= 1; e.invincible = 1.5; return; }
        // Checkpoint twist: send the player back to the last checkpoint, and consume it
        if (e.checkpointActive) {
          e.checkpointActive = false;
          e.distance = e.checkpointDist;
          e.items = e.items.filter(it => it.type !== 'obstacle');
          e.invincible = 2.5;
          e.graceUntil = e.distance + 120;
          playSound('whoosh');
          setLastReward({ idx: -1, name: '🏁 Back to Checkpoint! (used up — secure another!)' });
          setTimeout(() => setLastReward(null), 2400);
          setHud({ coins: e.coins, distance: Math.floor(e.distance), shields: e.shields, magnet: Math.ceil(e.fx.magnet), jetpack: Math.ceil(e.fx.jetpack), boost: Math.ceil(e.fx.boost), double: Math.ceil(e.fx.double), countdown: 0 });
          return;
        }
        e.paused = true;
        setPhase('dead');
      },
      tick() {
        const e = engine.current;
        if (!e.paused && e.distance >= e.nextCheckpoint) {
          e.paused = true;
          playSound('chime');
          setPhase('checkpoint');
        }
        e._hudClock += 1;
        if (e._hudClock % 6 === 0) {
          setHud({ coins: e.coins, distance: Math.floor(e.distance), shields: e.shields, magnet: Math.ceil(e.fx.magnet), jetpack: Math.ceil(e.fx.jetpack), boost: Math.ceil(e.fx.boost), double: Math.ceil(e.fx.double), countdown: e.cpCountdown });
        } else if (e.removed) {
          force(n => n + 1);
        }
        e.removed = false;
      },
    };
  }

  // Any transition (start, resume, revive, checkpoint) clears ALL obstacles + grants
  // a 2s invincibility + a short blank road so the player can never crash on resume.
  const clearForTransition = (graceMeters = 120, invSec = 2.0) => {
    const e = engine.current;
    e.items = e.items.filter(it => it.type !== 'obstacle');
    e.invincible = invSec;
    e.graceUntil = e.distance + graceMeters;
  };

  const startRun = () => { clearForTransition(80, 2.0); engine.current.paused = false; startBackgroundMusic(); setPhase('run'); };

  // controls
  const setLane = (dir) => {
    const e = engine.current;
    if (e.paused) return;
    e.lane = Math.max(0, Math.min(2, e.lane + dir));
  };
  const jump = () => {
    const e = engine.current;
    if (e.paused || e.jumping) return;
    e.jumping = true; e.vy = 9; e.ducking = false; e.duckTimer = 0; playSound('whoosh');
  };
  const duck = () => {
    const e = engine.current;
    if (e.paused || e.jumping) return;
    e.ducking = true; e.duckTimer = 0.8; playSound('whoosh');
  };

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'ArrowLeft') setLane(-1);
      else if (ev.key === 'ArrowRight') setLane(1);
      else if (ev.key === 'ArrowUp' || ev.key === ' ') { ev.preventDefault(); jump(); }
      else if (ev.key === 'ArrowDown') { ev.preventDefault(); duck(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Stop the music when the runner unmounts (leaving the view)
  useEffect(() => () => stopBackgroundMusic(), []);

  // puzzle outcomes
  const solveTeleporter = () => {
    const e = engine.current;
    e.coins += 10;
    e.shields += 1;
    const idx = pickReward();
    earnedRef.current.push(idx);
    setLastReward({ idx, name: FEATURE_NAMES[idx] });
    clearForTransition(120, 2.0);
    setPuzzle(null);
    setPhase('run');
    e.paused = false;
    setHud({ coins: e.coins, distance: Math.floor(e.distance), shields: e.shields });
    setTimeout(() => setLastReward(null), 2200);
  };
  const failTeleporter = () => {
    const e = engine.current;
    clearForTransition(120, 2.0);
    setPuzzle(null);
    setPhase('run');
    e.paused = false;
  };

  const revive = () => {
    const e = engine.current;
    clearForTransition(140, 2.2);
    e.shields += 1;
    setPuzzle(null);
    setPhase('run');
    e.paused = false;
  };

  // Hitting a red block -> puzzle event. Solve to keep running.
  const surviveSolve = () => {
    const e = engine.current;
    clearForTransition(120, 2.2);
    playSound('powerup');
    setPuzzle(null);
    setPhase('run');
    e.paused = false;
    setHud({ coins: e.coins, distance: Math.floor(e.distance), shields: e.shields });
  };
  const surviveFail = () => {
    setPuzzle(null);
    playSound('sad');
    setPhase('dead');
  };

  const endRun = () => {
    const e = engine.current;
    onEarnReward(e.coins, earnedRef.current);
    stopBackgroundMusic();
    setPhase('done');
  };

  const startReviveQuiz = () => { setPuzzle({ reason: 'revive' }); setPhase('puzzle'); };

  // Run again from scratch (reset engine)
  const runAgain = () => {
    const e = engine.current;
    e.lane = 1; e.charX = 0; e.charY = 0; e.vy = 0; e.jumping = false; e.ducking = false; e.duckTimer = 0;
    e.speed = 12; e.distance = 0; e.coins = 0; e.shields = 0; e.invincible = 0;
    e.fx = { magnet: 0, jetpack: 0, boost: 0, double: 0 };
    e.items = []; e.spawnTimer = 0.6; e.removed = false;
    e.lastTeleDist = -200; e.lastPowerDist = -120;
    e.checkpointCount = 0; e.nextCheckpoint = 900; e.checkpointActive = false; e.checkpointDist = 0;
    e.cpCountdown = 0; e.graceUntil = 60;
    e.paused = true;
    earnedRef.current = [];
    setHud({ coins: 0, distance: 0, shields: 0 });
    setLastReward(null);
    setPuzzle(null);
    setPhase('intro');
  };

  // Checkpoint: cross one of the 8 unique math levels, then celebrate + countdown back to running
  const tierBase = (level - 1) * 8;
  const cpStage = tierBase + ((engine.current.checkpointCount % 8) + 1);
  const onCheckpointCleared = () => {
    const e = engine.current;
    e.checkpointCount += 1;
    e.nextCheckpoint = e.distance + 900;
    e.coins += 20;
    e.shields += 1;
    // Secure the checkpoint: one free respawn back to here on the next crash
    e.checkpointActive = true;
    e.checkpointDist = e.distance;
    e.paused = true;
    playSound('chime');
    setHud({ coins: e.coins, distance: Math.floor(e.distance), shields: e.shields });
    setCelebrateCount(5);
    setPhase('celebrate');
  };

  // Celebration countdown: after securing a checkpoint, count 5..1 then resume running
  useEffect(() => {
    if (phase !== 'celebrate') return;
    let n = 5;
    setCelebrateCount(5);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        const e = engine.current;
        clearForTransition(140, 2.4);
        e.paused = false;
        setCelebrateCount(0);
        setPhase('run');
      } else {
        setCelebrateCount(n);
        playSound('pop');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const e = engine.current;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0b1026', overflow: 'hidden' }}>
      {/* Runner canvas stays mounted the whole session (no context churn);
          paused (frameloop=never) while the checkpoint level is on top. */}
      <Canvas
        shadows
        frameloop={phase === 'checkpoint' ? 'never' : 'always'}
        camera={{ position: [0, 3.2, 6.5], fov: 60 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (ev) => ev.preventDefault(), false);
        }}
      >
        <RunnerScene engine={engine} features={features} petColor={petColor} petAccessory={petAccessory} />
      </Canvas>

      {/* CHECKPOINT: cross one of the 8 unique math levels (overlay on top) */}
      {phase === 'checkpoint' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 60, background: '#0b1026' }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', zIndex: 70, pointerEvents: 'none' }}>
            <span style={{ background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'white', fontFamily: "'Fredoka',sans-serif", fontWeight: 900, padding: '8px 20px', borderRadius: 999, fontSize: '1.1rem', boxShadow: '0 6px 20px rgba(124,58,237,0.5)' }}>
              🏁 CHECKPOINT — Cross the Level to Continue!
            </span>
          </div>
          <MathQuest3D
            key={`cp-${engine.current.checkpointCount}`}
            stageNum={cpStage}
            features={features}
            petColor={petColor}
            petAccessory={petAccessory}
            checkpointMode
            onLevelComplete={onCheckpointCleared}
            soundEnabled
          />
        </div>
      )}

      {/* CELEBRATE: checkpoint saved + countdown back to running */}
      {phase === 'celebrate' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 65, background: 'rgba(15,23,42,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka',sans-serif", pointerEvents: 'none' }}>
          <div style={{ fontSize: '4rem' }}>🎉🏁🎉</div>
          <div style={{ color: '#fde047', fontWeight: 900, fontSize: '2rem', textShadow: '0 3px 8px rgba(0,0,0,0.5)' }}>Checkpoint Saved!</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginTop: 6, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>+20 🪙 &nbsp; +1 🛡️ &nbsp; Safe spot secured!</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginTop: 18, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>Back to the run in…</div>
          <div style={{ marginTop: 8, width: 110, height: 110, lineHeight: '110px', textAlign: 'center', borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: '5px solid #fff', color: '#fff', fontWeight: 900, fontSize: '3.6rem', boxShadow: '0 10px 30px rgba(22,163,74,0.6)' }}>
            {celebrateCount}
          </div>
        </div>
      )}

      {/* HUD */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontFamily: "'Fredoka', sans-serif", pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: '70%' }}>
          <span style={{ background: '#fef08a', border: '3px solid #eab308', color: '#854d0e', fontWeight: 900, padding: '6px 14px', borderRadius: 999 }}>🪙 {hud.coins}</span>
          <span style={{ background: '#dbeafe', border: '3px solid #3b82f6', color: '#1e3a8a', fontWeight: 900, padding: '6px 14px', borderRadius: 999 }}>🏁 {hud.distance}m</span>
          {hud.shields > 0 && <span style={{ background: '#cffafe', border: '3px solid #06b6d4', color: '#155e75', fontWeight: 900, padding: '6px 14px', borderRadius: 999 }}>🛡️ {hud.shields}</span>}
          {e.checkpointActive && <span style={{ background: '#dcfce7', border: '3px solid #22c55e', color: '#166534', fontWeight: 900, padding: '6px 14px', borderRadius: 999 }}>🏁 Checkpoint ✓</span>}
          {hud.magnet > 0 && <span style={{ background: '#fee2e2', border: '3px solid #ef4444', color: '#991b1b', fontWeight: 900, padding: '6px 12px', borderRadius: 999 }}>🧲 {hud.magnet}</span>}
          {hud.jetpack > 0 && <span style={{ background: '#e0f2fe', border: '3px solid #0ea5e9', color: '#075985', fontWeight: 900, padding: '6px 12px', borderRadius: 999 }}>🚀 {hud.jetpack}</span>}
          {hud.boost > 0 && <span style={{ background: '#fef9c3', border: '3px solid #eab308', color: '#854d0e', fontWeight: 900, padding: '6px 12px', borderRadius: 999 }}>⚡ {hud.boost}</span>}
          {hud.double > 0 && <span style={{ background: '#fef3c7', border: '3px solid #f59e0b', color: '#92400e', fontWeight: 900, padding: '6px 12px', borderRadius: 999 }}>✨2x {hud.double}</span>}
        </div>
        <button onClick={endRun} style={{ pointerEvents: 'auto', background: '#ef4444', color: 'white', border: '3px solid #b91c1c', borderRadius: 999, fontWeight: 900, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>✕ End Run</button>
      </div>

      {/* Checkpoint countdown */}
      {phase === 'run' && hud.countdown > 0 && (
        <div style={{ position: 'absolute', top: '24%', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', fontFamily: "'Fredoka',sans-serif" }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '0.95rem', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>CHECKPOINT IN</div>
          <div style={{ display: 'inline-block', marginTop: 6, width: 90, height: 90, lineHeight: '90px', borderRadius: '50%', background: 'rgba(168,85,247,0.85)', border: '4px solid #fff', color: '#fff', fontWeight: 900, fontSize: '3rem', boxShadow: '0 8px 24px rgba(124,58,237,0.5)' }}>{hud.countdown}</div>
        </div>
      )}

      {/* On-screen controls */}
      {phase === 'run' && (
        <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12, pointerEvents: 'none', flexWrap: 'wrap' }}>
          <button onClick={() => setLane(-1)} style={ctrlBtn}>⬅️</button>
          <button onClick={jump} style={{ ...ctrlBtn, background: '#22c55e', borderColor: '#16a34a', boxShadow: '0 5px 0 #15803d' }}>⬆️ Jump</button>
          <button onClick={duck} style={{ ...ctrlBtn, background: '#f59e0b', borderColor: '#d97706', boxShadow: '0 5px 0 #b45309' }}>⬇️ Slide</button>
          <button onClick={() => setLane(1)} style={ctrlBtn}>➡️</button>
        </div>
      )}

      {/* Reward toast */}
      {lastReward && (
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'white', padding: '14px 22px', borderRadius: 18, fontFamily: "'Fredoka',sans-serif", fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(124,58,237,0.5)', textAlign: 'center' }}>
          {lastReward.idx === -1 ? (
            <span style={{ fontSize: '1.2rem' }}>{lastReward.name}</span>
          ) : (
            <>⚡ Power-Up Earned!<br /><span style={{ fontSize: '1.3rem' }}>{lastReward.name}</span><br /><span style={{ fontSize: '0.9rem', opacity: 0.9 }}>+10 🪙 & a 🛡️ Shield</span></>
          )}
        </div>
      )}

      {/* Intro */}
      {phase === 'intro' && (
        <Overlay>
          <h2 style={{ color: '#a855f7', fontWeight: 900, fontSize: '1.8rem', margin: '0 0 6px' }}>🚪 You opened the door!</h2>
          <p style={{ color: '#475569', fontWeight: 700, margin: '0 0 16px' }}>Dodge cars, bikes & animals, grab coins, and snag floating <b>power-ups</b> (🧲 magnet, 🚀 jetpack, ⚡ boost, ✨ 2x, 🛡️ shield)! <b>⬅️ ➡️</b> switch lanes, <b>⬆️/Space</b> jump, <b>⬇️</b> slide under gates. Purple <b>teleporters</b> = bonus puzzles. Cross 🏁 <b>checkpoints</b> to save your spot!</p>
          <button onClick={startRun} style={bigBtn}>🏃 Start Running!</button>
        </Overlay>
      )}

      {/* Death */}
      {phase === 'dead' && (
        <Overlay>
          <h2 style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.8rem', margin: '0 0 6px' }}>💥 Crash!</h2>
          <p style={{ color: '#475569', fontWeight: 700, margin: '0 0 16px' }}>Solve one puzzle to keep running, or finish your run.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={startReviveQuiz} style={bigBtn}>🧠 Solve to Continue</button>
            <button onClick={endRun} style={{ ...bigBtn, background: '#64748b', boxShadow: '0 5px 0 #475569' }}>🏁 Finish Run</button>
            <button onClick={onExit} style={{ ...bigBtn, background: '#3b82f6', boxShadow: '0 5px 0 #2563eb' }}>🏠 Home</button>
          </div>
        </Overlay>
      )}

      {/* Done */}
      {phase === 'done' && (
        <Overlay>
          <h2 style={{ color: '#16a34a', fontWeight: 900, fontSize: '1.8rem', margin: '0 0 6px' }}>🏁 Run Complete!</h2>
          <p style={{ color: '#475569', fontWeight: 700, margin: '0 0 6px' }}>You ran <b>{Math.floor(e.distance)}m</b> and collected <b>{e.coins}</b> 🪙</p>
          {earnedRef.current.length > 0 && (
            <p style={{ color: '#7c3aed', fontWeight: 800, margin: '0 0 16px' }}>⚡ Power-ups won: {earnedRef.current.map(i => FEATURE_NAMES[i]).join(', ')}</p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onExit} style={bigBtn}>🏠 Go Home</button>
            <button onClick={runAgain} style={{ ...bigBtn, background: '#22c55e', boxShadow: '0 5px 0 #16a34a' }}>🏃 Run Again</button>
          </div>
        </Overlay>
      )}

      {/* Puzzle modal */}
      {puzzle && puzzle.reason === 'teleporter' && (
        <QuizModal title="🌀 Teleporter Puzzle!" subtitle={puzzle.timeLimit ? 'Quick! Beat the clock for a power-up!' : 'Solve it to win a power-up!'} level={level} accent="#a855f7" timeLimit={puzzle.timeLimit || 0} onSolved={solveTeleporter} onFailed={failTeleporter} />
      )}
      {puzzle && puzzle.reason === 'revive' && (
        <QuizModal title="🧠 Keep Running!" subtitle="Get it right to revive!" level={level} accent="#22c55e" onSolved={revive} onFailed={endRun} />
      )}
      {puzzle && puzzle.reason === 'survive' && (
        <QuizModal title="💥 Blocked! Solve to Pass!" subtitle={puzzle.timeLimit ? 'Quick! Beat the clock!' : 'Answer to smash through!'} level={level} accent="#f97316" timeLimit={puzzle.timeLimit || 0} onSolved={surviveSolve} onFailed={surviveFail} />
      )}
    </div>
  );
}

const ctrlBtn = { pointerEvents: 'auto', width: 84, height: 64, fontSize: '1.4rem', fontWeight: 900, borderRadius: 18, border: '3px solid #2563eb', background: '#3b82f6', color: 'white', cursor: 'pointer', fontFamily: "'Fredoka',sans-serif", boxShadow: '0 5px 0 #1d4ed8' };
const bigBtn = { fontFamily: "'Fredoka',sans-serif", fontSize: '1.2rem', fontWeight: 900, padding: '14px 26px', borderRadius: 18, border: 'none', background: '#a855f7', color: 'white', cursor: 'pointer', boxShadow: '0 5px 0 #7c3aed', minHeight: 56 };

function Overlay({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 28, padding: '28px', width: '90%', maxWidth: 480, textAlign: 'center', fontFamily: "'Fredoka',sans-serif", boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>
        {children}
      </div>
    </div>
  );
}
