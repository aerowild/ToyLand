// src/components/Hero3D.jsx - Cute orange/silver mascot robot with animated gear
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Outlines } from '@react-three/drei';
import * as THREE from 'three';

const damp = THREE.MathUtils.damp;

/* ============================ ANIMATED EFFECTS ============================ */

// Flickering glowing fire (boots, jetpack, sword, fire aura)
function FlameEffect({ scale = 1, up = false }) {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const g = ref.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const f = 0.6 + Math.abs(Math.sin(t * 14 + i * 1.7)) * 0.7;
      c.scale.set(0.8 + Math.sin(t * 18 + i) * 0.2, f, 0.8 + Math.cos(t * 16 + i) * 0.2);
    });
  });
  const rot = up ? [0, 0, 0] : [Math.PI, 0, 0];
  const s = up ? 1 : -1;
  return (
    <group ref={ref} scale={scale}>
      <mesh position={[0, s * 0.16, 0]} rotation={rot}><coneGeometry args={[0.09, 0.34, 12]} /><meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={1.4} transparent opacity={0.8} /></mesh>
      <mesh position={[0, s * 0.12, 0]} rotation={rot}><coneGeometry args={[0.06, 0.24, 12]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.6} transparent opacity={0.9} /></mesh>
      <mesh position={[0, s * 0.08, 0]} rotation={rot}><coneGeometry args={[0.03, 0.14, 12]} /><meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={1.8} transparent opacity={0.95} /></mesh>
    </group>
  );
}

// Glowing ice crystals (ice shield, frost aura) - shimmering cold blue
function FrostEffect({ scale = 1 }) {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const g = ref.current;
    if (!g) return;
    g.rotation.y = t * 0.7;
    g.children.forEach((c, i) => {
      if (c.material) c.material.emissiveIntensity = 0.6 + Math.sin(t * 3 + i * 1.5) * 0.45;
      c.position.y = (c.userData.baseY || 0) + Math.sin(t * 2 + i) * 0.02;
    });
  });
  const crystals = [[0.18, 0.05, 0], [-0.18, 0.0, 0], [0, 0.05, 0.18], [0, -0.02, -0.18], [0.12, 0.12, 0.12]];
  return (
    <group ref={ref} scale={scale}>
      {crystals.map((p, i) => (
        <mesh key={i} position={p} rotation={[i, i * 0.7, 0]} userData={{ baseY: p[1] }}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#cffafe" emissive="#67e8f9" emissiveIntensity={0.8} metalness={0.3} roughness={0.1} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

// Electric sparks (thunder fists, lightning aura)
function SparkEffect({ scale = 1, color = '#fde047' }) {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const g = ref.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const on = Math.sin(t * 22 + i * 2.1) > 0;
      c.visible = on;
      c.rotation.z = t * (4 + i);
    });
  });
  return (
    <group ref={ref} scale={scale}>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.015, 0.12, 0.015]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} />
          </mesh>
        );
      })}
    </group>
  );
}

// Force Field: 3 small energy orbs orbiting the shimmering bubble on independent paths —
// makes the shield read as an active power, not just a static translucent ball.
function ForceFieldOrbs() {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (!ref.current) return;
    ref.current.children.forEach((orb, i) => {
      const speed = 1.1 + i * 0.35;
      const r = 0.78;
      const a = t * speed + i * (Math.PI * 2 / 3);
      orb.position.set(Math.cos(a) * r, 0.6 + Math.sin(t * 1.5 + i) * 0.18, Math.sin(a) * r);
    });
  });
  return (
    <group ref={ref}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={1.4} /></mesh>
      ))}
    </group>
  );
}

// Generic "powered on" pulse: wraps any gadget mesh/group and animates emissive glow +
// a subtle scale breathe, so equipped gear reads as ACTIVE rather than static plastic.
function PulseGlow({ children, speed = 2.6, minI = 0.5, maxI = 1.3, scaleAmt = 0.06, phase = 0 }) {
  const ref = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime * speed + phase;
    const g = ref.current;
    if (!g) return;
    const k = (Math.sin(t) + 1) / 2; // 0..1
    const sc = 1 + Math.sin(t) * scaleAmt;
    g.scale.set(sc, sc, sc);
    g.traverse((o) => { if (o.material && 'emissiveIntensity' in o.material) o.material.emissiveIntensity = minI + k * (maxI - minI); });
  });
  return <group ref={ref}>{children}</group>;
}

// Brain Crown: slowly rotates (like a thinking-cap halo) while its 5 gems softly pulse.
function BrainCrownAnim({ children }) {
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.6; });
  return (
    <group ref={ref} position={[-0.03, 0.27, 0]}>
      <PulseGlow speed={1.8} minI={0.6} maxI={1.2} scaleAmt={0}>{children}</PulseGlow>
    </group>
  );
}

// Scanner Light: the lamp head sweeps side to side like an active radar scanner, beam pulses.
function ScannerLightAnim() {
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.6) * 0.35; });
  return (
    <group ref={ref} position={[0.04, 0.06, 0.06]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.05, 0.12, 12]} /><meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} /></mesh>
      <PulseGlow speed={4} minI={0.9} maxI={1.7} scaleAmt={0.04}>
        <mesh position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.3} /></mesh>
        <mesh position={[0.22, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.1, 0.28, 16, 1, true]} /><meshStandardMaterial color="#fef9c3" emissive="#fde047" emissiveIntensity={0.6} transparent opacity={0.3} side={THREE.DoubleSide} /></mesh>
      </PulseGlow>
    </group>
  );
}

// Star Core: the two overlapping 5-point stars spin against each other + pulse — reads as
// a spinning power core, not a flat sticker.
function StarCoreAnim() {
  const aRef = useRef(); const bRef = useRef();
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (aRef.current) aRef.current.rotation.x = t * 1.4;
    if (bRef.current) bRef.current.rotation.x = -t * 1.1;
  });
  return (
    <group position={[0.24, 0.6, 0]}>
      <PulseGlow speed={3} minI={1.0} maxI={2.0} scaleAmt={0.08}>
        <mesh ref={aRef} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.14, 0.14, 0.04, 5]} /><meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={1.5} /></mesh>
        <mesh ref={bRef} rotation={[0, Math.PI / 2, Math.PI / 5]}><cylinderGeometry args={[0.14, 0.14, 0.035, 5]} /><meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={1.5} /></mesh>
      </PulseGlow>
    </group>
  );
}

// Aura — realistic, distinct per kind (fire flames, lightning bolts, ice crystals, energy ring)
function AuraEffect({ kind }) {
  const ref = useRef();
  const orbsRef = useRef([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y = t * (kind === 'frost' ? 0.6 : kind === 'lightning' ? 1.8 : 1.2);
    orbsRef.current.forEach((o, i) => {
      if (o) o.scale.setScalar(0.8 + Math.sin(t * 5 + i * 1.5) * 0.3);
    });
  });

  // FIRE: a ring of rising, flickering flames + ember band
  if (kind === 'fire') {
    return (
      <group ref={ref} position={[0, 0.18, 0]}>
        <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.52, 0.04, 10, 32]} /><meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={1.2} transparent opacity={0.7} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return <group key={i} position={[Math.sin(a) * 0.5, 0.18, Math.cos(a) * 0.5]}><FlameEffect scale={1.0} up /></group>;
        })}
      </group>
    );
  }

  // LIGHTNING: crackling sparks + flickering jagged bolts + fast rings
  if (kind === 'lightning') {
    return (
      <group ref={ref} position={[0, 0.6, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.52, 0.025, 8, 28]} /><meshStandardMaterial color="#eab308" emissive="#fde047" emissiveIntensity={1.3} transparent opacity={0.7} /></mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return <group key={i} position={[Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5]} rotation={[0, -a, 0]}><SparkEffect scale={1.3} color="#fde047" /></group>;
        })}
      </group>
    );
  }

  // FROST: slow orbiting ice crystals + pale cold ring
  if (kind === 'frost') {
    return (
      <group ref={ref} position={[0, 0.6, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.52, 0.03, 10, 32]} /><meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.9} transparent opacity={0.55} /></mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return <group key={i} position={[Math.sin(a) * 0.52, Math.sin(a * 2) * 0.1, Math.cos(a) * 0.52]}><FrostEffect scale={0.7} /></group>;
        })}
      </group>
    );
  }

  // ENERGY (Glow Ring / Star Core): glowing rings + orbiting orbs
  const c1 = '#a78bfa', c2 = '#c4b5fd';
  return (
    <group ref={ref} position={[0, 0.6, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.52, 0.03, 12, 36]} /><meshStandardMaterial color={c1} emissive={c1} emissiveIntensity={1.1} transparent opacity={0.85} /></mesh>
      <mesh rotation={[Math.PI / 2.3, 0.5, 0]}><torusGeometry args={[0.48, 0.022, 10, 36]} /><meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1.1} transparent opacity={0.7} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * 0.52, 0, Math.cos(a) * 0.52]}>
            <mesh ref={(el) => (orbsRef.current[i] = el)}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color={c2} emissive={c2} emissiveIntensity={1.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ============================ MAIN CHARACTER ============================ */

export default function Hero3D({
  features = [],
  isWalking = false,
  isCelebrating = false,
  isFalling = false,
  scale = 1.0,
  petColor = 'blue',
  petAccessory = 'none',
  ...props
}) {
  const heroRef = useRef();
  const bodyRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const headRef = useRef();
  const petRef = useRef();
  const wingsRef = useRef();
  const capeRef = useRef();
  const haloRef = useRef();
  const shieldRef = useRef();

  // Gear (index matches FEATURE_NAMES)
  const hasRocketBoots  = features.includes(0);
  const hasShieldArmor  = features.includes(1);
  const hasJetWings     = features.includes(2);
  const hasGoldBelt     = features.includes(3);
  const hasPowerGloves  = features.includes(4);
  const hasLaserEyes    = features.includes(5);
  const hasTurboPack    = features.includes(6);
  const hasStarCape     = features.includes(7);
  const hasThunderFists = features.includes(8);
  const hasIceShield    = features.includes(9);
  const hasFireBlade    = features.includes(10);
  const hasTechVisor    = features.includes(11);
  const hasPetDrone     = features.includes(12);
  const hasGlowRing     = features.includes(13);
  const hasSolarWings   = features.includes(14);
  const hasScannerLight = features.includes(15);
  const hasHeavyArmor   = features.includes(16);
  const hasHoverBoots   = features.includes(17);
  const hasCoreBadge    = features.includes(18);
  const hasForceField   = features.includes(19);
  const hasArmCannon    = features.includes(20);
  const hasFloatHalo    = features.includes(21);
  const hasBrainCrown   = features.includes(22);
  const hasStarCore     = features.includes(23);

  // Shop items
  const hasRainbowCape = features.includes('cape_rainbow');
  const hasSpaceSuit   = features.includes('suit_astronaut');
  const hasGoldArmor   = features.includes('armor_gold');
  const hasLightningAura = features.includes('aura_lightning');
  const hasFireAura    = features.includes('aura_fire');
  const hasFrostAura   = features.includes('aura_frost');
  const hasPhoenixPet  = features.includes('pet_phoenix');
  const hasPandaPet    = features.includes('pet_panda');
  const hasRobotPet    = features.includes('pet_robot');

  // Palette — vivid orange body + bright silver metal + cyan accents (glossy mascot look)
  const orange = hasGoldArmor ? '#fbbf24' : hasSpaceSuit ? '#e2e8f0' : '#f97316';
  const orangeDark = hasGoldArmor ? '#d97706' : hasSpaceSuit ? '#cbd5e1' : '#ea580c';
  const silver = '#e2e8f0';
  const silverDark = '#94a3b8';
  const cyan = '#22d3ee';
  const OUTLINE = '#0b1220';

  const getPetColorHex = () =>
    petColor === 'red' ? '#ef4444' : petColor === 'green' ? '#22c55e' : petColor === 'gold' ? '#fbbf24' : '#3b82f6';
  const petColorHex = getPetColorHex();

  const anyCape = hasStarCape || hasRainbowCape;
  const anyWings = hasJetWings || hasSolarWings;
  const auraKind = hasLightningAura ? 'lightning' : hasFireAura ? 'fire' : hasFrostAura ? 'frost' : (hasGlowRing || hasStarCore) ? 'energy' : null;
  const anyPet = hasPetDrone || hasPhoenixPet || hasPandaPet || hasRobotPet;

  // --- Smooth animation ---
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const h = heroRef.current;
    if (!h) return;
    const L = 10;

    let posY = 0, rotY = Math.PI / 2, rotX = 0;
    let lArmZ = 0.16, rArmZ = -0.16;   // arm swing/raise about z (front-back)
    let lLegZ = 0, rLegZ = 0;          // leg stride about z (front-back)
    let headX = 0, headZ = 0, bodyExtraY = 0;
    let spin = false;

    if (isFalling) {
      h.rotation.y = t * 9; h.rotation.x = t * 5;
      h.position.y = damp(h.position.y, 0, L, dt);
      if (leftArmRef.current) leftArmRef.current.rotation.z = 1.4 + Math.sin(t * 22) * 0.5;
      if (rightArmRef.current) rightArmRef.current.rotation.z = -1.4 - Math.sin(t * 22) * 0.5;
      if (leftLegRef.current) leftLegRef.current.rotation.z = Math.sin(t * 18) * 0.7;
      if (rightLegRef.current) rightLegRef.current.rotation.z = -Math.sin(t * 18) * 0.7;
      return;
    } else if (isCelebrating) {
      posY = Math.abs(Math.sin(t * 6)) * 0.32;
      const wave = Math.sin(t * 14) * 0.35;
      lArmZ = 2.0 + wave; rArmZ = -2.0 - wave;
      headX = Math.sin(t * 12) * 0.12;
      h.rotation.y = t * 2.2; h.rotation.x = damp(h.rotation.x, 0, L, dt);
      spin = true;
    } else if (isWalking) {
      const sw = Math.sin(t * 9);
      posY = Math.abs(Math.sin(t * 9)) * 0.05; rotX = 0.12;
      lLegZ = sw * 0.5; rLegZ = -sw * 0.5;          // forward/back stride
      lArmZ = 0.15 - sw * 0.4; rArmZ = -0.15 + sw * 0.4; // arms swing opposite
      headX = 0.05;
    } else {
      bodyExtraY = Math.sin(t * 2) * 0.02;
      lArmZ = 0.18 + Math.sin(t * 1.6) * 0.04;
      rArmZ = -0.18 - Math.sin(t * 1.6) * 0.04;
      headX = Math.sin(t * 1.6) * 0.04; headZ = Math.sin(t * 1.2) * 0.03;
    }

    h.position.y = damp(h.position.y, posY, L, dt);
    if (!spin) {
      h.rotation.y = damp(h.rotation.y, rotY, L, dt);
      h.rotation.x = damp(h.rotation.x, rotX, L, dt);
    }
    if (bodyRef.current) bodyRef.current.position.y = damp(bodyRef.current.position.y, bodyExtraY, L, dt);
    if (headRef.current) {
      headRef.current.rotation.x = damp(headRef.current.rotation.x, headX, L, dt);
      headRef.current.rotation.z = damp(headRef.current.rotation.z, headZ, L, dt);
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = damp(leftArmRef.current.rotation.x, 0, L, dt);
      leftArmRef.current.rotation.z = damp(leftArmRef.current.rotation.z, lArmZ, L, dt);
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = damp(rightArmRef.current.rotation.x, 0, L, dt);
      rightArmRef.current.rotation.z = damp(rightArmRef.current.rotation.z, rArmZ, L, dt);
    }
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = damp(leftLegRef.current.rotation.x, 0, L, dt);
      leftLegRef.current.rotation.z = damp(leftLegRef.current.rotation.z, lLegZ, L, dt);
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = damp(rightLegRef.current.rotation.x, 0, L, dt);
      rightLegRef.current.rotation.z = damp(rightLegRef.current.rotation.z, rLegZ, L, dt);
    }

    if (anyPet && petRef.current) {
      petRef.current.position.y = 0.95 + Math.sin(t * 3.5) * 0.1;
      petRef.current.rotation.y = t * 1.5;
    }
    if (wingsRef.current) wingsRef.current.rotation.z = Math.sin(t * 4) * 0.16;
    if (capeRef.current) capeRef.current.rotation.x = -0.2 + Math.sin(t * 3 + 1) * 0.1;
    if (haloRef.current) { haloRef.current.rotation.y = t * 1.2; haloRef.current.position.y = 1.55 + Math.sin(t * 2) * 0.03; }
    if (shieldRef.current) {
      const pulse = 0.8 + Math.sin(t * 2.4) * 0.2;
      shieldRef.current.scale.set(pulse, pulse, pulse);
      shieldRef.current.rotation.y = t * 0.5;
      if (shieldRef.current.material) shieldRef.current.material.emissiveIntensity = 0.25 + Math.sin(t * 3) * 0.15;
    }
  });

  const renderPetAccessory = () => {
    if (petAccessory === 'antenna') return (
      <group position={[0, 0.12, 0]}>
        <mesh><cylinderGeometry args={[0.006, 0.006, 0.06]} /><meshStandardMaterial color="#475569" /></mesh>
        <mesh position={[0, 0.04, 0]}><sphereGeometry args={[0.018, 8, 8]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} /></mesh>
      </group>
    );
    if (petAccessory === 'visor') return <mesh position={[0.09, 0.02, 0]}><boxGeometry args={[0.03, 0.03, 0.18]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} /></mesh>;
    if (petAccessory === 'jetpack') return (
      <group position={[-0.09, 0, 0]}>
        <mesh position={[0, 0, 0.05]}><cylinderGeometry args={[0.025, 0.025, 0.09, 8]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} /></mesh>
        <mesh position={[0, 0, -0.05]}><cylinderGeometry args={[0.025, 0.025, 0.09, 8]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} /></mesh>
      </group>
    );
    if (petAccessory === 'hat') return (
      <group position={[0, 0.13, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.01, 16]} /><meshStandardMaterial color="#1e293b" /></mesh>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.06, 0.06, 0.07, 16]} /><meshStandardMaterial color="#1e293b" /></mesh>
      </group>
    );
    return null;
  };

  const Morange = { color: orange, metalness: 0.45, roughness: 0.4 };
  const Msilver = { color: silver, metalness: 0.8, roughness: 0.25 };
  const MsilverDark = { color: silverDark, metalness: 0.85, roughness: 0.25 };

  // 3-finger silver hand
  const renderHand = (mirror) => {
    if (hasThunderFists) return (
      <group>
        <RoundedBox args={[0.18, 0.16, 0.18]} radius={0.06} smoothness={3}><meshStandardMaterial color={silverDark} metalness={0.9} roughness={0.2} /></RoundedBox>
        <SparkEffect scale={1.1} color="#fde047" />
      </group>
    );
    return (
      <group>
        <RoundedBox args={[0.13, 0.12, 0.15]} radius={0.05} smoothness={3}><meshStandardMaterial color={hasPowerGloves ? orangeDark : silver} metalness={0.8} roughness={0.3} /></RoundedBox>
        {[0.045, 0, -0.045].map((z, i) => (
          <mesh key={i} position={[0.02, -0.1, z]}><capsuleGeometry args={[0.018, 0.06, 4, 8]} /><meshStandardMaterial color={hasPowerGloves ? orangeDark : silverDark} metalness={0.8} roughness={0.3} /></mesh>
        ))}
      </group>
    );
  };

  // Big rounded boot
  const renderFoot = () => (
    <group>
      {/* boot body */}
      <RoundedBox args={[0.24, 0.16, 0.22]} radius={0.07} smoothness={3} position={[0.03, 0, 0]} castShadow><meshStandardMaterial {...(hasHoverBoots ? Msilver : Morange)} /><Outlines thickness={0.025} color={OUTLINE} /></RoundedBox>
      {/* silver sole */}
      <RoundedBox args={[0.26, 0.06, 0.24]} radius={0.03} smoothness={3} position={[0.03, -0.09, 0]}><meshStandardMaterial {...MsilverDark} /></RoundedBox>
      {/* cyan accent */}
      <mesh position={[0.16, 0.01, 0]}><sphereGeometry args={[0.03, 10, 10]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.6} /></mesh>
      {/* hover glow */}
      {hasHoverBoots && (
        <mesh position={[0.03, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.02, 20]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={1.2} transparent opacity={0.8} /></mesh>
      )}
      {/* rocket flames */}
      {hasRocketBoots && <group position={[0.03, -0.14, 0]}><FlameEffect scale={0.8} /></group>}
    </group>
  );

  return (
    <group scale={[scale, scale, scale]} {...props}>
      <group ref={heroRef}>

        {/* ===================== HEAD ===================== */}
        <group ref={headRef} position={[0, 1.14, 0]}>
          {/* silver helmet shell */}
          <RoundedBox args={[0.52, 0.48, 0.48]} radius={0.18} smoothness={5} castShadow><meshStandardMaterial {...Msilver} /><Outlines thickness={0.03} color={OUTLINE} /></RoundedBox>
          {/* orange face plate */}
          <RoundedBox args={[0.12, 0.42, 0.44]} radius={0.12} smoothness={4} position={[0.2, -0.01, 0]}><meshStandardMaterial {...Morange} /></RoundedBox>

          {/* round ear pods */}
          {[0.26, -0.26].map((z, i) => (
            <group key={i} position={[-0.02, 0.0, z]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh castShadow><cylinderGeometry args={[0.12, 0.12, 0.1, 20]} /><meshStandardMaterial {...Msilver} /></mesh>
              <mesh position={[0, (z > 0 ? 0.055 : -0.055), 0]}><cylinderGeometry args={[0.07, 0.07, 0.04, 16]} /><meshStandardMaterial color={orange} metalness={0.5} roughness={0.4} /></mesh>
              <mesh position={[0, (z > 0 ? 0.078 : -0.078), 0]}><cylinderGeometry args={[0.035, 0.035, 0.02, 12]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.7} /></mesh>
            </group>
          ))}

          {/* BIG cute eyes */}
          {[0.115, -0.115].map((z, i) => (
            <group key={i} position={[0.255, 0.05, z]}>
              <mesh scale={[0.42, 1, 1]}><sphereGeometry args={[0.14, 20, 20]} /><meshStandardMaterial color="#e0f7ff" emissive="#bae6fd" emissiveIntensity={0.25} /></mesh>
              <mesh position={[0.03, 0, 0]} scale={[0.42, 1, 1]}><sphereGeometry args={[0.1, 20, 20]} /><meshStandardMaterial color={hasLaserEyes ? '#ef4444' : '#38bdf8'} emissive={hasLaserEyes ? '#ef4444' : '#0ea5e9'} emissiveIntensity={hasLaserEyes ? 1.2 : 0.5} /></mesh>
              <mesh position={[0.05, 0, 0]} scale={[0.42, 1, 1]}><sphereGeometry args={[0.055, 16, 16]} /><meshStandardMaterial color={hasLaserEyes ? '#7f1d1d' : '#082f49'} /></mesh>
              <mesh position={[0.07, 0.035, 0.035]} scale={[0.42, 1, 1]}><sphereGeometry args={[0.022, 8, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
              {hasLaserEyes && (
                <PulseGlow speed={5} minI={0.9} maxI={1.8} scaleAmt={0.03}>
                  <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.03, 0.34, 10]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.3} transparent opacity={0.7} /></mesh>
                </PulseGlow>
              )}
            </group>
          ))}

          {/* happy smile (dots curving up) */}
          {[-0.09, -0.045, 0, 0.045, 0.09].map((z, i) => {
            const y = -0.14 + (z * z) * 4.5;
            return <mesh key={i} position={[0.258, y, z]}><boxGeometry args={[0.02, 0.028, 0.03]} /><meshStandardMaterial color="#0b1220" /></mesh>;
          })}

          {/* Tech Visor (S11) */}
          {hasTechVisor && (
            <group position={[0.21, 0.06, 0]}>
              <RoundedBox args={[0.08, 0.12, 0.46]} radius={0.03} smoothness={3}><meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} /></RoundedBox>
              <PulseGlow speed={3.4} minI={0.6} maxI={1.4} scaleAmt={0}>
                <mesh position={[0.045, 0, 0]}><boxGeometry args={[0.015, 0.05, 0.4]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={1} /></mesh>
              </PulseGlow>
            </group>
          )}

          {/* Brain Crown (S22) */}
          {hasBrainCrown && (
            <BrainCrownAnim>
              <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.22, 0.1, 16, 1, true]} /><meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} /></mesh>
              {[0, 1, 2, 3, 4].map(i => {
                const a = (i / 5) * Math.PI * 2;
                return (
                  <group key={i} position={[Math.sin(a) * 0.2, 0.06, Math.cos(a) * 0.2]}>
                    <mesh><coneGeometry args={[0.035, 0.14, 6]} /><meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} /></mesh>
                    <mesh position={[0, 0.1, 0]}><sphereGeometry args={[0.035, 10, 10]} /><meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={0.9} /></mesh>
                  </group>
                );
              })}
            </BrainCrownAnim>
          )}
        </group>

        {/* Float Halo (S21) */}
        {hasFloatHalo && (
          <group ref={haloRef} position={[0, 1.55, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.22, 0.035, 12, 32]} /><meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={1.2} /></mesh>
          </group>
        )}

        {/* ===================== BODY ===================== */}
        <group ref={bodyRef}>
          {/* neck */}
          <mesh position={[0, 0.91, 0]}><cylinderGeometry args={[0.1, 0.12, 0.1, 12]} /><meshStandardMaterial {...MsilverDark} /></mesh>
          {/* orange torso */}
          <RoundedBox args={[0.46, 0.52, 0.42]} radius={0.16} smoothness={5} position={[0, 0.6, 0]} castShadow><meshStandardMaterial {...Morange} /><Outlines thickness={0.03} color={OUTLINE} /></RoundedBox>

          {/* silver chest panel with vents + cyan lights */}
          <RoundedBox args={[0.07, 0.34, 0.3]} radius={0.05} smoothness={3} position={[0.2, 0.56, 0]}><meshStandardMaterial {...Msilver} /></RoundedBox>
          {[-0.06, 0, 0.06].map((z, i) => (
            <mesh key={i} position={[0.235, 0.5, z]}><boxGeometry args={[0.02, 0.12, 0.025]} /><meshStandardMaterial color="#475569" roughness={0.8} /></mesh>
          ))}
          {[0.08, -0.08].map((z, i) => (
            <mesh key={i} position={[0.235, 0.68, z]}><sphereGeometry args={[0.026, 12, 12]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={1.3} /></mesh>
          ))}

          {/* shoulder ball joints */}
          {[0.25, -0.25].map((z, i) => (
            <mesh key={i} position={[0, 0.82, z]}><sphereGeometry args={[0.11, 14, 14]} /><meshStandardMaterial {...Msilver} /></mesh>
          ))}

          {/* Shield Armor (S1) - chest plate (clothing) */}
          {hasShieldArmor && (
            <RoundedBox args={[0.5, 0.38, 0.46]} radius={0.12} smoothness={3} position={[0.03, 0.66, 0]} castShadow><meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.25} /></RoundedBox>
          )}

          {/* Heavy Armor (S16) - bulky plating + pauldrons (clothing) */}
          {hasHeavyArmor && (
            <group>
              {[0.3, -0.3].map((z, i) => (
                <RoundedBox key={i} args={[0.26, 0.24, 0.28]} radius={0.08} smoothness={3} position={[0, 0.85, z]} castShadow><meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} /></RoundedBox>
              ))}
              <RoundedBox args={[0.52, 0.44, 0.48]} radius={0.14} smoothness={3} position={[0.02, 0.6, 0]} castShadow><meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.25} /></RoundedBox>
              <mesh position={[0.27, 0.62, 0]}><boxGeometry args={[0.02, 0.2, 0.1]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.5} /></mesh>
            </group>
          )}

          {/* Gold Belt (S3) */}
          {hasGoldBelt && (
            <group position={[0, 0.38, 0]}>
              <RoundedBox args={[0.48, 0.09, 0.44]} radius={0.03} smoothness={3}><meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} /></RoundedBox>
              <PulseGlow speed={2.4} minI={0.3} maxI={0.9}>
                <mesh position={[0.23, 0, 0]}><boxGeometry args={[0.04, 0.11, 0.11]} /><meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={0.5} metalness={0.9} /></mesh>
              </PulseGlow>
            </group>
          )}

          {/* Core Badge (S18) - glowing chest badge */}
          {hasCoreBadge && (
            <group position={[0.235, 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh><cylinderGeometry args={[0.1, 0.1, 0.05, 6]} /><meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} /></mesh>
              <PulseGlow speed={2.2} minI={0.7} maxI={1.6}>
                <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.06, 0.06, 0.02, 20]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.3} /></mesh>
              </PulseGlow>
            </group>
          )}

          {/* Star Core (S23) - big glowing star on chest */}
          {hasStarCore && <StarCoreAnim />}
        </group>

        {/* ===================== BACK GEAR ===================== */}
        {/* Star / Rainbow Cape (S7) - cloth garment */}
        {anyCape && (
          <group ref={capeRef} position={[-0.23, 0.92, 0]}>
            {[
              { y: -0.05, w: 0.5, h: 0.22 }, { y: -0.26, w: 0.58, h: 0.22 },
              { y: -0.47, w: 0.66, h: 0.24 }, { y: -0.68, w: 0.52, h: 0.2 },
            ].map((seg, row) => {
              const col = hasRainbowCape ? ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'][row] : '#7c3aed';
              return (
                <mesh key={row} position={[-0.03 - row * 0.015, seg.y, 0]} rotation={[0.06, 0, 0]} castShadow>
                  <boxGeometry args={[0.04, seg.h, seg.w]} />
                  <meshStandardMaterial color={col} emissive={col} emissiveIntensity={hasRainbowCape ? 0.4 : 0.18} roughness={0.6} metalness={0.1} side={THREE.DoubleSide} />
                </mesh>
              );
            })}
            {hasStarCape && !hasRainbowCape && (
              <mesh position={[-0.06, -0.3, 0]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.12, 0.12, 0.03, 5]} /><meshStandardMaterial color="#fde047" emissive="#fbbf24" emissiveIntensity={0.9} /></mesh>
            )}
            <mesh position={[0.04, 0.06, 0]}><sphereGeometry args={[0.05, 12, 12]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.5} metalness={0.8} /></mesh>
          </group>
        )}

        {/* Turbo Pack (S6) - jetpack with animated flames */}
        {hasTurboPack && (
          <group position={[-0.27, 0.62, 0]}>
            <RoundedBox args={[0.16, 0.36, 0.34]} radius={0.05} smoothness={3} castShadow><meshStandardMaterial {...MsilverDark} /></RoundedBox>
            {[0.13, -0.13].map((z, i) => (
              <group key={i} position={[-0.02, -0.22, z]}>
                <mesh><cylinderGeometry args={[0.06, 0.08, 0.16, 12]} /><meshStandardMaterial color="#334155" metalness={0.9} /></mesh>
                <group position={[0, -0.14, 0]}><FlameEffect scale={0.85} /></group>
              </group>
            ))}
          </group>
        )}

        {/* Wings (S2 Jet / S14 Solar) */}
        {anyWings && (
          <group ref={wingsRef} position={[-0.25, 0.78, 0]}>
            {[1, -1].map((side, i) => (
              <group key={i} position={[0, 0, side * 0.1]} rotation={[0, side * 0.6, side * 0.2]}>
                {hasSolarWings ? (
                  [0, 1, 2, 3].map(f => (
                    <mesh key={f} position={[0, 0.12 - f * 0.04, side * (0.14 + f * 0.16)]} rotation={[0, 0, side * (0.25 - f * 0.08)]} castShadow>
                      <boxGeometry args={[0.025, 0.46 - f * 0.07, 0.13]} />
                      <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.5} roughness={0.2} metalness={0.6} />
                    </mesh>
                  ))
                ) : (
                  <group>
                    <mesh position={[0, 0.08, side * 0.24]} rotation={[0, 0, side * 0.3]} castShadow><boxGeometry args={[0.04, 0.18, 0.5]} /><meshStandardMaterial {...Msilver} /></mesh>
                    <mesh position={[0, -0.02, side * 0.34]} rotation={[0, 0, side * 0.3]}><boxGeometry args={[0.02, 0.04, 0.4]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={0.8} /></mesh>
                  </group>
                )}
              </group>
            ))}
          </group>
        )}

        {/* ===================== ARMS ===================== */}
        {[{ ref: leftArmRef, z: 0.27, s: 1 }, { ref: rightArmRef, z: -0.27, s: -1 }].map((arm) => (
          <group key={arm.s} ref={arm.ref} position={[0, 0.82, arm.z]}>
            <mesh position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.06, 0.18, 6, 12]} /><meshStandardMaterial {...Morange} /></mesh>
            {/* elbow joint */}
            <mesh position={[0, -0.27, 0]}><sphereGeometry args={[0.055, 12, 12]} /><meshStandardMaterial {...MsilverDark} /></mesh>

            {/* Scanner Light (S15) on LEFT shoulder */}
            {hasScannerLight && arm.s === 1 && (
              <ScannerLightAnim />
            )}

            {/* hand */}
            <group position={[0, -0.34, 0]}>{renderHand(arm.s)}</group>

            {/* Ice Shield (S9) on LEFT arm - glowing ice */}
            {hasIceShield && arm.s === 1 && (
              <group position={[0.16, -0.18, 0.08]}>
                <PulseGlow speed={2} minI={0.35} maxI={0.85}>
                  <mesh rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.24, 0.24, 0.05, 6]} /><meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={0.5} metalness={0.3} roughness={0.1} transparent opacity={0.85} /></mesh>
                </PulseGlow>
                <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.24, 0.025, 6, 6]} /><meshStandardMaterial color="#0891b2" metalness={0.85} /></mesh>
                <group position={[0.06, 0, 0]}><FrostEffect scale={0.9} /></group>
              </group>
            )}

            {/* Fire Blade (S10) on RIGHT hand - glowing flickering fire */}
            {hasFireBlade && arm.s === -1 && (
              <group position={[0, -0.44, 0]}>
                <mesh position={[0, -0.06, 0]}><cylinderGeometry args={[0.03, 0.03, 0.16, 8]} /><meshStandardMaterial {...MsilverDark} /></mesh>
                <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><boxGeometry args={[0.05, 0.2, 0.05]} /><meshStandardMaterial color="#7c2d12" metalness={0.8} /></mesh>
                <mesh position={[0, 0.3, 0]}><capsuleGeometry args={[0.035, 0.4, 6, 12]} /><meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={1.2} transparent opacity={0.85} /></mesh>
                <group position={[0, 0.4, 0]}><FlameEffect scale={1.3} up /></group>
                <group position={[0, 0.22, 0]}><FlameEffect scale={0.9} up /></group>
              </group>
            )}

            {/* Arm Cannon (S20) on RIGHT forearm */}
            {hasArmCannon && arm.s === -1 && (
              <group position={[0, -0.34, 0]}>
                <mesh position={[0, -0.02, 0]}><cylinderGeometry args={[0.08, 0.09, 0.26, 14]} /><meshStandardMaterial {...MsilverDark} /></mesh>
                <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.06, 0.07, 0.08, 14]} /><meshStandardMaterial color="#1e293b" metalness={0.9} /></mesh>
                <PulseGlow speed={3.6} minI={0.8} maxI={1.6}>
                  <mesh position={[0, -0.2, 0]}><torusGeometry args={[0.055, 0.018, 8, 16]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.1} /></mesh>
                  <mesh position={[0.07, 0.02, 0]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color={cyan} emissive={cyan} emissiveIntensity={1} /></mesh>
                </PulseGlow>
              </group>
            )}
          </group>
        ))}

        {/* ===================== LEGS ===================== */}
        {[{ ref: leftLegRef, z: 0.13 }, { ref: rightLegRef, z: -0.13 }].map((leg) => (
          <group key={leg.z} ref={leg.ref} position={[0, 0.42, leg.z]}>
            <mesh position={[0, -0.15, 0]} castShadow><capsuleGeometry args={[0.085, 0.16, 6, 12]} /><meshStandardMaterial {...Morange} /></mesh>
            {/* knee joint */}
            <mesh position={[0, -0.26, 0]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial {...MsilverDark} /></mesh>
            {/* boot */}
            <group position={[0, -0.34, 0]}>{renderFoot()}</group>
          </group>
        ))}

        {/* ===================== PET ===================== */}
        {anyPet && (
          <group ref={petRef} position={[-0.62, 0.95, 0.5]}>
            {hasPhoenixPet ? (
              <group>
                <mesh castShadow><sphereGeometry args={[0.12, 12, 12]} /><meshStandardMaterial color={petColorHex} metalness={0.8} roughness={0.2} emissive={petColorHex} emissiveIntensity={0.2} /></mesh>
                <mesh position={[0.13, -0.02, 0]} rotation={[0, 0, -Math.PI / 6]}><coneGeometry args={[0.03, 0.07, 6]} /><meshStandardMaterial color="#fbbf24" metalness={0.9} /></mesh>
                {[0.13, -0.13].map((z, k) => (<mesh key={k} position={[0, 0.03, z]} rotation={[k ? -0.3 : 0.3, 0, 0]}><boxGeometry args={[0.015, 0.07, 0.18]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} /></mesh>))}
                {renderPetAccessory()}
              </group>
            ) : hasPandaPet ? (
              <group>
                <RoundedBox args={[0.16, 0.16, 0.16]} radius={0.05} smoothness={3} castShadow><meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.4} /></RoundedBox>
                {[0.06, -0.06].map((z, k) => (<mesh key={k} position={[-0.04, 0.09, z]}><sphereGeometry args={[0.035, 10, 10]} /><meshStandardMaterial color={petColorHex} metalness={0.7} /></mesh>))}
                {[0.035, -0.035].map((z, k) => (<mesh key={k} position={[0.082, 0.02, z]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.7} /></mesh>))}
                {renderPetAccessory()}
              </group>
            ) : hasRobotPet ? (
              <group>
                <RoundedBox args={[0.18, 0.11, 0.11]} radius={0.04} smoothness={3} castShadow><meshStandardMaterial color={petColorHex} metalness={0.7} roughness={0.3} /></RoundedBox>
                <RoundedBox args={[0.1, 0.1, 0.1]} radius={0.03} smoothness={3} position={[0.09, 0.08, 0]} castShadow><meshStandardMaterial color={petColorHex} metalness={0.7} roughness={0.3} /></RoundedBox>
                {[0.025, -0.025].map((z, k) => (<mesh key={k} position={[0.14, 0.09, z]}><sphereGeometry args={[0.016, 8, 8]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} /></mesh>))}
                {renderPetAccessory()}
              </group>
            ) : (
              <group>
                <mesh castShadow><sphereGeometry args={[0.11, 14, 14]} /><meshStandardMaterial color={petColorHex} metalness={0.8} roughness={0.2} /></mesh>
                <mesh position={[0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02, 12]} /><meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} /></mesh>
                <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.14, 0.012, 6, 20]} /><meshStandardMaterial {...Msilver} /></mesh>
                {renderPetAccessory()}
              </group>
            )}
          </group>
        )}

        {/* ===================== AURA (animated) ===================== */}
        {auraKind && <AuraEffect kind={auraKind} />}

        {/* Force Field (S19) - shimmering bubble */}
        {hasForceField && (
          <group>
            <mesh ref={shieldRef} position={[0, 0.6, 0]}>
              <sphereGeometry args={[0.82, 24, 24]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.3} transparent opacity={0.18} roughness={0.1} metalness={0.2} />
            </mesh>
            <ForceFieldOrbs />
          </group>
        )}

      </group>
    </group>
  );
}
