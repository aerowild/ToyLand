// src/components/MathQuest3D.jsx - Core React Three Fiber Math Game Component
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Stars, Cloud, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import Hero3D from './Hero3D';
import { getStageParams, generateStageParams, getComboOptions, COLORS, FEATURE_NAMES, getRandomPraise, getHint, calculateStars } from '../utils/mathQuestState';
import storyContent from '../utils/storyContent.json';
import { playSound, playStreakComboSound, startCalmMusic, stopCalmMusic } from '../utils/sound';

export function formatTime(val) {
    const hours = Math.floor(val);
    const mins = Math.round((val - hours) * 60);
    const paddedMins = mins < 10 ? '0' + mins : mins;
    const displayHours = hours === 0 ? 12 : hours;
    return `${displayHours}:${paddedMins}`;
}

// Cuisenaire Rod colors helper for pedagogical CPA mapping
export function getColorForValue(val) {
    const absVal = Math.abs(val);
    switch (absVal) {
        case 1: return '#e2e8f0'; // white / light grey
        case 2: return '#ef4444'; // red
        case 3: return '#22c55e'; // light green
        case 4: return '#ec4899'; // pink
        case 5: return '#eab308'; // yellow
        case 6: return '#15803d'; // dark green
        case 7: return '#1e293b'; // black
        case 8: return '#78350f'; // brown
        case 9: return '#3b82f6'; // blue
        case 10: return '#f97316'; // orange
        default: return '#8b5cf6'; // default purple
    }
}

// Text color helper to ensure high contrast against the rod colors
export function getTextColorForBackground(bgColor) {
    const lightColors = ['#e2e8f0', '#ffffff', '#eab308'];
    return lightColors.includes(bgColor.toLowerCase()) ? '#1e293b' : '#ffffff';
}

// --- PARTICLE EMITTER UTILITY ---
class ParticleEmitter {
    constructor() {
        this.particles = [];
    }
    spawn(position, count, color, speed = 1.0, isConfetti = false) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                id: Math.random(),
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2 * speed,
                    (Math.random() * 2 + 0.5) * speed,
                    (Math.random() - 0.5) * 2 * speed
                ),
                color: isConfetti ? new THREE.Color().setHSL(Math.random(), 0.8, 0.6).getStyle() : color,
                size: 0.04 + Math.random() * 0.08,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                gravity: 0.08,
                spin: (Math.random() - 0.5) * 0.2,
                rotation: Math.random() * Math.PI
            });
        }
    }
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.position.add(p.velocity);
            p.velocity.y -= p.gravity;
            p.velocity.multiplyScalar(0.96);
            p.rotation += p.spin;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
}

const emitter = new ParticleEmitter();

// --- 3D PARTICLE RENDERER ---
function ParticleRenderer({ trigger }) {
    const [, setTick] = useState(0);
    useFrame(() => {
        emitter.update();
        setTick(t => t + 1);
    });

    return (
        <group>
            {emitter.particles.map(p => (
                <mesh key={p.id} position={p.position.toArray()} rotation={[0, 0, p.rotation]}>
                    <boxGeometry args={[p.size, p.size, p.size]} />
                    <meshBasicMaterial color={p.color} transparent opacity={p.life} />
                </mesh>
            ))}
        </group>
    );
}

// --- HERO FOOTSTEP TRAIL EMITTER ---
function HeroTrailEmitter({ walking, position, theme }) {
    const lastSpawnTime = useRef(0);
    useFrame((state) => {
        if (walking) {
            const now = state.clock.elapsedTime;
            if (now - lastSpawnTime.current > 0.08) {
                lastSpawnTime.current = now;
                let color = '#cbd5e1'; // dust gray
                if (theme === 'space') color = '#c084fc'; // stardust purple
                else if (theme === 'lava') color = '#f97316'; // ember orange
                
                emitter.spawn(
                    new THREE.Vector3(position[0], position[1] - 0.28, position[2]),
                    2,
                    color,
                    0.25
                );
            }
        }
    });
    return null;
}

// --- GHOST GRID PREVIEW COMPONENT ---
function GhostPreview({ x, y, width, height, color }) {
    const meshRef = useRef();

    useFrame((state) => {
        if (meshRef.current) {
            const time = state.clock.elapsedTime;
            meshRef.current.material.opacity = 0.35 + Math.sin(time * 6) * 0.15;
            const scale = 1.0 + Math.sin(time * 6) * 0.02;
            meshRef.current.scale.set(scale, scale, 1.0);
        }
    });

    return (
        <mesh ref={meshRef} position={[x, y, 0]}>
            <boxGeometry args={[width, height, 0.12]} />
            <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
        </mesh>
    );
}

// --- FALLING LOG SLICE (SUBTRACTION) ---
function FallingLogSlice({ x, y, width, color, theme }) {
    const meshRef = useRef();

    useEffect(() => {
        if (meshRef.current) {
            gsap.to(meshRef.current.position, {
                y: -1.2,
                duration: 0.8,
                ease: 'power2.in'
            });
            gsap.to(meshRef.current.position, {
                x: meshRef.current.position.x + (Math.random() - 0.5) * 0.8,
                duration: 0.8,
                ease: 'power1.out'
            });
            gsap.to(meshRef.current.rotation, {
                x: Math.PI * (1 + Math.random()),
                y: Math.PI * Math.random(),
                duration: 0.8,
                ease: 'power1.out'
            });
            gsap.to(meshRef.current.scale, {
                x: 0, y: 0, z: 0,
                delay: 0.6,
                duration: 0.25,
                ease: 'power2.in'
            });
        }
    }, []);

    return (
        <mesh ref={meshRef} position={[x, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, width, 12]} />
            <meshStandardMaterial
                color={color}
                roughness={0.7}
                emissive={theme === 'space' ? color : '#000000'}
                emissiveIntensity={theme === 'space' ? 0.5 : 0}
            />
        </mesh>
    );
}

// --- RISING LOG SLICE (ADD BACK) ---
function RisingLogSlice({ x, y, width, color, theme }) {
    const meshRef = useRef();

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.position.y = -1.2;
            meshRef.current.scale.set(0, 0, 0);
            gsap.to(meshRef.current.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.2,
                ease: 'power2.out'
            });
            gsap.to(meshRef.current.position, {
                y: y,
                duration: 0.5,
                ease: 'power2.out'
            });
            gsap.to(meshRef.current.scale, {
                x: 0, y: 0, z: 0,
                delay: 0.4,
                duration: 0.15,
                ease: 'power2.in'
            });
        }
    }, [y]);

    return (
        <mesh ref={meshRef} position={[x, -1.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, width, 12]} />
            <meshStandardMaterial
                color={color}
                roughness={0.7}
                emissive={theme === 'space' ? color : '#000000'}
                emissiveIntensity={theme === 'space' ? 0.5 : 0}
            />
        </mesh>
    );
}

// --- CROCODILE CHARACTER MODEL ---
function Crocodile({ position, phase }) {
    const groupRef = useRef();

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (groupRef.current) {
            // Swim wiggle along Z and Y-rotation
            groupRef.current.position.z = position[2] + Math.sin(time * 0.8 + phase) * 0.3;
            groupRef.current.rotation.y = Math.sin(time * 0.6 + phase) * 0.15;
            const tail = groupRef.current.getObjectByName('tail');
            if (tail) {
                tail.rotation.y = Math.sin(time * 2.0 + phase) * 0.3;
            }
        }
    });

    return (
        <group ref={groupRef} position={position} scale={[0.8, 0.8, 0.8]}>
            {/* Body */}
            <mesh castShadow position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
                <meshStandardMaterial color="#2d6b3f" roughness={0.9} />
            </mesh>
            {/* Head */}
            <mesh castShadow position={[0.5, 0.1, 0]}>
                <boxGeometry args={[0.35, 0.1, 0.22]} />
                <meshStandardMaterial color="#2d6b3f" roughness={0.85} />
            </mesh>
            {/* Snout */}
            <mesh castShadow position={[0.75, 0.08, 0]}>
                <boxGeometry args={[0.25, 0.06, 0.14]} />
                <meshStandardMaterial color="#1a4a2a" roughness={0.9} />
            </mesh>
            {/* Eyes */}
            <group position={[0.5, 0.18, 0.09]}>
                <mesh>
                    <sphereGeometry args={[0.04, 6, 6]} />
                    <meshStandardMaterial color="#ffff00" emissive="#aaaa00" emissiveIntensity={0.3} />
                </mesh>
                <mesh position={[0, 0, 0.035]}>
                    <boxGeometry args={[0.01, 0.06, 0.015]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
            </group>
            <group position={[0.5, 0.18, -0.09]}>
                <mesh>
                    <sphereGeometry args={[0.04, 6, 6]} />
                    <meshStandardMaterial color="#ffff00" emissive="#aaaa00" emissiveIntensity={0.3} />
                </mesh>
                <mesh position={[0, 0, -0.035]}>
                    <boxGeometry args={[0.01, 0.06, 0.015]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
            </group>
            {/* Teeth */}
            <group position={[0.68, 0.04, 0.06]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.012, 0.04, 3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </group>
            <group position={[0.68, 0.04, -0.06]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.012, 0.04, 3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </group>
            <group position={[0.74, 0.04, 0.06]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.012, 0.04, 3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </group>
            <group position={[0.74, 0.04, -0.06]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.012, 0.04, 3]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
            </group>
            {/* Tail */}
            <mesh name="tail" castShadow position={[-0.55, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.1, 0.5, 6]} />
                <meshStandardMaterial color="#1a4a2a" roughness={0.9} />
            </mesh>
            {/* Belly ridges */}
            {Array.from({ length: 3 }).map((_, i) => (
                <mesh key={i} position={[i * 0.15 - 0.1, 0.16, 0]}>
                    <boxGeometry args={[0.04, 0.06, 0.18]} />
                    <meshStandardMaterial color="#8fbc8f" />
                </mesh>
            ))}
        </group>
    );
}

// --- CHOMP CROCODILE (reaction when hero falls in the water) ---
function ChompCrocodile({ position }) {
    const groupRef = useRef();
    const upperJawRef = useRef();
    const lowerJawRef = useRef();

    useEffect(() => {
        const g = groupRef.current;
        if (!g) return;
        g.position.y = position[1] - 1.2;
        g.scale.set(0, 0, 0);
        // rise up out of the water
        gsap.to(g.position, { y: position[1] + 0.1, duration: 0.4, ease: 'back.out(1.6)' });
        gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(1.6)' });
        // chomp the jaws a couple times, then sink back with a smirk
        if (upperJawRef.current && lowerJawRef.current) {
            const tl = gsap.timeline({ delay: 0.4 });
            tl.to(upperJawRef.current.rotation, { z: 0.5, duration: 0.18, yoyo: true, repeat: 3 }, 0);
            tl.to(lowerJawRef.current.rotation, { z: -0.5, duration: 0.18, yoyo: true, repeat: 3 }, 0);
        }
        gsap.to(g.rotation, { y: 0.4, duration: 1.0, delay: 0.5 }); // sly turn (smirk)
        return () => { gsap.killTweensOf(g.position); gsap.killTweensOf(g.scale); gsap.killTweensOf(g.rotation); };
    }, []);

    return (
        <group ref={groupRef} position={position} scale={[1.3, 1.3, 1.3]}>
            {/* head base */}
            <mesh castShadow position={[0, 0.08, 0]}>
                <boxGeometry args={[0.5, 0.18, 0.4]} />
                <meshStandardMaterial color="#2d6b3f" roughness={0.85} />
            </mesh>
            {/* upper jaw */}
            <group ref={upperJawRef} position={[0.18, 0.16, 0]}>
                <mesh castShadow position={[0.18, 0.02, 0]}>
                    <boxGeometry args={[0.4, 0.1, 0.34]} />
                    <meshStandardMaterial color="#2d6b3f" roughness={0.85} />
                </mesh>
                {/* upper teeth */}
                {[-0.12, -0.04, 0.04, 0.12].map((z, i) => (
                    <mesh key={i} position={[0.32, -0.05, z]} rotation={[Math.PI, 0, 0]}>
                        <coneGeometry args={[0.02, 0.07, 4]} />
                        <meshStandardMaterial color="#ffffff" />
                    </mesh>
                ))}
            </group>
            {/* lower jaw */}
            <group ref={lowerJawRef} position={[0.18, 0.0, 0]}>
                <mesh castShadow position={[0.18, -0.02, 0]}>
                    <boxGeometry args={[0.38, 0.08, 0.32]} />
                    <meshStandardMaterial color="#1a4a2a" roughness={0.9} />
                </mesh>
                {[-0.1, 0, 0.1].map((z, i) => (
                    <mesh key={i} position={[0.3, 0.05, z]}>
                        <coneGeometry args={[0.02, 0.06, 4]} />
                        <meshStandardMaterial color="#ffffff" />
                    </mesh>
                ))}
            </group>
            {/* eyes (with a sly half-lid for a smirk) */}
            {[0.13, -0.13].map((z, i) => (
                <group key={i} position={[0.02, 0.2, z]}>
                    <mesh><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color="#fde047" emissive="#ca8a04" emissiveIntensity={0.4} /></mesh>
                    <mesh position={[0.04, 0.01, 0]}><boxGeometry args={[0.02, 0.04, 0.05]} /><meshBasicMaterial color="#000000" /></mesh>
                    {/* sly eyelid */}
                    <mesh position={[0.03, 0.03, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.1, 0.04, 0.13]} /><meshStandardMaterial color="#2d6b3f" /></mesh>
                </group>
            ))}
        </group>
    );
}

// --- CROCODILE WATER COMPONENT ---
// --- ANIMATED BLOCK COMPONENTS ---
function AnimatedBox({ x, y, width, height, depth, color, label, onClick }) {
    const groupRef = useRef();
    const isMounted = useRef(false);

    useEffect(() => {
        if (groupRef.current) {
            if (!isMounted.current) {
                groupRef.current.scale.set(0, 0, 0);
                gsap.to(groupRef.current.scale, {
                    x: 1, y: 1, z: 1,
                    duration: 0.45,
                    ease: 'back.out(1.5)'
                });
                isMounted.current = true;
            } else {
                gsap.to(groupRef.current.position, {
                    x: x,
                    y: y,
                    duration: 0.35,
                    ease: 'power2.out'
                });
            }
        }
    }, [x, y]);

    return (
        <group 
            ref={groupRef} 
            position={[x, y, 0]}
            onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
            onPointerOver={onClick ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
            onPointerOut={onClick ? (e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; } : undefined}
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={color} roughness={0.4} />
            </mesh>
            <Html center position={[0, 0, depth / 2 + 0.02]}>
                <div style={{
                    color: getTextColorForBackground(color),
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    userSelect: 'none'
                }}>
                    {label}
                </div>
            </Html>
            {/* Unit Dividers */}
            {(() => {
                const V = parseInt(label);
                if (V > 1 && !isNaN(V)) {
                    const unitW = width / V;
                    return Array.from({ length: V - 1 }).map((_, i) => {
                        const lineX = -width / 2 + (i + 1) * unitW;
                        return (
                            <Line
                                key={i}
                                points={[
                                    [lineX, -height / 2, depth / 2 + 0.005],
                                    [lineX, height / 2, depth / 2 + 0.005]
                                ]}
                                color="#000000"
                                lineWidth={2.5}
                                transparent
                                opacity={0.4}
                            />
                        );
                    });
                }
                return null;
            })()}
        </group>
    );
}

function AnimatedSphere({ x, y, radius, color, label, onClick }) {
    const groupRef = useRef();
    const isMounted = useRef(false);

    useEffect(() => {
        if (groupRef.current) {
            if (!isMounted.current) {
                groupRef.current.position.y = y + 2.0;
                gsap.to(groupRef.current.position, {
                    y: y,
                    duration: 0.5,
                    ease: 'bounce.out'
                });
                isMounted.current = true;
            } else {
                gsap.to(groupRef.current.position, {
                    x: x,
                    y: y,
                    duration: 0.35,
                    ease: 'power2.out'
                });
            }
        }
    }, [x, y]);

    return (
        <group 
            ref={groupRef} 
            position={[x, y, 0]}
            onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
            onPointerOver={onClick ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
            onPointerOut={onClick ? (e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; } : undefined}
        >
            <mesh castShadow>
                <sphereGeometry args={[radius, 12, 12]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.25} emissive={color} emissiveIntensity={0.15} />
            </mesh>
            <Html center position={[0, 0, radius + 0.02]}>
                <div style={{
                    color: '#ffffff',
                    background: 'rgba(15, 23, 42, 0.85)',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: '800',
                    fontSize: '0.75rem',
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}>
                    {label}
                </div>
            </Html>
        </group>
    );
}

function AnimatedBalloon({ x, y, radius, color, label, onClick }) {
    const groupRef = useRef();
    const bobRef = useRef();
    const isMounted = useRef(false);

    useEffect(() => {
        if (groupRef.current) {
            if (!isMounted.current) {
                groupRef.current.position.y = y - 1.5;
                gsap.to(groupRef.current.position, {
                    y: y,
                    duration: 0.8,
                    ease: 'power2.out'
                });
                isMounted.current = true;
            } else {
                gsap.to(groupRef.current.position, {
                    x: x,
                    y: y,
                    duration: 0.35,
                    ease: 'power2.out'
                });
            }
        }
    }, [x, y]);

    useFrame((state) => {
        if (bobRef.current) {
            const time = state.clock.elapsedTime;
            bobRef.current.position.y = Math.sin(time * 2.5 + x * 5.0) * 0.08;
        }
    });

    return (
        <group 
            ref={groupRef} 
            position={[x, y, 0]}
            onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
            onPointerOver={onClick ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
            onPointerOut={onClick ? (e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; } : undefined}
        >
            <group ref={bobRef}>
                <Line points={[[0, 0, 0], [0, 1.1 - radius * 1.2, 0]]} color="#94a3b8" lineWidth={1} />
                <mesh position={[0, 1.1 - radius * 1.2, 0]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.03, 0.06, 4]} />
                    <meshStandardMaterial color={color} />
                </mesh>
                <mesh position={[0, 1.1, 0]} castShadow>
                    <sphereGeometry args={[radius * 1.2, 12, 12]} />
                    <meshStandardMaterial color={color} roughness={0.1} metalness={0.15} emissive={color} emissiveIntensity={0.2} />
                </mesh>
                <Html center position={[0, 1.1, radius * 1.2 + 0.02]}>
                    <div style={{
                        color: '#ffffff',
                        background: 'rgba(15, 23, 42, 0.85)',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        fontFamily: 'Fredoka, sans-serif',
                        fontWeight: '800',
                        fontSize: '0.75rem',
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}>
                        {label}
                    </div>
                </Html>
            </group>
        </group>
    );
}

// --- SPACE VOID COSMIC HAZARD POOL ---
function SpaceVoid({ y = -0.5, width = 10 }) {
    const voidRef = useRef();
    useFrame((state) => {
        if (voidRef.current) {
            voidRef.current.rotation.z = state.clock.elapsedTime * 0.04;
        }
    });
    return (
        <group>
            <mesh ref={voidRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, 3]} />
                <meshStandardMaterial color="#0f052d" roughness={0.9} metalness={0.8} />
            </mesh>
            <pointLight position={[0, y + 0.5, 0]} color="#c084fc" intensity={0.8} distance={8} />
            <Stars radius={10} depth={2} count={100} factor={1.2} saturation={0.5} fade speed={2} />
        </group>
    );
}

function CrocodileWater({ y = -0.5, width = 10 }) {
    const waterRef = useRef();

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (waterRef.current) {
            const pos = waterRef.current.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const yPos = pos.getY(i);
                // Murky green wave formula
                const wave = Math.sin(x * 2 + time * 2) * 0.06 + Math.cos(yPos * 3 + time * 1.5) * 0.04;
                pos.setZ(i, wave);
            }
            pos.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Water Plane */}
            <mesh ref={waterRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[width, 3, 24, 8]} />
                <meshStandardMaterial color="#1a6b4a" roughness={0.3} metalness={0.1} transparent opacity={0.85} />
            </mesh>
            {/* Murky light */}
            <pointLight position={[0, y + 0.3, 0]} color="#0ea5e9" intensity={0.5} distance={6} />
            {/* Crocodiles swimming */}
            <Crocodile position={[-2.2, y + 0.05, 0.2]} phase={0} />
            <Crocodile position={[2.2, y + 0.05, -0.3]} phase={Math.PI} />
            <Crocodile position={[0, y + 0.05, 0.4]} phase={Math.PI / 2} />
            {/* Lily pads */}
            <mesh position={[-1.2, y + 0.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.22, 8]} />
                <meshStandardMaterial color="#15803d" roughness={0.9} />
            </mesh>
            <mesh position={[1.2, y + 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.18, 8]} />
                <meshStandardMaterial color="#15803d" roughness={0.9} />
            </mesh>
            <mesh position={[-3.8, y + 0.02, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.2, 8]} />
                <meshStandardMaterial color="#15803d" roughness={0.9} />
            </mesh>
        </group>
    );
}

// --- MATH-AS-COMBAT: gloom-bot + caged friend (checkpoint/boss stage) ---
// The gloom-bot floats above the goal and gets EXPOSED as the puzzle progresses:
// it shrinks, fades, and turns from gloomy grey to harmless bright as `progress` -> 1.
// On `cleared`, it poofs and the caged friend is freed with light and hops happily.
// Non-scary + non-violent by design (goofy face, "poof" not destroy).
function BossFight({ progress = 0, cleared = false, theme = 'forest' }) {
    const botRef = useRef();
    const friendRef = useRef();
    const poofRef = useRef();
    // Pick a gloom-bot taunt + a rescue line once per stage (LocalLM-generated, kid-safe).
    const lines = useRef({
        taunt: (storyContent.taunts && storyContent.taunts.length) ? storyContent.taunts[Math.floor(Math.random() * storyContent.taunts.length)] : 'Solve it if you can!',
        rescue: (storyContent.rescues && storyContent.rescues.length) ? storyContent.rescues[Math.floor(Math.random() * storyContent.rescues.length)] : "Yay, I'm free!",
    });
    const p = Math.max(0, Math.min(1, progress));
    const exposeColor = new THREE.Color().lerpColors(new THREE.Color('#475569'), new THREE.Color('#a78bfa'), p);

    useFrame((s) => {
        const t = s.clock.elapsedTime;
        const bot = botRef.current;
        if (bot) {
            bot.position.y = 3.1 + Math.sin(t * 1.6) * 0.18;
            bot.rotation.y = Math.sin(t * 0.8) * 0.3;
            // shrink + wobble more nervously as it gets exposed
            const sc = cleared ? Math.max(0.001, 1 - (Math.min(1, (t % 100))) ) : (1 - p * 0.55);
            bot.scale.setScalar(cleared ? THREE.MathUtils.damp(bot.scale.x, 0.001, 6, s.clock.getDelta() || 0.016) : sc);
            bot.visible = bot.scale.x > 0.02;
        }
        if (friendRef.current) {
            friendRef.current.position.y = cleared ? 0.4 + Math.abs(Math.sin(t * 6)) * 0.35 : 0.4;
        }
        if (poofRef.current) {
            poofRef.current.children.forEach((c, i) => {
                const k = cleared ? (Math.sin(t * 4 + i) + 1) / 2 : 0;
                c.scale.setScalar(0.001 + k * 0.5);
                if (c.material) c.material.opacity = cleared ? 0.6 * (1 - k) : 0;
            });
        }
    });

    return (
        <group position={[0, 0, -2.2]}>
            {/* Gloom-bot (goofy, not scary) */}
            <group ref={botRef} position={[0, 3.1, 0]}>
                <mesh castShadow><icosahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color={exposeColor} emissive={exposeColor} emissiveIntensity={0.25 + p * 0.5} metalness={0.3} roughness={0.6} flatShading /></mesh>
                {/* two big silly eyes */}
                {[0.22, -0.22].map((z, i) => (
                    <group key={i} position={[0.5, 0.12, z]}>
                        <mesh><sphereGeometry args={[0.15, 14, 14]} /><meshStandardMaterial color="#f8fafc" /></mesh>
                        <mesh position={[0.1, -0.02 - p * 0.04, 0]}><sphereGeometry args={[0.07, 12, 12]} /><meshStandardMaterial color="#0b1220" /></mesh>
                    </group>
                ))}
                {/* wobbly antennae */}
                {[0.16, -0.16].map((z, i) => (
                    <mesh key={i} position={[0, 0.6, z]} rotation={[0, 0, i ? 0.3 : -0.3]}><cylinderGeometry args={[0.02, 0.02, 0.34, 6]} /><meshStandardMaterial color={exposeColor} /></mesh>
                ))}
                {/* mouth flips from frown to surprised 'o' as exposed */}
                <mesh position={[0.52, -0.18, 0]}><torusGeometry args={[0.08 + p * 0.04, 0.02, 8, 16, Math.PI * (0.6 + p)]} /><meshStandardMaterial color="#0b1220" /></mesh>
            </group>

            {/* Poof cloud on clear */}
            <group ref={poofRef} position={[0, 3.1, 0]}>
                {[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2; return (
                    <mesh key={i} position={[Math.cos(a) * 0.4, Math.sin(a) * 0.3, 0]}><sphereGeometry args={[0.3, 10, 10]} /><meshStandardMaterial color="#e9d5ff" transparent opacity={0} /></mesh>
                ); })}
            </group>

            {/* Caged friend at the goal — cage bars fade/lift when cleared */}
            <group position={[0, 0, 0]}>
                <group ref={friendRef} position={[0, 0.4, 0]}>
                    <mesh castShadow><capsuleGeometry args={[0.16, 0.24, 6, 12]} /><meshStandardMaterial color={cleared ? '#22c55e' : '#38bdf8'} emissive={cleared ? '#22c55e' : '#0ea5e9'} emissiveIntensity={cleared ? 0.5 : 0.2} metalness={0.4} roughness={0.4} /></mesh>
                    {[0.07, -0.07].map((z, i) => (<mesh key={i} position={[0.14, 0.16, z]}><sphereGeometry args={[0.04, 10, 10]} /><meshStandardMaterial color="#0b1220" /></mesh>))}
                </group>
                {/* cage */}
                {!cleared && (
                    <group>
                        {[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; return (
                            <mesh key={i} position={[Math.cos(a) * 0.34, 0.42, Math.sin(a) * 0.34]}><cylinderGeometry args={[0.015, 0.015, 0.95, 6]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} transparent opacity={0.85 - p * 0.5} /></mesh>
                        ); })}
                        <mesh position={[0, 0.92, 0]}><cylinderGeometry args={[0.36, 0.36, 0.05, 12]} /><meshStandardMaterial color="#64748b" metalness={0.8} transparent opacity={0.85 - p * 0.5} /></mesh>
                    </group>
                )}
                {/* free-with-light burst on clear */}
                {cleared && <pointLight position={[0, 0.6, 0]} color="#fde047" intensity={1.5} distance={4} />}
            </group>

            {/* progress banner floating over the boss */}
            <Html center position={[0, 4.2, 0]}>
                <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 900, fontSize: '0.8rem', whiteSpace: 'nowrap', color: cleared ? '#16a34a' : '#7c3aed', background: 'rgba(255,255,255,0.9)', padding: '3px 10px', borderRadius: 999, border: `2px solid ${cleared ? '#22c55e' : '#a855f7'}`, userSelect: 'none', pointerEvents: 'none' }}>
                    {cleared ? `✨ ${lines.current.rescue}` : `🌀 ${lines.current.taunt} (${Math.round(p * 100)}%)`}
                </div>
            </Html>
        </group>
    );
}

// --- LAVA POOL COMPONENT ---
function LavaPool({ y = -0.5, width = 10 }) {
    const lavaRef = useRef();
    const bubbleRefs = useRef([]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (lavaRef.current) {
            const pos = lavaRef.current.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const yPos = pos.getY(i);
                const wave = Math.sin(x * 1.5 + time * 1.2) * 0.05 + Math.cos(yPos * 2 + time * 1.0) * 0.03;
                pos.setZ(i, wave);
            }
            pos.needsUpdate = true;
        }
        bubbleRefs.current.forEach((b, idx) => {
            if (b) {
                const phase = idx * 1.5;
                const spd = 1.0 + (idx % 3) * 0.5;
                b.position.y = y + 0.02 + Math.max(0, Math.sin(time * spd + phase)) * 0.25;
                b.scale.setScalar(0.4 + Math.max(0, Math.sin(time * spd + phase)) * 0.6);
            }
        });
    });

    return (
        <group>
            <mesh ref={lavaRef} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, 4, 16, 6]} />
                <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={0.65} roughness={0.4} />
            </mesh>
            <pointLight position={[0, y + 0.5, 0]} color="#ff4500" intensity={1.5} distance={8} />
            {Array.from({ length: 5 }).map((_, idx) => (
                <mesh
                    key={idx}
                    ref={el => bubbleRefs.current[idx] = el}
                    position={[
                        -3.5 + idx * 1.8 + (idx % 2 === 0 ? 0.3 : -0.3),
                        y,
                        (idx % 2 === 0 ? 0.5 : -0.5)
                    ]}
                >
                    <sphereGeometry args={[0.12, 8, 8]} />
                    <meshStandardMaterial color="#f97316" emissive="#ea580c" roughness={0.2} />
                </mesh>
            ))}
        </group>
    );
}

// --- TRIMMING LOG COMPONENT ---
function TrimmingLog({ currentValue, start, initialLogWidth, xOffset, scaleVal, theme }) {
    const meshRef = useRef();

    useEffect(() => {
        if (meshRef.current) {
            gsap.to(meshRef.current.scale, {
                y: scaleVal,
                duration: 0.45,
                ease: 'power2.out'
            });
            gsap.to(meshRef.current.position, {
                x: xOffset,
                duration: 0.45,
                ease: 'power2.out'
            });
        }
    }, [scaleVal, xOffset]);

    let logColor = COLORS.wood;
    let logEmissive = '#000000';
    let logEmissiveIntensity = 0;
    let logRoughness = 0.7;
    let logMetalness = 0.1;

    if (theme === 'space') {
        logColor = '#06b6d4';
        logEmissive = '#06b6d4';
        logEmissiveIntensity = 0.6;
        logRoughness = 0.15;
        logMetalness = 0.8;
    } else if (theme === 'lava') {
        logColor = '#292524';
        logEmissive = '#ef4444';
        logEmissiveIntensity = 0.4;
        logRoughness = 0.55;
        logMetalness = 0.25;
    }

    return (
        <mesh
            ref={meshRef}
            position={[xOffset, 0.65, 0]}
            rotation={[0, 0, Math.PI / 2]}
            scale={[1.0, scaleVal, 1.0]}
            castShadow
        >
            <cylinderGeometry args={[0.24, 0.24, initialLogWidth, 16]} />
            <meshStandardMaterial
                color={logColor}
                emissive={logEmissive}
                emissiveIntensity={logEmissiveIntensity}
                roughness={logRoughness}
                metalness={logMetalness}
            />
        </mesh>
    );
}


// --- CLOUDS AND STAGE ENVIRONMENT ---
function Environment({ puzzleType, stageNum, theme = 'default' }) {
    const hasLava = theme === 'lava';
    const isSpace = theme === 'space';

    const bgColor = isSpace 
        ? '#090514' 
        : (hasLava 
            ? '#1e0f0f' 
            : (puzzleType === 'area' 
                ? '#c4b5fd' 
                : (puzzleType === 'balance' 
                    ? '#fef9c3' 
                    : '#7dd3fc'
                )
            )
        );

    return (
        <>
            <color attach="background" args={[bgColor]} />
            <fogExp2 attach="fog" color={bgColor} density={isSpace ? 0.008 : (hasLava ? 0.02 : 0.012)} />

            {/* Lights */}
            <ambientLight intensity={isSpace ? 0.5 : 0.75} color={isSpace ? '#c084fc' : '#ffffff'} />
            <hemisphereLight skyColor={isSpace ? '#818cf8' : '#ffffff'} groundColor={hasLava ? '#451a03' : '#1e1b4b'} intensity={0.4} />
            <directionalLight
                castShadow
                position={[8, 12, 6]}
                intensity={isSpace ? 1.0 : 1.3}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-bias={-0.001}
                color={isSpace ? '#818cf8' : (hasLava ? '#f97316' : '#ffffff')}
            />
            <directionalLight position={[-5, 5, -5]} intensity={0.3} color={isSpace ? '#ec4899' : '#38bdf8'} />

            {/* Clouds or Space Stars */}
            {isSpace ? (
                <Stars radius={100} depth={50} count={1200} factor={4} saturation={0.5} fade speed={1.5} />
            ) : (
                puzzleType !== 'area' && (
                    <group position={[0, 5, -8]}>
                        <Cloud opacity={hasLava ? 0.25 : 0.4} speed={0.2} width={10} depth={1.5} segments={10} color={hasLava ? '#991b1b' : '#ffffff'} />
                        <Cloud opacity={hasLava ? 0.2 : 0.3} speed={0.15} position={[-8, 1, -2]} width={6} depth={1} segments={6} color={hasLava ? '#7f1d1d' : '#e0f2fe'} />
                        <Cloud opacity={hasLava ? 0.2 : 0.3} speed={0.25} position={[8, -1, -3]} width={8} depth={1.2} segments={8} color={hasLava ? '#7f1d1d' : '#e0f2fe'} />
                    </group>
                )
            )}

            {/* Background Mountains */}
            {puzzleType !== 'area' && (
                <group position={[0, -0.5, -12]}>
                    <mesh position={[-6, 1.5, 0]} rotation={[0, Math.PI / 6, 0]}>
                        <coneGeometry args={[4, 5, 5]} />
                        <meshStandardMaterial 
                            color={isSpace ? '#4c1d95' : (hasLava ? '#451a03' : '#64748b')} 
                            roughness={0.8}
                            metalness={isSpace ? 0.8 : 0.1}
                            flatShading 
                        />
                    </mesh>
                    <mesh position={[6, 2.0, -2]} rotation={[0, -Math.PI / 8, 0]}>
                        <coneGeometry args={[5, 7, 5]} />
                        <meshStandardMaterial 
                            color={isSpace ? '#2e1065' : (hasLava ? '#2d0f02' : '#475569')} 
                            roughness={0.8}
                            metalness={isSpace ? 0.8 : 0.1}
                            flatShading 
                        />
                    </mesh>
                    <mesh position={[-1, 1.0, -1]}>
                        <coneGeometry args={[3, 4, 5]} />
                        <meshStandardMaterial 
                            color={isSpace ? '#581c87' : (hasLava ? '#451a03' : '#6b7280')} 
                            roughness={0.8}
                            metalness={isSpace ? 0.8 : 0.1}
                            flatShading 
                        />
                    </mesh>
                </group>
            )}
        </>
    );
}

// --- DYNAMIC CAMERA RIG ---
function CameraRig({ puzzleType, target, stairTotalHeight }) {
    const { camera } = useThree();

    useEffect(() => {
        let targetPos = [0, 4.2, 10];
        let lookAtY = 1.5;

        if (puzzleType === 'bridge') {
            targetPos = [0, 3.2, 10.5]; // Slightly lower, zoomed out
            lookAtY = 1.2;
        } else if (puzzleType === 'sub_bridge') {
            targetPos = [0, 2.5, 7.5]; // Lower and closer to see the log
            lookAtY = 0.5;
        } else if (puzzleType === 'hill') {
            const midHeight = (3.0 + 1.6) / 2;
            targetPos = [0, midHeight + 1.2, 10.0]; // Follow the stairs height
            lookAtY = midHeight;
        } else if (puzzleType === 'area') {
            targetPos = [0, 2.8, 7.5]; // Centered on the grid
            lookAtY = 1.8;
        } else if (puzzleType === 'balance') {
            targetPos = [0, 2.2, 7.5]; // Centered on the scale
            lookAtY = 1.0;
        }

        gsap.to(camera.position, {
            x: targetPos[0],
            y: targetPos[1],
            z: targetPos[2],
            duration: 1.0,
            ease: 'power2.out',
            onUpdate: () => {
                camera.lookAt(0, lookAtY, 0);
            }
        });
    }, [puzzleType, target, stairTotalHeight, camera]);

    return null;
}
// --- SCENE MANAGER FOR INDIVIDUAL PUZZLE GRAPHICS ---
function PuzzleScene({
    puzzleType,
    target,
    start,
    currentValue,
    placedBlocks = [],
    gapWidth = 4.0,
    stairTotalHeight = 3.0,
    beamAngle = 0,
    areaW = 3,
    areaH = 3,
    stageNum,
    theme = 'default',
    areaGrid = [],
    hoveredBlockType = null,
    fallingSlices = [],
    risingSlices = [],
    onBlockClick,
    onSliceClick,
    pieces,
    sequence
}) {
    const beamRef = useRef();

    useEffect(() => {
        if (beamRef.current) {
            gsap.to(beamRef.current.rotation, {
                z: beamAngle,
                duration: 0.5,
                ease: 'elastic.out(1, 0.4)'
            });
        }
    }, [beamAngle]);

    const isSpace = theme === 'space';
    const isLava = theme === 'lava';

    // Determine colors based on active theme
    let cliffCol = COLORS.cliff;
    let grassCol = COLORS.grass;
    let dirtCol = COLORS.dirt;
    let groundCol = '#fef3c7'; // default balance ground

    if (isSpace) {
        cliffCol = '#1e1b4b'; // dark cosmic basalt
        grassCol = '#8b5cf6'; // glowing stardust purple
        dirtCol = '#0f172a'; // space dust slate
        groundCol = '#0f052d';
    } else if (isLava) {
        cliffCol = '#1c1917'; // volcanic obsidian
        grassCol = '#7c2d12'; // cooled lava crust red-brown
        dirtCol = '#44403c'; // dark volcanic ash
        groundCol = '#451a03';
    }

    // Hazard Pool selection
    let hazardPool = <CrocodileWater y={-0.9} width={12} />;
    if (isSpace) {
        hazardPool = <SpaceVoid y={-0.9} width={12} />;
    } else if (isLava) {
        hazardPool = <LavaPool y={-0.9} width={12} />;
    }

    // Calculate preview position if there is a hovered block in area mode
    let previewBlock = null;
    if (puzzleType === 'area' && hoveredBlockType) {
        const bw = hoveredBlockType.w;
        const bh = hoveredBlockType.h;
        let found = false;
        let previewX = 0;
        let previewY = 0;
        const cellSize = 0.5;

        for (let row = 0; row <= areaH - bh && !found; row++) {
            for (let col = 0; col <= areaW - bw && !found; col++) {
                let fits = true;
                for (let dc = 0; dc < bw && fits; dc++) {
                    for (let dr = 0; dr < bh && fits; dr++) {
                        if (row + dr >= areaH || (areaGrid && areaGrid[row + dr] && areaGrid[row + dr][col + dc])) {
                            fits = false;
                        }
                    }
                }
                if (fits) {
                    previewX = -(areaW * cellSize) / 2 + (col + bw / 2) * cellSize;
                    previewY = 0.8 + (row + bh / 2) * cellSize;
                    found = true;
                }
            }
        }

        if (found) {
            previewBlock = {
                x: previewX,
                y: previewY,
                width: bw * cellSize - 0.04,
                height: bh * cellSize - 0.04
            };
        }
    }

    if (puzzleType === 'bridge') {
        return (
            <group>
                {/* Left Bank */}
                <mesh position={[-3.5, 0, 0]} receiveShadow>
                    <boxGeometry args={[4, 3, 3]} />
                    <meshStandardMaterial color={cliffCol} roughness={0.9} flatShading />
                </mesh>
                <mesh position={[-3.5, 1.55, 0]}>
                    <boxGeometry args={[4.1, 0.1, 3.1]} />
                    <meshStandardMaterial color={grassCol} roughness={0.7} />
                </mesh>

                {/* Right Bank */}
                <mesh position={[3.5, 0, 0]} receiveShadow>
                    <boxGeometry args={[4, 3, 3]} />
                    <meshStandardMaterial color={cliffCol} roughness={0.9} flatShading />
                </mesh>
                <mesh position={[3.5, 1.55, 0]}>
                    <boxGeometry args={[4.1, 0.1, 3.1]} />
                    <meshStandardMaterial color={grassCol} roughness={0.7} />
                </mesh>

                {/* Hazard Pool below */}
                {hazardPool}

                {/* Bridge Target Line */}
                <mesh position={[0, 1.45, 0]}>
                    <boxGeometry args={[gapWidth, 0.05, 0.6]} />
                    <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} />
                </mesh>
                {/* Flags */}
                <mesh position={[2.5, 2.1, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.0, 6]} />
                    <meshStandardMaterial color="#78350f" />
                </mesh>
                <mesh position={[2.7, 2.5, 0]}>
                    <boxGeometry args={[0.4, 0.25, 0.01]} />
                    <meshStandardMaterial color="#ef4444" />
                </mesh>

                {/* Horizontal Pictorial Number Line Ruler */}
                <Line
                    points={[
                        [-gapWidth / 2, 1.25, 1.6],
                        [gapWidth / 2, 1.25, 1.6]
                    ]}
                    color="#475569"
                    lineWidth={2.5}
                />
                {Array.from({ length: target + 1 }).map((_, i) => {
                    const tickX = -gapWidth / 2 + (i * (gapWidth / target));
                    return (
                        <group key={i} position={[tickX, 1.25, 1.6]}>
                            <Line
                                points={[[0, 0, 0], [0, -0.1, 0]]}
                                color="#475569"
                                lineWidth={1.5}
                            />
                            <Html center position={[0, -0.28, 0]}>
                                <div style={{
                                    fontFamily: 'Fredoka, sans-serif',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    color: '#475569',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    padding: '1px 5px',
                                    borderRadius: '5px',
                                    border: '1px solid #cbd5e1',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    {i}
                                </div>
                            </Html>
                        </group>
                    );
                })}
            </group>
        );
    }

    if (puzzleType === 'hill') {
        const unitHeight = stairTotalHeight / target;
        return (
            <group>
                {/* Left Cliff */}
                <mesh position={[-3.5, 0, 0]} receiveShadow>
                    <boxGeometry args={[4, 3, 3]} />
                    <meshStandardMaterial color={cliffCol} roughness={0.9} flatShading />
                </mesh>
                <mesh position={[-3.5, 1.55, 0]}>
                    <boxGeometry args={[4.1, 0.1, 3.1]} />
                    <meshStandardMaterial color={grassCol} roughness={0.7} />
                </mesh>

                {/* Right Cliff (High Goal) */}
                <mesh position={[3.5, stairTotalHeight / 2, 0]} receiveShadow>
                    <boxGeometry args={[4, 3 + stairTotalHeight, 3]} />
                    <meshStandardMaterial color={cliffCol} roughness={0.9} flatShading />
                </mesh>
                <mesh position={[3.5, 1.55 + stairTotalHeight, 0]}>
                    <boxGeometry args={[4.1, 0.1, 3.1]} />
                    <meshStandardMaterial color={grassCol} roughness={0.7} />
                </mesh>

                {/* Height marker line */}
                <mesh position={[-1.2, 1.5 + stairTotalHeight / 2, 0]}>
                    <boxGeometry args={[0.04, stairTotalHeight, 0.04]} />
                    <meshBasicMaterial color="#fbbf24" />
                </mesh>

                {/* Target Ghost Steps */}
                {Array.from({ length: target }).map((_, i) => (
                    <mesh
                        key={i}
                        position={[
                            -1.0 + i * 0.6 + 0.3,
                            1.5 + (i + 0.5) * unitHeight,
                            0
                        ]}
                    >
                        <boxGeometry args={[0.56, unitHeight - 0.02, 0.8]} />
                        <meshBasicMaterial color={isSpace ? '#8b5cf6' : '#22c55e'} transparent opacity={0.15} />
                    </mesh>
                ))}

                {/* Hazard Pool below */}
                {hazardPool}

                {/* Vertical Pictorial Ruler */}
                <Line
                    points={[
                        [-1.3, 1.5, 1.6],
                        [-1.3, 1.5 + stairTotalHeight, 1.6]
                    ]}
                    color="#475569"
                    lineWidth={2.5}
                />
                {Array.from({ length: target + 1 }).map((_, i) => {
                    const tickY = 1.5 + i * unitHeight;
                    return (
                        <group key={i} position={[-1.3, tickY, 1.6]}>
                            <Line
                                points={[[0, 0, 0], [-0.08, 0, 0]]}
                                color="#475569"
                                lineWidth={1.5}
                            />
                            <Html center position={[-0.28, 0, 0]}>
                                <div style={{
                                    fontFamily: 'Fredoka, sans-serif',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    color: '#475569',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    padding: '1px 5px',
                                    borderRadius: '5px',
                                    border: '1px solid #cbd5e1',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    {i}
                                </div>
                            </Html>
                        </group>
                    );
                })}
            </group>
        );
    }

    if (puzzleType === 'sub_bridge') {
        // Gap between banks is fixed (inner edges at x = -1.5 .. +1.5 => 3.0 wide).
        // unit is sized so a log trimmed to exactly `target` spans the gap perfectly.
        const unit = 3.0 / target;
        const leftEdge = -1.5;               // left bank inner edge
        const initialLogWidth = start * unit; // full untrimmed length
        const scaleVal = currentValue / start;
        const curLen = currentValue * unit;
        const xOffset = leftEdge + curLen / 2; // anchor the LEFT end at the left bank

        let subRiverPool = <CrocodileWater y={-0.08} width={14} />;
        if (isSpace) {
            subRiverPool = <SpaceVoid y={-0.08} width={14} />;
        } else if (isLava) {
            subRiverPool = <LavaPool y={-0.08} width={14} />;
        }

        return (
            <group>
                {/* Left River Bank */}
                <mesh position={[-3.5, -0.2, 0]} receiveShadow>
                    <boxGeometry args={[4, 1.5, 3]} />
                    <meshStandardMaterial color={dirtCol} roughness={0.9} />
                </mesh>
                <mesh position={[-3.5, 0.55, 0]}>
                    <boxGeometry args={[4.1, 0.1, 3.1]} />
                    <meshStandardMaterial color={grassCol} roughness={0.7} />
                </mesh>

                {/* Right River Bank */}
                <mesh position={[3.5, -0.2, 0]} receiveShadow>
                    <boxGeometry args={[4, 1.5, 3]} />
                    <meshStandardMaterial color={dirtCol} roughness={0.9} />
                </mesh>
                <mesh position={[3.5, 0.55, 0]}>
                    <boxGeometry args={[4.1, 0.1, 3.1]} />
                    <meshStandardMaterial color={grassCol} roughness={0.7} />
                </mesh>

                {/* River hazard pool */}
                {subRiverPool}

                {/* Trimming Log with animated sliding */}
                {currentValue > 0 && (
                    <TrimmingLog
                        currentValue={currentValue}
                        start={start}
                        initialLogWidth={initialLogWidth}
                        xOffset={xOffset}
                        scaleVal={scaleVal}
                        theme={theme}
                    />
                )}

                {/* Falling slices chunk physics */}
                {fallingSlices.map(s => (
                    <FallingLogSlice key={s.id} x={s.x} y={s.y} width={s.width} color={s.color} theme={s.theme} />
                ))}

                {/* Rising slices log added back physics */}
                {risingSlices.map(s => (
                    <RisingLogSlice key={s.id} x={s.x} y={s.y} width={s.width} color={s.color} theme={s.theme} />
                ))}

                {/* Target Zone Box - exactly fills the gap (target units) */}
                <mesh position={[0, 0.42, 0]}>
                    <boxGeometry args={[3.0, 0.04, 0.7]} />
                    <meshBasicMaterial color="#22c55e" transparent opacity={0.25} />
                </mesh>

                {/* Horizontal Pictorial Subtraction Ruler (left-anchored) */}
                <Line
                    points={[
                        [leftEdge, 0.28, 1.6],
                        [leftEdge + initialLogWidth, 0.28, 1.6]
                    ]}
                    color="#475569"
                    lineWidth={2.5}
                />
                {Array.from({ length: start + 1 }).map((_, i) => {
                    const tickX = leftEdge + (i * unit);
                    return (
                        <group key={i} position={[tickX, 0.28, 1.6]}>
                            <Line
                                points={[[0, 0, 0], [0, -0.08, 0]]}
                                color="#475569"
                                lineWidth={1.5}
                            />
                            <Html center position={[0, -0.26, 0]}>
                                <div style={{
                                    fontFamily: 'Fredoka, sans-serif',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    color: i === target ? '#16a34a' : '#475569',
                                    background: i === target ? 'rgba(220, 252, 231, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                    border: i === target ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    {i}
                                </div>
                            </Html>
                        </group>
                    );
                })}
            </group>
        );
    }

    if (puzzleType === 'area') {
        const cellSize = 0.5;
        const gridW = areaW * cellSize;
        const gridH = areaH * cellSize;
        return (
            <group>
                {/* Backboard Grid Wall */}
                <mesh position={[0, gridH / 2 + 0.8, -0.06]} receiveShadow>
                    <boxGeometry args={[gridW + 0.2, gridH + 0.2, 0.1]} />
                    <meshStandardMaterial color={isSpace ? '#3b0764' : (isLava ? '#292524' : '#1e1b4b')} roughness={0.9} />
                </mesh>

                {/* Grid Lines */}
                {Array.from({ length: areaW + 1 }).map((_, col) => (
                    <Line
                        key={`x-${col}`}
                        points={[
                            [-gridW / 2 + col * cellSize, 0.8, 0.01],
                            [-gridW / 2 + col * cellSize, gridH + 0.8, 0.01]
                        ]}
                        color={isSpace ? '#d946ef' : (isLava ? '#ea580c' : '#6d28d9')}
                        lineWidth={1.5}
                        opacity={0.4}
                        transparent
                    />
                ))}
                {Array.from({ length: areaH + 1 }).map((_, row) => (
                    <Line
                        key={`y-${row}`}
                        points={[
                            [-gridW / 2, 0.8 + row * cellSize, 0.01],
                            [gridW / 2, 0.8 + row * cellSize, 0.01]
                        ]}
                        color={isSpace ? '#d946ef' : (isLava ? '#ea580c' : '#6d28d9')}
                        lineWidth={1.5}
                        opacity={0.4}
                        transparent
                    />
                ))}

                {/* Hover Ghost Preview */}
                {previewBlock && (
                    <GhostPreview
                        x={previewBlock.x}
                        y={previewBlock.y}
                        width={previewBlock.width}
                        height={previewBlock.height}
                        color={isSpace ? '#d946ef' : (isLava ? '#f97316' : '#22c55e')}
                    />
                )}

                {/* Ground */}
                <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={isSpace ? '#0f0729' : (isLava ? '#1c1917' : '#312e81')} />
                </mesh>
            </group>
        );
    }

    if (puzzleType === 'balance') {
        let beamColor = COLORS.wood;
        let fulcrumColor = COLORS.stone;

        if (isSpace) {
            beamColor = '#3b0764';
            fulcrumColor = '#1e1b4b';
        } else if (isLava) {
            beamColor = '#44403c';
            fulcrumColor = '#1c1917';
        }

        return (
            <group>
                {/* Fulcrum Triangle */}
                <mesh position={[0, 0.9, 0]} castShadow>
                    <coneGeometry args={[0.5, 0.8, 4]} />
                    <meshStandardMaterial color={fulcrumColor} flatShading />
                </mesh>

                {/* See-Saw Beam */}
                <group ref={beamRef} position={[0, 1.35, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[4.8, 0.12, 0.5]} />
                        <meshStandardMaterial color={beamColor} />
                    </mesh>

                    {/* Left side fixed gold weight (represents target) */}
                    <group position={[-1.8, 0.25, 0]}>
                        <mesh castShadow>
                            <sphereGeometry args={[0.25, 12, 12]} />
                            <meshStandardMaterial color={COLORS.gold} metalness={0.75} roughness={0.15} />
                        </mesh>
                        <Html center position={[0, 0.32, 0]}>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(217, 119, 6, 0.95)',
                                border: '2px solid #fbbf24',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontFamily: "'Fredoka', sans-serif",
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                pointerEvents: 'none',
                                userSelect: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15)'
                            }}>
                                {target}
                            </div>
                        </Html>
                    </group>

                    {/* Render placed weights inside the tilted beam group so they tilt dynamically */}
                    {placedBlocks.map((b) => {
                        if (b.type === 'sphere') {
                            return (
                                <AnimatedSphere
                                    key={b.id}
                                    x={b.x}
                                    y={b.y - 1.35}
                                    radius={b.radius}
                                    color={b.color}
                                    label={b.label}
                                    onClick={onBlockClick ? () => onBlockClick(b.id) : undefined}
                                />
                            );
                        }
                        if (b.type === 'balloon') {
                            return (
                                <AnimatedBalloon
                                    key={b.id}
                                    x={b.x}
                                    y={b.y - 1.35}
                                    radius={b.radius}
                                    color={b.color}
                                    label={b.label}
                                    onClick={onBlockClick ? () => onBlockClick(b.id) : undefined}
                                />
                            );
                        }
                        return null;
                    })}
                </group>

                {/* Ground */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={groundCol} />
                </mesh>
            </group>
        );
    }

    if (puzzleType === 'water') {
        const jarHeight = 1.6;
        const jarRadius = 0.6;
        const waterHeight = Math.max(0.01, Math.min(1.0, currentValue / (target || 1))) * (jarHeight - 0.1);
        const waterY = -jarHeight / 2 + waterHeight / 2 + 0.05;

        let jarColor = '#e2e8f0';
        let liquidColor = '#3b82f6'; // blue water
        if (isSpace) {
            liquidColor = '#a855f7'; // glowing purple stardust liquid
        } else if (isLava) {
            liquidColor = '#ef4444'; // glowing red lava liquid
        }

        return (
            <group>
                {/* Walkable Bridge Path across the river/lava/void */}
                <mesh position={[0, 0.75, 0]} receiveShadow>
                    <boxGeometry args={[4.8, 1.5, 1.2]} />
                    <meshStandardMaterial color={isSpace ? '#1e1b4b' : (isLava ? '#1c1917' : COLORS.wood)} roughness={0.8} />
                </mesh>

                {/* Jar & Liquid Model */}
                <group position={[0, 1.8, -1.2]}>
                    {/* Jar Glass Cylinder */}
                    <mesh castShadow receiveShadow>
                        <cylinderGeometry args={[jarRadius, jarRadius, jarHeight, 24, 1, true]} />
                        <meshStandardMaterial color={jarColor} transparent opacity={0.25} roughness={0.1} metalness={0.9} side={THREE.DoubleSide} />
                    </mesh>
                    
                    {/* Jar Base */}
                    <mesh position={[0, -jarHeight / 2, 0]}>
                        <cylinderGeometry args={[jarRadius + 0.05, jarRadius + 0.05, 0.1, 24]} />
                        <meshStandardMaterial color={isSpace ? '#3b0764' : '#78350f'} />
                    </mesh>

                    {/* Water Liquid Cylinder */}
                    {currentValue > 0 && (
                        <mesh position={[0, waterY, 0]}>
                            <cylinderGeometry args={[jarRadius - 0.02, jarRadius - 0.02, waterHeight, 24]} />
                            <meshStandardMaterial color={liquidColor} roughness={0.2} transparent opacity={0.85} emissive={liquidColor} emissiveIntensity={0.2} />
                        </mesh>
                    )}

                    {/* Scale Ticks on Jar */}
                    {Array.from({ length: 5 }).map((_, idx) => {
                        const ty = -jarHeight / 2 + ((idx + 1) / 5) * jarHeight;
                        return (
                            <group key={idx} position={[jarRadius - 0.02, ty - 0.1, 0.1]}>
                                <mesh>
                                    <boxGeometry args={[0.08, 0.02, 0.02]} />
                                    <meshStandardMaterial color="#475569" />
                                </mesh>
                            </group>
                        );
                    })}

                    {/* Labels */}
                    <Html center position={[0, 1.1, 0]}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: "'Fredoka', sans-serif",
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(59, 130, 246, 0.95)',
                                border: '2px solid #60a5fa',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                                whiteSpace: 'nowrap'
                            }}>
                                Target: {target} Liters
                            </div>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap'
                            }}>
                                Current: {currentValue} L
                            </div>
                        </div>
                    </Html>
                </group>

                {/* Ground */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={groundCol} />
                </mesh>
            </group>
        );
    }

    if (puzzleType === 'electricity') {
        const isCharged = currentValue === target;
        let bulbEmission = '#000000';
        let bulbColor = '#64748b'; // unlit grey
        let intensity = 0;

        if (currentValue > 0) {
            const ratio = Math.min(1.0, currentValue / (target || 1));
            intensity = ratio * 1.5;
            bulbColor = isCharged ? '#fbbf24' : '#f59e0b';
            bulbEmission = isCharged ? '#eab308' : '#d97706';
        }

        return (
            <group>
                {/* Walkable Bridge Path across the river/lava/void */}
                <mesh position={[0, 0.75, 0]} receiveShadow>
                    <boxGeometry args={[4.8, 1.5, 1.2]} />
                    <meshStandardMaterial color={isSpace ? '#1e1b4b' : (isLava ? '#1c1917' : COLORS.wood)} roughness={0.8} />
                </mesh>

                {/* Electrical Circuit elements */}
                <group position={[0, 1.8, -1.2]}>
                    {/* Battery/Generator Base */}
                    <mesh position={[-1.2, -0.4, 0]} castShadow>
                        <boxGeometry args={[0.7, 0.6, 0.5]} />
                        <meshStandardMaterial color={isSpace ? '#1e1b4b' : '#334155'} roughness={0.7} />
                    </mesh>
                    {/* Generator Terminals */}
                    <mesh position={[-1.4, -0.05, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
                        <meshStandardMaterial color="#ef4444" />
                    </mesh>
                    <mesh position={[-1.0, -0.05, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
                        <meshStandardMaterial color="#3b82f6" />
                    </mesh>

                    {/* Light Bulb Base */}
                    <mesh position={[1.2, -0.4, 0]} castShadow>
                        <cylinderGeometry args={[0.25, 0.35, 0.3, 16]} />
                        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
                    </mesh>
                    {/* Light Bulb Glass Sphere */}
                    <mesh position={[1.2, 0.05, 0]} castShadow>
                        <sphereGeometry args={[0.35, 24, 24]} />
                        <meshStandardMaterial color={bulbColor} emissive={bulbEmission} emissiveIntensity={intensity} roughness={0.1} transparent opacity={0.9} />
                    </mesh>

                    {/* Wires connecting generator to bulb */}
                    <mesh position={[0, -0.5, 0.1]}>
                        <boxGeometry args={[2.0, 0.03, 0.03]} />
                        <meshStandardMaterial color={isCharged ? '#eab308' : '#1e293b'} emissive={isCharged ? '#eab308' : '#000000'} emissiveIntensity={isCharged ? 0.8 : 0} />
                    </mesh>

                    {/* Power Lock HUD */}
                    <Html center position={[0, 0.8, 0]}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: "'Fredoka', sans-serif",
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}>
                            <div style={{
                                color: '#ffffff',
                                background: isCharged ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                                border: isCharged ? '2px solid #4ade80' : '2px solid #f87171',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                                whiteSpace: 'nowrap'
                            }}>
                                Target Voltage: {target} Volts
                            </div>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap'
                            }}>
                                Current Voltage: {currentValue} V
                            </div>
                        </div>
                    </Html>
                </group>

                {/* Ground */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={groundCol} />
                </mesh>
            </group>
        );
    }

    if (puzzleType === 'clock') {
        let clockFrameColor = '#78350f'; // wood frame
        let clockFaceColor = '#f8fafc'; // white face
        let handColor = '#0f172a'; // black hands

        if (isSpace) {
            clockFrameColor = '#3b0764'; // purple neon
            clockFaceColor = '#020617'; // dark face
            handColor = '#38bdf8'; // light blue neon hands
        } else if (isLava) {
            clockFrameColor = '#44403c'; // dark grey stone
            clockFaceColor = '#1c1917'; // volcanic grey
            handColor = '#f97316'; // orange hot lava hands
        }

        // Calculate hours and minutes rotation around Z axis
        // currentValue is hours (e.g. 3.0, 6.5, 9.75)
        const hourAngle = -(currentValue % 12) * (Math.PI / 6);
        const minuteAngle = -(currentValue % 1) * Math.PI * 2;

        return (
            <group>
                {/* Walkable Bridge Path across the river/lava/void */}
                <mesh position={[0, 0.75, 0]} receiveShadow>
                    <boxGeometry args={[4.8, 1.5, 1.2]} />
                    <meshStandardMaterial color={isSpace ? '#1e1b4b' : (isLava ? '#1c1917' : COLORS.wood)} roughness={0.8} />
                </mesh>

                {/* Clock Tower / Stand */}
                <group position={[0, 1.8, -1.2]}>
                    {/* Stand Pillar */}
                    <mesh position={[0, -0.6, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.4, 1.4, 0.4]} />
                        <meshStandardMaterial color={clockFrameColor} />
                    </mesh>

                    {/* Clock Outer Ring */}
                    <mesh castShadow position={[0, 0.3, 0]}>
                        <cylinderGeometry args={[1.1, 1.1, 0.25, 32]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color={clockFrameColor} roughness={0.4} />
                    </mesh>

                    {/* Clock Inner Face */}
                    <mesh position={[0, 0.3, 0.1]}>
                        <cylinderGeometry args={[0.95, 0.95, 0.1, 32]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color={clockFaceColor} roughness={0.2} emissive={isSpace ? '#38bdf8' : '#000000'} emissiveIntensity={isSpace ? 0.25 : 0} />
                    </mesh>

                    {/* Center Pin */}
                    <mesh position={[0, 0.3, 0.17]}>
                        <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} rotation={[Math.PI / 2, 0, 0]} />
                        <meshStandardMaterial color={handColor} />
                    </mesh>

                    {/* Hour Hand */}
                    <group position={[0, 0.3, 0.16]} rotation={[0, 0, hourAngle]}>
                        <mesh position={[0, 0.25, 0]} castShadow>
                            <boxGeometry args={[0.07, 0.55, 0.03]} />
                            <meshStandardMaterial color={handColor} roughness={0.1} />
                        </mesh>
                    </group>

                    {/* Minute Hand */}
                    <group position={[0, 0.3, 0.18]} rotation={[0, 0, minuteAngle]}>
                        <mesh position={[0, 0.38, 0]} castShadow>
                            <boxGeometry args={[0.045, 0.8, 0.02]} />
                            <meshStandardMaterial color={handColor} roughness={0.1} />
                        </mesh>
                    </group>

                    {/* Clock numbers or ticks */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const angle = i * (Math.PI / 6);
                        const radius = 0.75;
                        const tx = Math.sin(angle) * radius;
                        const ty = Math.cos(angle) * radius;
                        return (
                            <group key={i} position={[tx, ty + 0.3, 0.16]}>
                                {/* Small tick marks */}
                                <mesh>
                                    <boxGeometry args={[0.02, 0.1, 0.02]} rotation={[0, 0, -angle]} />
                                    <meshStandardMaterial color={clockFrameColor} />
                                </mesh>
                            </group>
                        );
                    })}

                    {/* Target Time Label and Current Time Label */}
                    <Html center position={[0, 1.4, 0]}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: "'Fredoka', sans-serif",
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(59, 130, 246, 0.95)',
                                border: '2px solid #60a5fa',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                                whiteSpace: 'nowrap'
                            }}>
                                Target: {formatTime(target)}
                            </div>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap'
                            }}>
                                Current: {formatTime(currentValue)}
                            </div>
                        </div>
                    </Html>
                </group>

                {/* Ground */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={groundCol} />
                </mesh>
            </group>
        );
    }

    if (puzzleType === 'fraction') {
        const segWidth = 0.55;
        const segGap = 0.05;
        const totalW = pieces * segWidth + (pieces - 1) * segGap;
        const startX = -totalW / 2 + segWidth / 2;

        return (
            <group>
                {/* Walkable Bridge Path across the river/lava/void */}
                <mesh position={[0, 0.75, 0]} receiveShadow>
                    <boxGeometry args={[4.8, 1.5, 1.2]} />
                    <meshStandardMaterial color={isSpace ? '#1e1b4b' : (isLava ? '#1c1917' : COLORS.wood)} roughness={0.8} />
                </mesh>

                {/* Fraction Bar Model */}
                <group position={[0, 1.8, -1.2]}>
                    {/* Background Board */}
                    <mesh castShadow receiveShadow position={[0, 0, -0.05]}>
                        <boxGeometry args={[totalW + 0.3, 0.8, 0.15]} />
                        <meshStandardMaterial color={isSpace ? '#1e1b4b' : '#78350f'} />
                    </mesh>

                    {/* Pieces (segments) */}
                    {Array.from({ length: pieces }).map((_, i) => {
                        const px = startX + i * (segWidth + segGap);
                        const isColored = i < currentValue;
                        
                        // Green if selected/colored, light blue/grey if not
                        let activeCol = '#22c55e'; // default green
                        let inactiveCol = '#cbd5e1'; // default grey
                        if (isSpace) {
                            activeCol = '#a855f7'; // purple
                            inactiveCol = '#1e1b4b'; // dark slate
                        } else if (isLava) {
                            activeCol = '#ef4444'; // red lava
                            inactiveCol = '#44403c'; // dark grey
                        }

                        const segColor = isColored ? activeCol : inactiveCol;

                        return (
                            <group key={i} position={[px, 0, 0.05]}>
                                <mesh
                                    castShadow
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSliceClick) onSliceClick(i + 1);
                                    }}
                                    onPointerOver={(e) => {
                                        e.stopPropagation();
                                        document.body.style.cursor = 'pointer';
                                    }}
                                    onPointerOut={(e) => {
                                        e.stopPropagation();
                                        document.body.style.cursor = 'auto';
                                    }}
                                >
                                    <boxGeometry args={[segWidth, 0.6, 0.15]} />
                                    <meshStandardMaterial color={segColor} roughness={0.3} />
                                </mesh>
                                {/* Little number on each slice */}
                                <Html center position={[0, 0, 0.1]}>
                                    <div style={{
                                        color: isColored ? '#ffffff' : '#475569',
                                        fontFamily: "'Fredoka', sans-serif",
                                        fontWeight: '900',
                                        fontSize: '0.8rem',
                                        pointerEvents: 'none',
                                        userSelect: 'none'
                                    }}>
                                        {i + 1}
                                    </div>
                                </Html>
                            </group>
                        );
                    })}

                    {/* Float Fraction representation */}
                    <Html center position={[0, 0.8, 0]}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: "'Fredoka', sans-serif",
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(34, 197, 94, 0.95)',
                                border: '2px solid #4ade80',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                                whiteSpace: 'nowrap'
                            }}>
                                Target: {Math.round(target * pieces)} / {pieces} ({Math.round(target * 100)}%)
                            </div>
                            <div style={{
                                color: '#ffffff',
                                background: 'rgba(15, 23, 42, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: '700',
                                fontSize: '0.75rem',
                                whiteSpace: 'nowrap'
                            }}>
                                Current: {currentValue} / {pieces}
                            </div>
                        </div>
                    </Html>
                </group>

                {/* Ground */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={groundCol} />
                </mesh>
            </group>
        );
    }

    if (puzzleType === 'pattern') {
        // Render a shelf in 3D
        const N = sequence ? sequence.length : 0;
        const totalW = (N + 1) * 0.7; // sequence + 1 slot for choice
        const startX = -totalW / 2 + 0.35;

        // Shape renderer helper
        const renderPatternShape = (shapeType, px, py, pz, keyVal, isPlaceholder = false) => {
            let shapeCol = '#ef4444'; // sphere = red
            if (shapeType === 'box') shapeCol = '#3b82f6'; // box = blue
            if (shapeType === 'cylinder') shapeCol = '#eab308'; // cylinder = yellow

            const mat = (
                <meshStandardMaterial
                    color={shapeCol}
                    roughness={0.4}
                    transparent={isPlaceholder}
                    opacity={isPlaceholder ? 0.35 : 1.0}
                />
            );

            return (
                <group key={keyVal} position={[px, py, pz]}>
                    {shapeType === 'sphere' && (
                        <mesh castShadow>
                            <sphereGeometry args={[0.22, 16, 16]} />
                            {mat}
                        </mesh>
                    )}
                    {shapeType === 'box' && (
                        <mesh castShadow>
                            <boxGeometry args={[0.36, 0.36, 0.36]} />
                            {mat}
                        </mesh>
                    )}
                    {shapeType === 'cylinder' && (
                        <mesh castShadow>
                            <cylinderGeometry args={[0.18, 0.18, 0.4, 16]} />
                            {mat}
                        </mesh>
                    )}
                </group>
            );
        };

        return (
            <group>
                {/* Walkable Bridge Path across the river/lava/void */}
                <mesh position={[0, 0.75, 0]} receiveShadow>
                    <boxGeometry args={[4.8, 1.5, 1.2]} />
                    <meshStandardMaterial color={isSpace ? '#1e1b4b' : (isLava ? '#1c1917' : COLORS.wood)} roughness={0.8} />
                </mesh>

                {/* Pattern Shelf and Shapes */}
                <group position={[0, 1.7, -1.2]}>
                    {/* The shelf */}
                    <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
                        <boxGeometry args={[totalW + 0.4, 0.1, 0.6]} />
                        <meshStandardMaterial color={isSpace ? '#1e1b4b' : '#78350f'} roughness={0.7} />
                    </mesh>

                    {/* Display existing sequence shapes */}
                    {sequence && sequence.map((shape, idx) => {
                        const px = startX + idx * 0.7;
                        return renderPatternShape(shape, px, 0, 0, `seq-${idx}`);
                    })}

                    {/* The next slot (the question / choice placement slot) */}
                    {(() => {
                        const px = startX + N * 0.7;
                        
                        // Map currentValue to shape name
                        // 1 = sphere, 2 = box, 3 = cylinder, 0 = empty/placeholder
                        let selectedShape = '';
                        if (currentValue === 1) selectedShape = 'sphere';
                        else if (currentValue === 2) selectedShape = 'box';
                        else if (currentValue === 3) selectedShape = 'cylinder';

                        if (selectedShape) {
                            return renderPatternShape(selectedShape, px, 0, 0, 'user-choice');
                        } else {
                            // Render a glowing outline or question mark
                            return (
                                <group position={[px, 0, 0]}>
                                    <mesh>
                                        <boxGeometry args={[0.4, 0.4, 0.4]} />
                                        <meshStandardMaterial color="#fbbf24" wireframe transparent opacity={0.5} />
                                    </mesh>
                                    <Html center position={[0, 0, 0.2]}>
                                        <div style={{
                                            color: '#fbbf24',
                                            fontSize: '1.2rem',
                                            fontFamily: 'Fredoka, sans-serif',
                                            fontWeight: '900',
                                            textShadow: '0 0 8px #f59e0b',
                                            pointerEvents: 'none',
                                            userSelect: 'none'
                                        }}>
                                            ?
                                        </div>
                                    </Html>
                                </group>
                            );
                        }
                    })()}

                    {/* Floating HUD instructions */}
                    <Html center position={[0, 0.8, 0]}>
                        <div style={{
                            color: '#ffffff',
                            background: 'rgba(239, 68, 68, 0.95)',
                            border: '2px solid #f87171',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            fontFamily: 'Fredoka, sans-serif',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}>
                            Complete the pattern sequence!
                        </div>
                    </Html>
                </group>

                {/* Ground */}
                <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[15, 10]} />
                    <meshStandardMaterial color={groundCol} />
                </mesh>
            </group>
        );
    }

    return null;
}

// Helper to check deadlock in area builder
function checkGridDeadlock(grid, clicksList, areaW, areaH, target) {
    if (!grid || grid.length === 0) return false;
    const totalPlaced = grid.reduce((sum, row) => sum + row.filter(cell => cell).length, 0);
    if (totalPlaced >= target) return false;

    // Check if at least one block in clicksList fits anywhere in the grid
    for (const blk of clicksList) {
        const bw = blk.w;
        const bh = blk.h;
        for (let row = 0; row <= areaH - bh; row++) {
            for (let col = 0; col <= areaW - bw; col++) {
                let fits = true;
                for (let dr = 0; dr < bh && fits; dr++) {
                    for (let dc = 0; dc < bw && fits; dc++) {
                        if (row + dr >= areaH || col + dc >= areaW || !grid[row + dr] || grid[row + dr][col + dc]) {
                            fits = false;
                        }
                    }
                }
                if (fits) return false; // Found a fit!
            }
        }
    }
    return true; // No blocks fit!
}

// --- MAIN 3D MATH CANVAS COMPONENT ---
export default function MathQuest3D({ 
    stageNum, 
    features = [], 
    onLevelComplete, 
    soundEnabled = true,
    sandboxMode = false,
    sandboxType = 'bridge',
    sandboxTarget = 10,
    onCorrectAnswer,
    onStreakUpdate,
    petColor = 'blue',
    petAccessory = 'none',
    checkpointMode = false
}) {
    let targetW = 3;
    let targetH = 3;
    if (sandboxMode) {
        if (sandboxTarget === 4) { targetW = 2; targetH = 2; }
        else if (sandboxTarget === 6) { targetW = 3; targetH = 2; }
        else if (sandboxTarget === 8) { targetW = 4; targetH = 2; }
        else if (sandboxTarget === 9) { targetW = 3; targetH = 3; }
        else if (sandboxTarget === 10) { targetW = 5; targetH = 2; }
        else if (sandboxTarget === 12) { targetW = 4; targetH = 3; }
        else if (sandboxTarget === 15) { targetW = 5; targetH = 3; }
        else if (sandboxTarget === 16) { targetW = 4; targetH = 4; }
        else if (sandboxTarget === 20) { targetW = 5; targetH = 4; }
        else if (sandboxTarget === 24) { targetW = 6; targetH = 4; }
        else if (sandboxTarget === 25) { targetW = 5; targetH = 5; }
        else if (sandboxTarget === 30) { targetW = 6; targetH = 5; }
        else {
            targetW = Math.ceil(Math.sqrt(sandboxTarget));
            targetH = Math.ceil(sandboxTarget / targetW);
        }
    }

    // Randomized (non-fixed) numbers for the current stage — generated ONCE per stage
    // (stable across re-renders) so the target doesn't shift mid-play. New numbers on
    // each stage change / remount (checkpoints remount via key).
    const randomizedParams = useMemo(() => generateStageParams(stageNum), [stageNum]);

    const params = sandboxMode 
        ? {
            type: sandboxType,
            target: sandboxType === 'area' ? targetW * targetH : sandboxTarget,
            start: sandboxType === 'sub_bridge' ? sandboxTarget + 5 : 0,
            targetW: targetW,
            targetH: targetH,
            clicks: sandboxType === 'sub_bridge'
                ? [1, 2, 3, 5]
                : (sandboxType === 'area'
                    ? [
                        {w: 2, h: 2}, 
                        {w: 2, h: 1}, 
                        {w: 3, h: 1}, 
                        {w: 1, h: 1},
                        {w: Math.max(1, targetW - 1), h: 1}
                      ].filter(c => c.w * c.h <= targetW * targetH)
                    : [1, 2, 3, 5, -1, -2].filter(c => Math.abs(c) < sandboxTarget))
          }
        : randomizedParams;

    const { type: puzzleType, target, start, clicks, pieces, sequence } = params;
    // Predefined combination options for additive (bridge/hill) puzzles.
    const comboOptions = useMemo(() => getComboOptions(target || 10), [target, stageNum, sandboxMode]);
    const stairTotalHeight = 3.0;

    const activeTimelineRef = useRef(null);
    const [poppedBonusBalloons, setPoppedBonusBalloons] = useState([]);
    const [bonusStars, setBonusStars] = useState(0);

    // WebGL context-loss self-heal: if the GL context is lost (e.g. StrictMode double-mount
    // churn in dev, or a driver hiccup), remount the <Canvas> with a fresh key instead of
    // leaving a permanently black scene. Capped so a persistent failure can't loop forever.
    const [glKey, setGlKey] = useState(0);
    const glLossCount = useRef(0);

    const [placedBlocks, setPlacedBlocks] = useState([]);
    const [currentValue, setCurrentValue] = useState(puzzleType === 'sub_bridge' ? start : 0);
    const [feedback, setFeedback] = useState({ text: '', type: '' });
    const [isAnimating, setIsAnimating] = useState(false);
    const [comboBusy, setComboBusy] = useState(false); // locks combo cards while a pick builds
    const comboArmedRef = useRef(false);               // fires checkAnswer with FRESH currentValue
    const [emitterTrigger, setEmitterTrigger] = useState(0);

    // Animating states for character wiggles
    const [heroState, setHeroState] = useState({ walking: false, celebrating: false, falling: false });
    const heroPosition = useRef(new THREE.Vector3(-4, 0.2, 0));
    const [heroPosState, setHeroPosState] = useState([-4, 0.2, 0]);
    const [isLevelCleared, setIsLevelCleared] = useState(false);

    // Combo streak and mystery chest states
    const [comboStreak, setComboStreak] = useState(0);
    const [attemptCount, setAttemptCount] = useState(0);
    const [autoBridge, setAutoBridge] = useState(null); // hill: plank from top stair to goal
    const [chompAt, setChompAt] = useState(null);       // fail: crocodile chomp location
    const [chestState, setChestState] = useState('idle'); // idle, wiggling, opened
    const [chestTaps, setChestTaps] = useState(0);
    const [chestStarsClaimed, setChestStarsClaimed] = useState(false);

    // Keep track of internal anchors
    const blockX = useRef(0);
    const currentStairY = useRef(1.5);
    const weightX = useRef(1.0);
    const [beamAngle, setBeamAngle] = useState(-0.18);

    const getThemeForStage = (stage) => {
        if (stage >= 9 && stage <= 16) return 'lava';
        if (stage >= 17) return 'space';
        return 'default';
    };

    const [selectedTheme, setSelectedTheme] = useState(() => {
        return getThemeForStage(stageNum);
    });

// Slices and hover states for improvements
    const [fallingSlices, setFallingSlices] = useState([]);
    const [risingSlices, setRisingSlices] = useState([]);
    const [hoveredBlockType, setHoveredBlockType] = useState(null);

    // Grid tracking for area puzzle
    const [areaGrid, setAreaGrid] = useState([]);
    const cellSz = 0.5;
    const areaW = params.targetW || 3;
    const areaH = params.targetH || 3;

    const selectTheme = (themeName) => {
        playSound('click');
        setSelectedTheme(themeName);
        localStorage.setItem('toy_land_selected_theme', themeName);
    };

    const getEquationString = () => {
        if (puzzleType === 'bridge') {
            if (placedBlocks.length === 0) return `0 / ${target}`;
            const expr = placedBlocks.map(b => b.label).join(' + ');
            return `${expr} = ${currentValue} / ${target}`;
        }
        if (puzzleType === 'hill') {
            if (placedBlocks.length === 0) return `0 / ${target}`;
            const expr = placedBlocks.map(b => b.label).join(' + ');
            return `${expr} = ${currentValue} / ${target}`;
        }
        if (puzzleType === 'sub_bridge') {
            if (currentValue === start) return `${start} / ${target}`;
            if (currentValue < start) {
                return `${start} - ${start - currentValue} = ${currentValue} / ${target}`;
            }
            return `${start} + ${currentValue - start} = ${currentValue} / ${target}`;
        }
        if (puzzleType === 'area') {
            if (placedBlocks.length === 0) return `0 / ${target}`;
            const expr = placedBlocks.map(b => `(${b.label})`).join(' + ');
            return `${expr} = ${currentValue} / ${target}`;
        }
        if (puzzleType === 'balance') {
            if (placedBlocks.length === 0) return `0 vs ${target}`;
            const expr = placedBlocks.map(b => {
                const val = parseInt(b.label);
                return val > 0 ? `+${val}` : `${val}`;
            }).join(' ');
            let cleanExpr = expr.trim();
            if (cleanExpr.startsWith('+')) {
                cleanExpr = cleanExpr.substring(1);
            }
            return `${cleanExpr} = ${currentValue} vs ${target}`;
        }
        if (puzzleType === 'clock') {
            return `Clock Time = ${formatTime(currentValue)} / ${formatTime(target)}`;
        }
        if (puzzleType === 'fraction') {
            return `Fraction = ${currentValue}/${pieces} vs ${Math.round(target * pieces)}/${pieces}`;
        }
        if (puzzleType === 'pattern') {
            let shapeName = 'none';
            if (currentValue === 1) shapeName = 'Sphere';
            else if (currentValue === 2) shapeName = 'Box';
            else if (currentValue === 3) shapeName = 'Cylinder';
            return `Next Shape = ${shapeName}`;
        }
        if (puzzleType === 'water') {
            return `Water Volume = ${currentValue} L / ${target} L`;
        }
        if (puzzleType === 'electricity') {
            return `Voltage = ${currentValue} V / ${target} V`;
        }
        return '';
    };

    // Clean up all active timelines on unmount
    useEffect(() => {
        return () => {
            gsap.killTweensOf(heroPosition.current);
            if (activeTimelineRef.current) {
                activeTimelineRef.current.kill();
            }
        };
    }, []);

    // Soft, calm background music while playing a math stage (the runner manages its own
    // music, so skip it in checkpoint mode to avoid overlap).
    useEffect(() => {
        if (!checkpointMode && soundEnabled) startCalmMusic();
        else stopCalmMusic();
        return () => stopCalmMusic();
    }, [soundEnabled, checkpointMode]);

    // Reset when level changes
    useEffect(() => {
        resetLevel();
        setSelectedTheme(getThemeForStage(stageNum));
    }, [stageNum]);

    const resetLevel = () => {
        gsap.killTweensOf(heroPosition.current);
        if (activeTimelineRef.current) {
            activeTimelineRef.current.kill();
            activeTimelineRef.current = null;
        }
        setPlacedBlocks([]);
        const initVal = puzzleType === 'sub_bridge' ? start : 0;
        setCurrentValue(initVal);
        setFeedback({ text: '', type: '' });
        setIsAnimating(false);
        setHeroState({ walking: false, celebrating: false, falling: false });
        setIsLevelCleared(false);
        setFallingSlices([]);
        setRisingSlices([]);
        setHoveredBlockType(null);
        setPoppedBonusBalloons([]);
        setBonusStars(0);
        setChestState('idle');
        setChestTaps(0);
        setChestStarsClaimed(false);
        setAutoBridge(null);
        setChompAt(null);
        setAttemptCount(0);

        // Reset positions
        let initX = -4;
        let initY = 1.6;
        let initZ = 0;
        if (puzzleType === 'sub_bridge') initY = 0.6;
        else if (puzzleType === 'area') {
            initY = -1.0;
            initZ = 0.8;
        } else if (puzzleType === 'balance') {
            const tempAngle = Math.max(-0.35, Math.min(0.35, (target - initVal) * 0.025));
            initX = -2.4;
            initY = 1.35 - 2.4 * Math.sin(tempAngle);
            initZ = 0.35;
        }

        heroPosition.current.set(initX, initY, initZ);
        setHeroPosState([initX, initY, initZ]);

        blockX.current = - (target * 0.4) / 2;
        if (puzzleType === 'hill') blockX.current = -1.0;
        currentStairY.current = 1.5;
        weightX.current = 0.6;
        setBeamAngle(Math.max(-0.35, Math.min(0.35, (target - initVal) * 0.025)));

        if (puzzleType === 'area') {
            setAreaGrid(Array.from({ length: areaH }, () => Array(areaW).fill(false)));
        }
    };

    // Combo card picked: rebuild from scratch and place each part (staggered so React state
    // settles between blocks), then auto-check. Correct combo wins; wrong shows feedback.
    const chooseCombo = (option) => {
        if (isAnimating || comboBusy) return;
        setComboBusy(true);            // lock the cards during the build
        resetLevel();
        playSound('click');
        const parts = option.parts;
        // Place each part on its own tick (functional state updates accumulate correctly).
        parts.forEach((p, i) => { setTimeout(() => addBlock(p), 260 * (i + 1)); });
        // Arm the check; the effect below runs checkAnswer with the CURRENT (fresh) value,
        // not a stale setTimeout closure (which previously killed the hero on a correct combo).
        setTimeout(() => { comboArmedRef.current = true; setComboBusy(false); }, 260 * (parts.length + 1) + 300);
    };

    // Run the win/lose check once a combo finished building — reads the up-to-date currentValue.
    useEffect(() => {
        if (comboBusy) return;
        if (comboArmedRef.current) { comboArmedRef.current = false; checkAnswer(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comboBusy]);

    // Pedagogical scaffolding reset: keep blocks and just return Hero to start
    const resetHeroPosition = () => {
        gsap.killTweensOf(heroPosition.current);
        if (activeTimelineRef.current) {
            activeTimelineRef.current.kill();
            activeTimelineRef.current = null;
        }
        setAutoBridge(null);
        setChompAt(null);

        let initX = -4;
        let initY = 1.6;
        let initZ = 0;
        if (puzzleType === 'sub_bridge') initY = 0.6;
        else if (puzzleType === 'area') {
            initY = -1.0;
            initZ = 0.8;
        } else if (puzzleType === 'balance') {
            const tempAngle = Math.max(-0.35, Math.min(0.35, (target - currentValue) * 0.025));
            initX = -2.4;
            initY = 1.35 - 2.4 * Math.sin(tempAngle);
            initZ = 0.35;
        }

        heroPosition.current.set(initX, initY, initZ);
        setHeroPosState([initX, initY, initZ]);

        setIsAnimating(false);
        setHeroState({ walking: false, celebrating: false, falling: false });
        setComboStreak(0);

        // Increment attempt count and show pedagogical hint
        const newAttempts = attemptCount + 1;
        setAttemptCount(newAttempts);
        
        // Get a helpful hint based on puzzle type and attempt number.
        // IMPORTANT: give only DIRECTION (more / less), never the exact remaining number —
        // otherwise the child can converge on the answer without doing the math.
        const hint = getHint(puzzleType, newAttempts - 1);
        const over = currentValue > target; // placed/counted too much

        if (puzzleType === 'sub_bridge') {
            setFeedback({ text: over ? `Not quite — cut a little more! 💡 ${hint}` : `Oops, cut too much — add some back! 💡 ${hint}`, type: 'danger' });
        } else if (puzzleType === 'area') {
            setFeedback({ text: over ? `Too many — take a block off! 💡 ${hint}` : `Almost — add a few more squares! 💡 ${hint}`, type: 'danger' });
        } else if (puzzleType === 'fraction') {
            const overF = currentValue > target * pieces;
            setFeedback({ text: overF ? `Too many slices — uncolor some! 💡 ${hint}` : `Not quite — color a few more! 💡 ${hint}`, type: 'danger' });
        } else if (puzzleType === 'pattern') {
            setFeedback({ text: `Not that shape — look at the pattern again! 💡 ${hint}`, type: 'danger' });
        } else {
            setFeedback({ text: over ? `A bit too big — try again! 💡 ${hint}` : `So close — try again! 💡 ${hint}`, type: 'danger' });
        }
    };

    // Live feedback: NEVER reveals the remaining amount or whether they're correct.
    // The child must work out the answer themselves, then tap Check Answer.
    useEffect(() => {
        // Area deadlock is a usability necessity (no valid move left)
        if (puzzleType === 'area' && checkGridDeadlock(areaGrid, clicks, areaW, areaH, target)) {
            setFeedback({ text: '😅 No room left! Tap a block to remove it, or Restart.', type: 'warning' });
            return;
        }

        const fresh = (currentValue === 0) || (puzzleType === 'sub_bridge' && currentValue === start);

        let prompt;
        if (puzzleType === 'pattern') {
            prompt = fresh ? 'Look at the pattern. Which shape comes next? 🧩'
                           : 'Sure? Tap ✨ Check Answer to test it!';
        } else if (puzzleType === 'clock') {
            prompt = fresh ? 'Move the hands, then tap ✨ Check Answer! ⏰'
                           : 'Tap ✨ Check Answer when the time looks right!';
        } else if (puzzleType === 'fraction') {
            prompt = fresh ? 'Color the right number of slices, then Check! 🍕'
                           : 'Tap ✨ Check Answer when you think it matches!';
        } else if (puzzleType === 'area') {
            prompt = fresh ? 'Fill the grid, then tap ✨ Check Answer! 📦'
                           : 'Tap ✨ Check Answer when the grid is full!';
        } else if (puzzleType === 'bridge' || puzzleType === 'hill' || puzzleType === 'electricity') {
            prompt = `Pick the combo that makes ${target}! 🧩`;
        } else {
            prompt = fresh ? 'Work it out in your head, then tap ✨ Check Answer!'
                           : 'Tap ✨ Check Answer when you think it\'s right!';
        }
        setFeedback({ text: prompt, type: 'info' });
    }, [currentValue, target, puzzleType, areaGrid, pieces]);

    // Handle adding visual blocks
    const addBlock = (val) => {
        if (isAnimating) return;

        if (puzzleType === 'clock') {
            playSound('pop');
            setCurrentValue(c => Math.min(12, Math.max(0, c + val)));
            return;
        }

        if (puzzleType === 'fraction') {
            playSound('pop');
            setCurrentValue(c => Math.min(pieces || 1, Math.max(0, c + val)));
            return;
        }

        if (puzzleType === 'pattern') {
            playSound('pop');
            setCurrentValue(val);
            return;
        }

        // Electricity (voltage) and water (volume): simple value accumulation, no 3D blocks
        if (puzzleType === 'electricity' || puzzleType === 'water') {
            if (val > 0 && currentValue + val > target + 10) {
                setFeedback({ text: '⚠️ Too much! Keep it close to the target.', type: 'warning' });
                return;
            }
            playSound('pop');
            setCurrentValue(c => Math.max(0, c + val));
            setEmitterTrigger(t => t + 1);
            return;
        }

        // Logical Safeguard: Block count limit to prevent mesh rendering overflow
        if (placedBlocks.length >= 15 && val > 0) {
            setFeedback({ text: '⚠️ Too many blocks! Click a block to remove it.', type: 'warning' });
            return;
        }

        // Logical Safeguard: Clamping values to avoid extreme balance weights
        if (puzzleType === 'balance') {
            if (val < 0 && currentValue + val < -10) {
                setFeedback({ text: '⚠️ Scale is too high! Add some heavy spheres to balance it.', type: 'warning' });
                return;
            }
            if (val > 0 && currentValue + val > target + 10) {
                setFeedback({ text: '⚠️ Scale is too heavy! Use balloons to lift it.', type: 'warning' });
                return;
            }
        } else {
            if (val > 0 && currentValue + val > target + 10) {
                setFeedback({ text: '⚠️ Value is too high! Keep it close to the target.', type: 'warning' });
                return;
            }
        }

        playSound('pop');

        if (puzzleType === 'bridge') {
            const gapW = Math.min(target * 0.4, 5);
            const blockWidth = Math.abs(val) * (gapW / target);

            if (val < 0) {
                // Subtraction: Shrink last placed blocks
                let remaining = blockWidth;
                const newPlaced = [...placedBlocks];

                while (remaining > 0.001 && newPlaced.length > 0) {
                    const lastIdx = newPlaced.length - 1;
                    const lastBlock = newPlaced[lastIdx];
                    const w = lastBlock.width;

                    if (w <= remaining + 0.001) {
                        newPlaced.pop();
                        remaining -= w;
                        blockX.current -= w;
                    } else {
                        newPlaced[lastIdx] = {
                            ...lastBlock,
                            width: w - remaining,
                            x: lastBlock.x - remaining / 2
                        };
                        blockX.current -= remaining;
                        remaining = 0;
                    }
                }
                setPlacedBlocks(newPlaced);
                setCurrentValue(c => Math.max(0, c + val));
                emitter.spawn(new THREE.Vector3(blockX.current, 1.65, 0), 10, COLORS.blockRed);
                setEmitterTrigger(t => t + 1);
            } else {
                // Boundary Check: Check if bridge crosses gap too far
                if (blockX.current + blockWidth > (gapW / 2) + 0.5) {
                    setFeedback({ text: '⚠️ Bridge is full! You have reached the other side.', type: 'warning' });
                    return;
                }
                // Addition: Place block
                const xPos = blockX.current + blockWidth / 2;
                const newBlock = {
                    id: Math.random(),
                    type: 'box',
                    x: xPos,
                    y: 1.65,
                    width: blockWidth,
                    height: 0.3,
                    depth: 0.6,
                    color: getColorForValue(val),
                    label: val.toString()
                };
                setPlacedBlocks(prev => [...prev, newBlock]);
                blockX.current += blockWidth;
                setCurrentValue(c => c + val);
                emitter.spawn(new THREE.Vector3(xPos, 1.65, 0), 8, newBlock.color);
                setEmitterTrigger(t => t + 1);
            }
        }

        if (puzzleType === 'hill') {
            const unitH = 3.0 / target;
            const blockH = Math.abs(val) * unitH;

            if (val < 0) {
                // Dig: Shrink/remove last stair blocks
                if (placedBlocks.length === 0) return;
                let remaining = blockH;
                const newPlaced = [...placedBlocks];

                while (remaining > 0.001 && newPlaced.length > 0) {
                    const lastIdx = newPlaced.length - 1;
                    const lastBlock = newPlaced[lastIdx];
                    const h = lastBlock.height;

                    if (h <= remaining + 0.001) {
                        newPlaced.pop();
                        remaining -= h;
                        currentStairY.current -= h;
                        blockX.current -= 0.6;
                    } else {
                        newPlaced[lastIdx] = {
                            ...lastBlock,
                            height: h - remaining,
                            y: lastBlock.y - remaining / 2
                        };
                        currentStairY.current -= remaining;
                        remaining = 0;
                    }
                }
                setPlacedBlocks(newPlaced);
                setCurrentValue(c => Math.max(0, c + val));
                emitter.spawn(new THREE.Vector3(blockX.current, currentStairY.current, 0), 10, COLORS.blockRed);
                setEmitterTrigger(t => t + 1);
            } else {
                // Boundary Check: Check if stairs go past right cliff bank
                if (blockX.current + 0.6 > 3.5) {
                    setFeedback({ text: '⚠️ Stairs are full! They have reached the mountain wall.', type: 'warning' });
                    return;
                }
                // Add stair step
                const stepX = blockX.current + 0.3;
                const stepY = currentStairY.current + blockH / 2;
                const newBlock = {
                    id: Math.random(),
                    type: 'box',
                    x: stepX,
                    y: stepY,
                    width: 0.56,
                    height: blockH,
                    depth: 0.8,
                    color: getColorForValue(val),
                    label: val.toString()
                };
                setPlacedBlocks(prev => [...prev, newBlock]);
                currentStairY.current += blockH;
                blockX.current += 0.6;
                setCurrentValue(c => c + val);
                emitter.spawn(new THREE.Vector3(stepX, stepY, 0), 8, newBlock.color);
                setEmitterTrigger(t => t + 1);
            }
        }

        if (puzzleType === 'balance') {
            const rad = radiusForVal(val);
            const nextWeightLimit = weightX.current + rad * (val < 0 ? 2.4 : 2.0);
            if (val !== 0 && nextWeightLimit > 2.45) {
                setFeedback({ text: '⚠️ Scale is full! Remove some weights to place new ones.', type: 'warning' });
                return;
            }

            if (val < 0) {
                // Balloon lift
                const newBalloon = {
                    id: Math.random(),
                    type: 'balloon',
                    x: weightX.current,
                    y: 1.45,
                    radius: rad,
                    color: getColorForValue(Math.abs(val)),
                    label: val.toString()
                };
                setPlacedBlocks([...placedBlocks, newBalloon]);
                weightX.current += rad * 2.4 + 0.1;
                setCurrentValue(c => c + val);
                // Adjust beam rotation
                setBeamAngle(Math.max(-0.35, Math.min(0.35, (target - (currentValue + val)) * 0.025)));
                emitter.spawn(new THREE.Vector3(newBalloon.x, 2.5, 0), 6, newBalloon.color);
                setEmitterTrigger(t => t + 1);
            } else {
                // Heavy sphere
                const newSphere = {
                    id: Math.random(),
                    type: 'sphere',
                    x: weightX.current,
                    y: 1.35 + rad + 0.06,
                    radius: rad,
                    color: getColorForValue(val),
                    label: val.toString()
                };
                setPlacedBlocks([...placedBlocks, newSphere]);
                weightX.current += rad * 2 + 0.1;
                setCurrentValue(c => c + val);
                setBeamAngle(Math.max(-0.35, Math.min(0.35, (target - (currentValue + val)) * 0.025)));
                emitter.spawn(new THREE.Vector3(newSphere.x, newSphere.y, 0), 6, newSphere.color);
                setEmitterTrigger(t => t + 1);
            }
        }
    };

    // Sub bridge log slicing
    const sliceLog = (val) => {
        if (isAnimating) return;
        if (currentValue - val < 0) {
            setFeedback({ text: '❌ Can\'t slice off more than exists!', type: 'danger' });
            return;
        }
        playSound('pop');
        const nextVal = currentValue - val;
        setCurrentValue(nextVal);

        const unit = 3.0 / target;
        const leftEdge = -1.5;
        // Sliced chunk falls off the RIGHT end of the (left-anchored) log
        const sliceWidth = (currentValue - nextVal) * unit;
        const sliceX = leftEdge + nextVal * unit + sliceWidth / 2;

        let logColor = COLORS.wood;
        if (selectedTheme === 'space') logColor = '#06b6d4';
        else if (selectedTheme === 'lava') logColor = '#292524';

        const newSlice = {
            id: Math.random(),
            x: sliceX,
            y: 0.65,
            width: sliceWidth,
            color: getColorForValue(val),
            theme: selectedTheme
        };

        setFallingSlices(prev => [...prev, newSlice]);
        setTimeout(() => {
            setFallingSlices(prev => prev.filter(s => s.id !== newSlice.id));
        }, 1500);

        emitter.spawn(new THREE.Vector3(sliceX, 0.65, 0), 12, newSlice.color);
        setEmitterTrigger(t => t + 1);
    };

    const addBackLog = (val) => {
        if (isAnimating) return;
        if (currentValue + val > start) {
            setFeedback({ text: '❌ Can\'t add back more than the original log!', type: 'danger' });
            return;
        }
        playSound('pop');
        const nextVal = currentValue + val;
        setCurrentValue(nextVal);

        const unit = 3.0 / target;
        const leftEdge = -1.5;
        // Added piece appears at the RIGHT end of the (left-anchored) log
        const sliceWidth = (nextVal - currentValue) * unit;
        const sliceX = leftEdge + currentValue * unit + sliceWidth / 2;

        const newSlice = {
            id: Math.random(),
            x: sliceX,
            y: 0.65,
            width: sliceWidth,
            color: getColorForValue(val),
            theme: selectedTheme
        };

        setRisingSlices(prev => [...prev, newSlice]);
        setTimeout(() => {
            setRisingSlices(prev => prev.filter(s => s.id !== newSlice.id));
        }, 1000);

        emitter.spawn(new THREE.Vector3(sliceX, 0.65, 0), 8, newSlice.color);
        setEmitterTrigger(t => t + 1);
    };

    // Area puzzle grid block placement
    const addAreaBlock = (bw, bh) => {
        if (isAnimating) return;
        let placed = false;
        const newGrid = [...areaGrid];

        for (let row = 0; row <= areaH - bh && !placed; row++) {
            for (let col = 0; col <= areaW - bw && !placed; col++) {
                let fits = true;
                for (let dc = 0; dc < bw && fits; dc++) {
                    for (let dr = 0; dr < bh && fits; dr++) {
                        if (row + dr >= areaH || newGrid[row + dr][col + dc]) fits = false;
                    }
                }
                if (fits) {
                    for (let dc = 0; dc < bw; dc++) {
                        for (let dr = 0; dr < bh; dr++) {
                            newGrid[row + dr][col + dc] = true;
                        }
                    }
                    setAreaGrid(newGrid);

                    const x = -(areaW * cellSz) / 2 + (col + bw / 2) * cellSz;
                    const y = 0.8 + (row + bh / 2) * cellSz;

                    const newBlock = {
                        id: Math.random(),
                        type: 'box',
                        x, y,
                        width: bw * cellSz - 0.04,
                        height: bh * cellSz - 0.04,
                        depth: 0.12,
                        color: getColorForValue(bw * bh),
                        label: `${bw}x${bh}`,
                        gridCol: col,
                        gridRow: row,
                        gridW: bw,
                        gridH: bh
                    };

                    setPlacedBlocks(prev => [...prev, newBlock]);
                    setCurrentValue(c => c + bw * bh);
                    placed = true;
                    playSound('pop');
                    emitter.spawn(new THREE.Vector3(x, y, 0), 6, newBlock.color);
                    setEmitterTrigger(t => t + 1);
                }
            }
        }

        if (!placed) {
            setFeedback({ text: '❌ No room for that block!', type: 'danger' });
        }
    };

    // Click-to-Undo remove block function
    const removeBlock = (blockId) => {
        if (isAnimating) return;
        const blockToRemove = placedBlocks.find(b => b.id === blockId);
        if (!blockToRemove) return;

        playSound('pop');
        let pColor = blockToRemove.color || COLORS.blockBlue;
        emitter.spawn(new THREE.Vector3(blockToRemove.x, blockToRemove.y, 0), 12, pColor);
        setEmitterTrigger(t => t + 1);

        const newPlaced = placedBlocks.filter(b => b.id !== blockId);

        if (puzzleType === 'bridge') {
            const gapW = Math.min(target * 0.4, 5);
            let currentX = - gapW / 2;
            const rebuiltPlaced = newPlaced.map(b => {
                const nextX = currentX + b.width / 2;
                const updatedBlock = {
                    ...b,
                    x: nextX
                };
                currentX += b.width;
                return updatedBlock;
            });
            setPlacedBlocks(rebuiltPlaced);
            blockX.current = currentX;

            // Recalculate currentValue
            let totalVal = 0;
            newPlaced.forEach(b => {
                totalVal += parseInt(b.label) || 0;
            });
            setCurrentValue(totalVal);

        } else if (puzzleType === 'hill') {
            let currentY = 1.5;
            let currentX = -1.0;
            const rebuiltPlaced = newPlaced.map((b) => {
                const stepX = currentX + 0.3;
                const stepY = currentY + b.height / 2;
                const updatedBlock = {
                    ...b,
                    x: stepX,
                    y: stepY
                };
                currentY += b.height;
                currentX += 0.6;
                return updatedBlock;
            });
            setPlacedBlocks(rebuiltPlaced);
            currentStairY.current = currentY;
            blockX.current = currentX;

            // Recalculate currentValue
            let totalVal = 0;
            newPlaced.forEach(b => {
                totalVal += parseInt(b.label) || 0;
            });
            setCurrentValue(totalVal);

        } else if (puzzleType === 'balance') {
            let currentWeightX = 0.6;
            let rebuiltVal = 0;
            const rebuiltPlaced = newPlaced.map(b => {
                const r = b.radius;
                let updatedBlock = { ...b };
                if (b.type === 'sphere') {
                    updatedBlock.x = currentWeightX;
                    updatedBlock.y = 1.35 + r + 0.06;
                    currentWeightX += r * 2 + 0.1;
                    rebuiltVal += parseInt(b.label);
                } else {
                    updatedBlock.x = currentWeightX;
                    updatedBlock.y = 1.45;
                    currentWeightX += r * 2.4 + 0.1;
                    rebuiltVal += parseInt(b.label);
                }
                return updatedBlock;
            });
            setPlacedBlocks(rebuiltPlaced);
            weightX.current = currentWeightX;
            setCurrentValue(rebuiltVal);
            setBeamAngle(Math.max(-0.35, Math.min(0.35, (target - rebuiltVal) * 0.025)));

        } else if (puzzleType === 'area') {
            const newGrid = [...areaGrid];
            for (let dr = 0; dr < blockToRemove.gridH; dr++) {
                for (let dc = 0; dc < blockToRemove.gridW; dc++) {
                    const r = blockToRemove.gridRow + dr;
                    const c = blockToRemove.gridCol + dc;
                    if (newGrid[r] && c < newGrid[r].length) {
                        newGrid[r][c] = false;
                    }
                }
            }
            setAreaGrid(newGrid);
            setPlacedBlocks(newPlaced);
            const val = blockToRemove.gridW * blockToRemove.gridH;
            setCurrentValue(c => Math.max(0, c - val));
        }
    };

    const radiusForVal = (val) => 0.12 + Math.abs(val) * 0.025;

    // Check final answer and run visual sequence
    const checkAnswer = () => {
        if (isAnimating) return;
        setIsAnimating(true);

        let isCorrect = false;
        if (puzzleType === 'fraction') {
            isCorrect = Math.abs((currentValue / (pieces || 1)) - target) < 0.01;
        } else {
            isCorrect = currentValue === target;
        }

        if (isCorrect) {
            const nextStreak = comboStreak + 1;
            setComboStreak(nextStreak);
            playStreakComboSound(nextStreak);

            if (typeof onCorrectAnswer === 'function') {
                onCorrectAnswer();
            }
            if (typeof onStreakUpdate === 'function') {
                onStreakUpdate(nextStreak);
            }

            const randomPraise = getRandomPraise();
            setFeedback({ text: `${randomPraise} (${nextStreak}x Streak!)`, type: 'success' });

            // Stages with a goal platform to cross vs. "in-place" stages (stay put & cheer)
            const inPlace = ['electricity', 'clock', 'fraction', 'pattern', 'water'].includes(puzzleType);

            setHeroState({ walking: !inPlace, celebrating: inPlace, falling: false });

            let endX = 4.5;
            let endY = heroPosition.current.y;
            let endZ = heroPosition.current.z;

            if (puzzleType === 'hill') {
                endX = 2.4;
                endY = stairTotalHeight + 1.6;
            } else if (puzzleType === 'area') {
                endX = 3.5;
                endY = -1.0;
            } else if (puzzleType === 'balance') {
                endX = 3.5;
                endY = -0.5;
            } else if (puzzleType === 'bridge') {
                endY = 1.6;
            } else if (puzzleType === 'sub_bridge') {
                endY = 0.6;
            } else if (inPlace) {
                endX = heroPosition.current.x; // don't walk off into empty space
            }

            // Animate hero walk
            const tl = gsap.timeline({
                onComplete: () => {
                    setHeroState({ walking: false, celebrating: true, falling: false });
                    playSound('coin');
                    emitter.spawn(new THREE.Vector3(endX, endY + 1.2, endZ), 35, '#fbbf24', 1.5, true);
                    setEmitterTrigger(t => t + 1);
                    setTimeout(() => {
                        setIsLevelCleared(true);
                    }, 1200);
                }
            });
            activeTimelineRef.current = tl;

            // If hill, glide up smoothly (escalator) then auto-bridge to the goal
            if (puzzleType === 'hill') {
                const top = placedBlocks[placedBlocks.length - 1];
                const topX = top ? top.x : -0.7;
                const goalTopY = stairTotalHeight + 1.6; // 4.6
                // walk to the base of the staircase
                tl.to(heroPosition.current, { x: -1.1, y: 1.6, duration: 0.5, ease: 'power1.inOut' });
                // smooth elevator glide up to the top of the stairs
                tl.to(heroPosition.current, { x: topX, y: goalTopY, duration: 1.1, ease: 'power2.inOut' });
                // extend an auto-bridge plank from the top stair to the goal platform
                tl.call(() => setAutoBridge({ x1: topX, x2: 1.7, y: goalTopY - 0.12 }));
                tl.to(heroPosition.current, { x: topX, duration: 0.12 }); // tiny pause
                // walk across the plank onto the goal
                tl.to(heroPosition.current, { x: endX, y: endY, duration: 0.9, ease: 'power1.inOut' });
            } else if (puzzleType === 'balance') {
                // Walk along the tilted beam
                tl.to(heroPosition.current, {
                    x: 2.4,
                    y: 1.35 + 2.4 * Math.sin(beamAngle),
                    duration: 1.8,
                    ease: 'power1.inOut'
                });
                // Step down to the ground
                tl.to(heroPosition.current, {
                    x: endX,
                    y: endY,
                    duration: 0.5,
                    ease: 'power1.out'
                });
            } else {
                tl.to(heroPosition.current, { x: endX, duration: inPlace ? 0.9 : 2.2 });
            }

            // Keep local state in sync for re-renders
            tl.eventCallback('onUpdate', () => {
                setHeroPosState(heroPosition.current.toArray());
            });

        } else {
            // Failure
            playSound('sad');

            // Only bridge/hill/sub_bridge have water/hazard to fall into.
            const waterStage = ['bridge', 'hill', 'sub_bridge'].includes(puzzleType);

            if (!waterStage) {
                // In-place "oops" stumble (no pit to fall into on these stages)
                setHeroState({ walking: false, celebrating: false, falling: false });
                const sx = heroPosition.current.x;
                const sy = heroPosition.current.y;
                const tl = gsap.timeline({
                    onComplete: () => { setTimeout(() => { resetHeroPosition(); }, 600); }
                });
                activeTimelineRef.current = tl;
                tl.to(heroPosition.current, { x: sx - 0.12, duration: 0.08, yoyo: true, repeat: 5, ease: 'power1.inOut' });
                tl.to(heroPosition.current, { y: sy - 0.18, duration: 0.25, ease: 'power2.out' });
                tl.to(heroPosition.current, { y: sy, duration: 0.25, ease: 'power1.out' });
                tl.eventCallback('onUpdate', () => { setHeroPosState(heroPosition.current.toArray()); });
                return;
            }

            setHeroState({ walking: true, celebrating: false, falling: false });

            let failX = heroPosition.current.x + 2.0;
            let failZ = heroPosition.current.z;

            if (puzzleType === 'bridge') {
                const gapW = Math.min(target * 0.4, 5);
                failX = currentValue < target ? blockX.current : gapW / 2 + 0.8;
            } else if (puzzleType === 'sub_bridge') {
                // walk to the right end of the (too-short) log, then drop into the river
                failX = Math.min(1.4, -1.5 + currentValue * (3.0 / target));
            }

            const tl = gsap.timeline({
                onComplete: () => {
                    setHeroState({ walking: false, celebrating: false, falling: true });
                    gsap.to(heroPosition.current, {
                        y: -2.6,
                        duration: 0.7,
                        ease: 'power2.in',
                        onComplete: () => {
                            const isLava = selectedTheme === 'lava';
                            const isSpace = selectedTheme === 'space';
                            emitter.spawn(
                                new THREE.Vector3(failX, isLava ? -0.8 : -0.2, failZ),
                                34,
                                isLava ? '#f97316' : (isSpace ? '#c084fc' : '#7dd3fc'),
                                1.6
                            );
                            setEmitterTrigger(t => t + 1);
                            playSound('whoosh');
                            if (!isLava && !isSpace) {
                                const waterY = puzzleType === 'sub_bridge' ? 0.0 : -0.55;
                                setChompAt({ x: failX, z: failZ, y: waterY });
                            }
                            setTimeout(() => { setChompAt(null); resetHeroPosition(); }, 1400);
                        }
                    });
                }
            });
            activeTimelineRef.current = tl;

            if (puzzleType === 'hill') {
                const top = placedBlocks[placedBlocks.length - 1];
                const topX = top ? top.x : -0.7;
                const topY = top ? top.y + top.height / 2 + 0.1 : 1.6;
                tl.to(heroPosition.current, { x: -1.1, y: 1.6, duration: 0.5, ease: 'power1.inOut' });
                tl.to(heroPosition.current, { x: topX, y: topY, duration: 0.9, ease: 'power2.inOut' });
                tl.to(heroPosition.current, { x: topX + 0.5, duration: 0.35, ease: 'power1.in' });
            } else {
                tl.to(heroPosition.current, { x: failX, duration: 1.5 });
            }

            tl.eventCallback('onUpdate', () => {
                setHeroPosState(heroPosition.current.toArray());
            });
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', background: '#000' }}>
            {/* --- REALM THEME BAR (above the game frame) --- */}
            <div className="game-theme-bar no-print">
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#475569' }}>🌈 Realm Theme:</span>
                <button
                    onClick={() => selectTheme('default')}
                    style={{ ...themeBtnStyle, background: selectedTheme === 'default' ? '#10b981' : '#f1f5f9', color: selectedTheme === 'default' ? 'white' : '#475569', borderColor: selectedTheme === 'default' ? '#059669' : '#cbd5e1' }}
                >🌳 Forest</button>
                <button
                    onClick={() => selectTheme('lava')}
                    style={{ ...themeBtnStyle, background: selectedTheme === 'lava' ? '#f97316' : '#f1f5f9', color: selectedTheme === 'lava' ? 'white' : '#475569', borderColor: selectedTheme === 'lava' ? '#ea580c' : '#cbd5e1' }}
                >🌋 Lava</button>
                <button
                    onClick={() => selectTheme('space')}
                    style={{ ...themeBtnStyle, background: selectedTheme === 'space' ? '#8b5cf6' : '#f1f5f9', color: selectedTheme === 'space' ? 'white' : '#475569', borderColor: selectedTheme === 'space' ? '#7c3aed' : '#cbd5e1' }}
                >🌌 Cosmic</button>
            </div>

            {/* --- GAME FRAME (3D canvas + HUD overlays) --- */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <Canvas key={glKey} shadows camera={{ position: [0, 4.2, 10], fov: 46 }}
                onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (ev) => {
                        ev.preventDefault(); // allow restoration
                        // Self-heal: remount the Canvas with a fresh context (capped).
                        if (glLossCount.current < 3) {
                            glLossCount.current += 1;
                            setTimeout(() => setGlKey((k) => k + 1), 250);
                        }
                    }, false);
                }}>
                <Environment puzzleType={puzzleType} stageNum={stageNum} theme={selectedTheme} />
                <CameraRig puzzleType={puzzleType} target={target} stairTotalHeight={3.0} />
                
                <PuzzleScene
                    puzzleType={puzzleType}
                    target={target}
                    start={start}
                    currentValue={currentValue}
                    placedBlocks={placedBlocks}
                    gapWidth={target * 0.4}
                    stairTotalHeight={3.0}
                    beamAngle={beamAngle}
                    areaW={areaW}
                    areaH={areaH}
                    stageNum={stageNum}
                    theme={selectedTheme}
                    areaGrid={areaGrid}
                    hoveredBlockType={hoveredBlockType}
                    fallingSlices={fallingSlices}
                    risingSlices={risingSlices}
                    onBlockClick={removeBlock}
                    onSliceClick={(val) => { if (!isAnimating) setCurrentValue(val); }}
                    pieces={pieces}
                    sequence={sequence}
                />

                {/* Math-as-combat: a goofy gloom-bot that gets EXPOSED as the puzzle progresses,
                    and a caged friend freed when the level is cleared (checkpoint/boss stage only). */}
                {checkpointMode && (
                    <BossFight
                        progress={Math.min(1, (puzzleType === 'fraction' ? (currentValue / (pieces || 1)) / (target || 1) : currentValue / (target || 1)) || 0)}
                        cleared={isLevelCleared}
                        theme={selectedTheme}
                    />
                )}

                {/* Hill: auto-bridge plank from top stair to the goal platform */}
                {autoBridge && (
                    <group>
                        <mesh position={[(autoBridge.x1 + autoBridge.x2) / 2, autoBridge.y, 0]} castShadow>
                            <boxGeometry args={[Math.abs(autoBridge.x2 - autoBridge.x1) + 0.4, 0.1, 0.9]} />
                            <meshStandardMaterial color={COLORS.wood} roughness={0.7} />
                        </mesh>
                        {/* plank slats */}
                        {Array.from({ length: 4 }).map((_, i) => (
                            <mesh key={i} position={[(autoBridge.x1 + autoBridge.x2) / 2 + (i - 1.5) * 0.28, autoBridge.y + 0.06, 0]}>
                                <boxGeometry args={[0.05, 0.04, 0.9]} />
                                <meshStandardMaterial color="#92400e" roughness={0.8} />
                            </mesh>
                        ))}
                    </group>
                )}

                {/* Fail: crocodile chomp reaction in water levels */}
                {chompAt && (
                    <ChompCrocodile position={[chompAt.x, chompAt.y ?? -0.55, chompAt.z || 0]} />
                )}

                {/* Placed Blocks */}
                {placedBlocks.map((b) => {
                    if (b.type === 'box') {
                        return (
                            <AnimatedBox
                                key={b.id}
                                x={b.x}
                                y={b.y}
                                width={b.width}
                                height={b.height}
                                depth={b.depth}
                                color={b.color}
                                label={b.label}
                                onClick={() => removeBlock(b.id)}
                            />
                        );
                    }
                    if (b.type === 'sphere' && puzzleType !== 'balance') {
                        return (
                            <AnimatedSphere
                                key={b.id}
                                x={b.x}
                                y={b.y}
                                radius={b.radius}
                                color={b.color}
                                label={b.label}
                                onClick={() => removeBlock(b.id)}
                            />
                        );
                    }
                    if (b.type === 'balloon' && puzzleType !== 'balance') {
                        return (
                            <AnimatedBalloon
                                key={b.id}
                                x={b.x}
                                y={b.y}
                                radius={b.radius}
                                color={b.color}
                                label={b.label}
                                onClick={() => removeBlock(b.id)}
                            />
                        );
                    }
                    return null;
                })}

                {/* Hero Footstep Particle Trail */}
                <HeroTrailEmitter
                    walking={heroState.walking}
                    position={heroPosState}
                    theme={selectedTheme}
                />

                {/* Character */}
                <Hero3D
                    position={heroPosState}
                    features={features}
                    isWalking={heroState.walking}
                    isCelebrating={heroState.celebrating}
                    isFalling={heroState.falling}
                    scale={0.9}
                    petColor={petColor}
                    petAccessory={petAccessory}
                />

                {/* Dynamic Particle System */}
                <ParticleRenderer trigger={emitterTrigger} />
            </Canvas>

            {/* --- TOP HUD OVERLAY --- */}
            <div className="game-top-hud">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                    <div style={badgeStyle}>{sandboxMode ? '🧪 Sandbox' : `Stage ${stageNum}`}</div>
                    <div className="game-objective">
                        {puzzleType === 'bridge' && <>Build a bridge to reach <strong>{target}</strong>! 🌉</>}
                        {puzzleType === 'hill' && <>Build stairs <strong>{target}</strong> high! 🧗</>}
                        {puzzleType === 'sub_bridge' && <>Cut the log from <strong>{start}</strong> to <strong>{target}</strong>! ✂️</>}
                        {puzzleType === 'area' && <>Fill a <strong>{areaW}×{areaH}</strong> grid ({target} squares)! 📦</>}
                        {puzzleType === 'balance' && <>Balance the scale to <strong>{target}</strong>! ⚖️</>}
                        {puzzleType === 'clock' && <>Set the clock to <strong>{formatTime(target)}</strong>! ⏰</>}
                        {puzzleType === 'fraction' && <>Color <strong>{Math.round(target * pieces)}</strong> of <strong>{pieces}</strong> slices! 🍕</>}
                        {puzzleType === 'pattern' && <>What shape comes next? 🧩</>}
                        {puzzleType === 'water' && <>Fill to <strong>{target}</strong> liters! 💧</>}
                        {puzzleType === 'electricity' && <>Power up to <strong>{target}</strong> volts! ⚡</>}
                    </div>
                </div>
                
                {/* Active Equation and Feedback */}
                <div className={`active-eq-container ${feedback.type === 'success' ? 'success' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '15px' }}>
                        <div style={{ fontFamily: 'Fredoka, monospace', fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', flexGrow: 1, textAlign: 'left' }}>
                            {getEquationString()}
                        </div>
                        {comboStreak > 0 && (
                            <span style={{
                                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '900',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                            }}>
                                🔥 {comboStreak}x Streak
                            </span>
                        )}
                    </div>
                    {feedback.text && (
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: feedback.type === 'success' ? '#166534' : '#64748b', marginTop: '2px', width: '100%', textAlign: 'left' }}>
                            {feedback.text}
                        </div>
                    )}
                </div>
            </div>

            {/* --- BOTTOM CONTROLS OVERLAY --- */}
            <div className="game-bottom-hud">
                {/* Mathematical inputs buttons */}
                <div style={controlsRowStyle}>
                    {puzzleType === 'sub_bridge' ? (
                        <>
                            {/* Slice Buttons */}
                            {clicks.filter(c => c > 0).map(val => {
                                const bg = getColorForValue(val);
                                const fg = getTextColorForBackground(bg);
                                return (
                                    <button
                                        key={`slice-${val}`}
                                        className="bubble-btn"
                                        onClick={() => sliceLog(val)}
                                        disabled={isAnimating}
                                        style={{
                                            ...btnStyle,
                                            background: bg,
                                            color: fg,
                                            borderColor: bg,
                                            boxShadow: `0 4px 0 ${bg}88`
                                        }}
                                    >
                                        🪓 Slice {val}
                                    </button>
                                );
                            })}
                            {/* Add Back Buttons */}
                            {currentValue < start && clicks.map(val => {
                                const absV = Math.abs(val);
                                const bg = getColorForValue(absV);
                                const fg = getTextColorForBackground(bg);
                                return (
                                    <button
                                        key={`addback-${absV}`}
                                        className="bubble-btn"
                                        onClick={() => addBackLog(absV)}
                                        disabled={isAnimating}
                                        style={{
                                            ...btnStyle,
                                            background: bg,
                                            color: fg,
                                            borderColor: bg,
                                            boxShadow: `0 4px 0 ${bg}88`
                                        }}
                                    >
                                        ➕ Add {absV}
                                    </button>
                                );
                            })}
                        </>
                    ) : puzzleType === 'area' ? (
                        <>
                            {/* Area Block Buttons */}
                            {clicks.map((blk, idx) => {
                                const bg = getColorForValue(blk.w * blk.h);
                                const fg = getTextColorForBackground(bg);
                                return (
                                    <button
                                        key={idx}
                                        className="bubble-btn"
                                        onClick={() => addAreaBlock(blk.w, blk.h)}
                                        onMouseEnter={() => setHoveredBlockType({ w: blk.w, h: blk.h })}
                                        onMouseLeave={() => setHoveredBlockType(null)}
                                        disabled={isAnimating}
                                        style={{
                                            ...btnStyle,
                                            background: bg,
                                            color: fg,
                                            borderColor: bg,
                                            boxShadow: `0 4px 0 ${bg}88`
                                        }}
                                    >
                                        📦 Add {blk.w}x{blk.h}
                                    </button>
                                );
                            })}
                        </>
                    ) : puzzleType === 'clock' ? (
                        <>
                            {clicks.map((val, idx) => {
                                const bg = getColorForValue(idx + 1);
                                const fg = getTextColorForBackground(bg);
                                let label = '';
                                if (val === 1.0) label = '➕ 1 Hour';
                                else if (val === 2.0) label = '➕ 2 Hours';
                                else if (val === 3.0) label = '➕ 3 Hours';
                                else if (val === 0.5) label = '➕ 30 Min';
                                else if (val === 0.25) label = '➕ 15 Min';
                                else label = `➕ ${val} Hrs`;
                                return (
                                    <button
                                        key={idx}
                                        className="bubble-btn"
                                        onClick={() => addBlock(val)}
                                        disabled={isAnimating}
                                        style={{
                                            ...btnStyle,
                                            background: bg,
                                            color: fg,
                                            borderColor: bg,
                                            boxShadow: `0 4px 0 ${bg}88`
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </>
                    ) : puzzleType === 'fraction' ? (
                        <>
                            {clicks.map((val, idx) => {
                                const bg = getColorForValue(val);
                                const fg = getTextColorForBackground(bg);
                                return (
                                    <button
                                        key={idx}
                                        className="bubble-btn"
                                        onClick={() => addBlock(val)}
                                        disabled={isAnimating}
                                        style={{
                                            ...btnStyle,
                                            background: bg,
                                            color: fg,
                                            borderColor: bg,
                                            boxShadow: `0 4px 0 ${bg}88`
                                        }}
                                    >
                                        ➕ Color {val}
                                    </button>
                                );
                            })}
                        </>
                    ) : puzzleType === 'pattern' ? (
                        <>
                            <button
                                className="bubble-btn"
                                onClick={() => addBlock(1)}
                                disabled={isAnimating}
                                style={{
                                    ...btnStyle,
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    borderColor: '#ef4444',
                                    boxShadow: '0 4px 0 #ef444488'
                                }}
                            >
                                🔴 Sphere
                            </button>
                            <button
                                className="bubble-btn"
                                onClick={() => addBlock(2)}
                                disabled={isAnimating}
                                style={{
                                    ...btnStyle,
                                    background: '#3b82f6',
                                    color: '#ffffff',
                                    borderColor: '#3b82f6',
                                    boxShadow: '0 4px 0 #3b82f688'
                                }}
                            >
                                🟦 Box
                            </button>
                            <button
                                className="bubble-btn"
                                onClick={() => addBlock(3)}
                                disabled={isAnimating}
                                style={{
                                    ...btnStyle,
                                    background: '#eab308',
                                    color: '#1e293b',
                                    borderColor: '#eab308',
                                    boxShadow: '0 4px 0 #eab30888'
                                }}
                            >
                                🟡 Cylinder
                            </button>
                        </>
                    ) : puzzleType === 'water' ? (
                        <>
                            {clicks.map((val, idx) => {
                                const absV = Math.abs(val);
                                const bg = getColorForValue(absV);
                                const fg = getTextColorForBackground(bg);
                                return (
                                    <button
                                        key={idx}
                                        className="bubble-btn"
                                        onClick={() => addBlock(val)}
                                        disabled={isAnimating}
                                        style={{
                                            ...btnStyle,
                                            background: bg,
                                            color: fg,
                                            borderColor: bg,
                                            boxShadow: `0 4px 0 ${bg}88`
                                        }}
                                    >
                                        {val > 0 ? `💧 Pour ${val}L` : `🪓 Drain ${absV}L`}
                                    </button>
                                );
                            })}
                        </>
                    ) : puzzleType === 'electricity' ? (
                        <>
                            {comboOptions.map((opt, idx) => {
                                const label = opt.parts.join(' + ');
                                return (
                                    <button
                                        key={idx}
                                        className="bubble-btn"
                                        onClick={() => chooseCombo(opt)}
                                        disabled={isAnimating || comboBusy}
                                        style={{ ...btnStyle, minWidth: 120, background: '#eef2ff', color: '#3730a3', borderColor: '#6366f1', boxShadow: '0 4px 0 #6366f188' }}
                                    >
                                        ⚡ {label}
                                    </button>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            {comboOptions.map((opt, idx) => {
                                const label = opt.parts.join(' + ');
                                return (
                                    <button
                                        key={idx}
                                        className="bubble-btn"
                                        onClick={() => chooseCombo(opt)}
                                        disabled={isAnimating || comboBusy}
                                        style={{
                                            ...btnStyle,
                                            minWidth: 120,
                                            background: '#eef2ff',
                                            color: '#3730a3',
                                            borderColor: '#6366f1',
                                            boxShadow: '0 4px 0 #6366f188'
                                        }}
                                    >
                                        🧩 {label}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Check / Reset Buttons */}
                <div style={bottomControlsRowStyle}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="bubble-btn danger"
                            onClick={resetLevel}
                            disabled={isAnimating}
                            style={{ ...btnStyle, background: '#cbd5e1', color: '#334155', borderColor: '#94a3b8' }}
                        >
                            🔄 Restart
                        </button>
                        {stageNum < 20 && !sandboxMode && (
                            <button
                                className="bubble-btn warning"
                                onClick={() => {
                                    playSound('click');
                                    onLevelComplete(0, 'mathquest3d', 0);
                                }}
                                disabled={isAnimating}
                                style={{ ...btnStyle, background: '#fef08a', color: '#854d0e', borderColor: '#eab308' }}
                            >
                                ⏭️ Skip
                            </button>
                        )}
                    </div>
                    {/* Combo puzzles (bridge/hill/electricity) auto-check when a card is picked,
                        so the manual Check Answer button is hidden for them. */}
                    {!(puzzleType === 'bridge' || puzzleType === 'hill' || puzzleType === 'electricity') && (
                    <button
                        className="bubble-btn success"
                        onClick={checkAnswer}
                        disabled={isAnimating}
                        style={{
                            ...btnStyle,
                            background: '#22c55e',
                            color: '#ffffff',
                            borderColor: '#16a34a',
                            fontSize: '1.2rem',
                            padding: '12px 36px',
                            boxShadow: '0 6px 0 #15803d'
                        }}
                    >
                        ✨ Check Answer!
                    </button>
                    )}
                </div>
            </div>
            {isLevelCleared && (() => {
                const starsFromAttempts = calculateStars(attemptCount);
                const baseCoins = sandboxMode ? 5 : (10 + stageNum * 2);
                const multiplier = 1 + Math.min(4, Math.max(0, (comboStreak - 1) * 0.2));
                const multipliedCoins = Math.floor(baseCoins * multiplier);
                const showChest = !sandboxMode && !checkpointMode && (stageNum % 4 === 0);
                const canProgress = true; // milestone chest is an OPTIONAL bonus — never blocks progression
                                          // (previously hid Next/Run buttons behind an unopened chest, leaving only "Go Home")
                const finalStarsEarned = multipliedCoins + bonusStars + (chestStarsClaimed ? 20 : 0);

                return (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 16777300
                    }}>
                        <div style={{
                            background: 'white',
                            border: '5px solid #22c55e',
                            borderRadius: '32px',
                            padding: '30px 40px',
                            maxWidth: '480px',
                            width: '90%',
                            textAlign: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3), 0 10px 10px -5px rgba(0,0,0,0.3), 0 10px 0 #16a34a',
                            boxSizing: 'border-box',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}>
                            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎉</div>
                            <h2 style={{
                                fontFamily: "'Fredoka', sans-serif",
                                fontSize: '2rem',
                                fontWeight: '900',
                                color: '#166534',
                                margin: '0 0 10px 0'
                            }}>
                                {sandboxMode ? '🧪 GREAT JOB!' : `⭐ STAGE ${stageNum} DONE! ⭐`}
                            </h2>
                            {/* Stars display */}
                            {!sandboxMode && (
                                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <span key={i} style={{ opacity: i < starsFromAttempts ? 1 : 0.25 }}>⭐</span>
                                    ))}
                                </div>
                            )}
                            
                            {/* Streak Display */}
                            {comboStreak > 1 && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'linear-gradient(135deg, #f97316, #ef4444)',
                                    color: 'white',
                                    padding: '4px 14px',
                                    borderRadius: '9999px',
                                    fontWeight: '900',
                                    fontSize: '0.95rem',
                                    marginBottom: '15px',
                                    boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
                                }}>
                                    🔥 {comboStreak}x Streak Combo! ({multiplier.toFixed(1)}x Stars!)
                                </div>
                            )}

                            <p style={{ fontSize: '1.15rem', color: '#475569', fontWeight: '700', margin: '0 0 20px 0' }}>
                                {sandboxMode ? (
                                    <>Fantastic freeplay! You earned <strong style={{ color: '#ca8a04', fontSize: '1.35rem' }}>🪙 {finalStarsEarned} Stars</strong>!</>
                                ) : (
                                    <>Awesome job! You earned <strong style={{ color: '#ca8a04', fontSize: '1.35rem' }}>🪙 {multipliedCoins + bonusStars} Stars</strong>!</>
                                )}
                            </p>
                            
                            {!sandboxMode && (
                                <div style={{
                                    background: '#f0fdf4',
                                    border: '3px dashed #86efac',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px'
                                }}>
                                    <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '800', textTransform: 'uppercase' }}>Hero Evolution Reward:</span>
                                    <span style={{ fontSize: '1.1rem', color: '#1e3a8a', fontWeight: '900' }}>
                                        ✨ Unlocked: {FEATURE_NAMES[stageNum - 1] || 'New Item'}
                                    </span>
                                </div>
                            )}

                            {/* Wiggling Milestone Mystery Chest */}
                            {showChest && (
                                <div className="mystery-chest-container" style={{ marginBottom: '20px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#854d0e', fontWeight: '900', fontSize: '0.95rem' }}>
                                        🎁 Stage {stageNum} Milestone Mystery Chest! 🎁
                                    </h4>
                                    <div 
                                        className={`chest-box ${chestState === 'wiggling' ? 'wiggle' : ''}`}
                                        onClick={() => {
                                            if (chestState === 'opened') return;
                                            playSound('click');
                                            const nextTaps = chestTaps + 1;
                                            setChestTaps(nextTaps);
                                            if (nextTaps >= 3) {
                                                setChestState('opened');
                                                playSound('coin');
                                                setChestStarsClaimed(true);
                                            } else {
                                                setChestState('wiggling');
                                                setTimeout(() => {
                                                    setChestState('idle');
                                                }, 500);
                                            }
                                        }}
                                        style={{ fontSize: '4rem' }}
                                    >
                                        {chestState === 'opened' ? '🔓' : '🔒'}
                                    </div>
                                    <p style={{ fontWeight: '800', color: '#78350f', fontSize: '0.85rem', margin: '8px 0 0 0' }}>
                                        {chestState === 'opened' 
                                            ? '🎉 BOOM! You found +20 BONUS STARS! 🎉' 
                                            : `Tap ${3 - chestTaps} more times to break the lock!`
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Celebratory Balloon Pop Challenge */}
                            <div style={{
                                background: '#eff6ff',
                                border: '2.5px dashed #3b82f6',
                                borderRadius: '20px',
                                padding: '12px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '0.82rem', color: '#1e3a8a', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Fredoka', sans-serif" }}>
                                    🎈 Bonus Star Balloon Pop! 🎈
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '22px', margin: '8px 0' }}>
                                    {[0, 1, 2].map((idx) => {
                                        const isPopped = poppedBonusBalloons.includes(idx);
                                        const balloonColor = ['#3b82f6', '#ec4899', '#f59e0b'][idx];
                                        return (
                                            <div 
                                                key={idx}
                                                onClick={() => {
                                                    if (isPopped) return;
                                                    playSound('pop');
                                                    setPoppedBonusBalloons(prev => [...prev, idx]);
                                                    setBonusStars(s => s + 1);
                                                }}
                                                style={{
                                                    width: '40px',
                                                    height: '50px',
                                                    background: isPopped ? 'transparent' : balloonColor,
                                                    borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                                                    cursor: isPopped ? 'default' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.1rem',
                                                    position: 'relative',
                                                    transition: 'transform 0.15s ease, opacity 0.15s ease',
                                                    opacity: isPopped ? 0.35 : 1,
                                                    transform: isPopped ? 'scale(0.85)' : 'scale(1)',
                                                    boxShadow: isPopped ? 'none' : 'inset -3px -5px 0 rgba(0,0,0,0.15), 0 3px 5px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {isPopped ? '💥' : '⭐'}
                                                {!isPopped && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-10px',
                                                        left: '19px',
                                                        width: '2px',
                                                        height: '10px',
                                                        background: '#94a3b8'
                                                    }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {bonusStars > 0 && (
                                    <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '900', fontFamily: "'Fredoka', sans-serif" }}>
                                        ✨ +{bonusStars} Extra Star{bonusStars > 1 ? 's' : ''}!
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {!canProgress ? (
                                    <div style={{
                                        background: '#fff7ed',
                                        border: '2px solid #ffedd5',
                                        borderRadius: '14px',
                                        padding: '10px',
                                        color: '#c2410c',
                                        fontSize: '0.85rem',
                                        fontWeight: '800'
                                    }}>
                                        🔒 Tap and unlock the Mystery Chest above to claim your milestone reward and continue!
                                    </div>
                                ) : checkpointMode ? (
                                    <button
                                        className="bubble-btn success"
                                        onClick={() => {
                                            playSound('click');
                                            onLevelComplete(finalStarsEarned, '', comboStreak);
                                            setIsLevelCleared(false);
                                        }}
                                        style={{
                                            fontSize: '1.25rem', padding: '14px', width: '100%',
                                            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                            borderColor: '#6d28d9', boxShadow: '0 5px 0 #6d28d9',
                                            color: 'white', fontWeight: '900'
                                        }}
                                    >
                                        🏃 Checkpoint Cleared — Keep Running!
                                    </button>
                                ) : sandboxMode ? (
                                    <>
                                        <button 
                                            className="bubble-btn success"
                                            onClick={() => {
                                                playSound('click');
                                                resetLevel();
                                            }}
                                            style={{
                                                fontSize: '1.15rem',
                                                padding: '12px',
                                                width: '100%',
                                                background: '#22c55e',
                                                borderColor: '#16a34a',
                                                boxShadow: '0 4px 0 #15803d',
                                                color: 'white',
                                                fontWeight: '900'
                                            }}
                                        >
                                            🔄 Play Sandbox again
                                        </button>
                                        <button 
                                            className="bubble-btn primary"
                                            onClick={() => {
                                                playSound('click');
                                                onLevelComplete(finalStarsEarned, 'sandbox', comboStreak);
                                                setIsLevelCleared(false);
                                            }}
                                            style={{
                                                fontSize: '1.15rem',
                                                padding: '12px',
                                                width: '100%',
                                                background: '#3b82f6',
                                                borderColor: '#2563eb',
                                                boxShadow: '0 4px 0 #1d4ed8',
                                                color: 'white',
                                                fontWeight: '900'
                                            }}
                                        >
                                            🧪 Return to Sandbox Lab
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="bubble-btn"
                                            onClick={() => {
                                                playSound('chime');
                                                onLevelComplete(finalStarsEarned, 'runner', comboStreak);
                                                setIsLevelCleared(false);
                                            }}
                                            style={{
                                                fontSize: '1.25rem',
                                                padding: '12px',
                                                width: '100%',
                                                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                                borderColor: '#6d28d9',
                                                boxShadow: '0 5px 0 #6d28d9',
                                                color: 'white',
                                                fontWeight: '900'
                                            }}
                                        >
                                            🚪 Open the Door — Run Game!
                                        </button>
                                        {stageNum < 20 ? (
                                            <button 
                                                className="bubble-btn success"
                                                onClick={() => {
                                                    playSound('click');
                                                    onLevelComplete(finalStarsEarned, 'mathquest3d', comboStreak);
                                                    setIsLevelCleared(false);
                                                }}
                                                style={{
                                                    fontSize: '1.25rem',
                                                    padding: '12px',
                                                    width: '100%',
                                                    background: '#22c55e',
                                                    borderColor: '#16a34a',
                                                    boxShadow: '0 5px 0 #15803d',
                                                    color: 'white',
                                                    fontWeight: '900'
                                                }}
                                            >
                                                🚀 Next: Stage {stageNum + 1}!
                                            </button>
                                        ) : (
                                            <button 
                                                className="bubble-btn success"
                                                onClick={() => {
                                                    playSound('click');
                                                    onLevelComplete(finalStarsEarned, 'graduation', comboStreak);
                                                    setIsLevelCleared(false);
                                                }}
                                                style={{
                                                    fontSize: '1.25rem',
                                                    padding: '14px 20px',
                                                    width: '100%',
                                                    background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                                                    borderColor: '#a16207',
                                                    boxShadow: '0 5px 0 #854d0e',
                                                    color: 'white',
                                                    fontWeight: '900',
                                                    animation: 'wiggle-chest 1.5s infinite alternate'
                                                }}
                                            >
                                                🎓 See My Graduation!
                                            </button>
                                        )}

                                        <button 
                                            className="bubble-btn"
                                            onClick={() => {
                                                playSound('click');
                                                onLevelComplete(finalStarsEarned, 'stats', comboStreak);
                                                setIsLevelCleared(false);
                                            }}
                                            style={{
                                                fontSize: '1.05rem',
                                                padding: '10px',
                                                width: '100%',
                                                background: '#3b82f6',
                                                borderColor: '#2563eb',
                                                boxShadow: '0 4px 0 #1d4ed8',
                                                color: 'white',
                                                fontWeight: '800'
                                            }}
                                        >
                                            🏆 See My Hero
                                        </button>
                                    </>
                                )}

                                <button 
                                    className="bubble-btn"
                                    onClick={() => {
                                        playSound('click');
                                        onLevelComplete(finalStarsEarned, 'dashboard', comboStreak);
                                        setIsLevelCleared(false);
                                    }}
                                    style={{
                                        fontSize: '0.95rem',
                                        padding: '9px',
                                        width: '100%',
                                        fontWeight: '700',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        borderColor: '#cbd5e1'
                                    }}
                                >
                                    🏠 Home
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            </div>
        </div>
    );
}

// Inline styles for overlays (layout and aesthetics now handled by class names in App.css)

const badgeStyle = {
    background: '#8b5cf6',
    color: 'white',
    padding: '6px 14px',
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '0.95rem'
};

const instructionStyle = {
    fontSize: '1.05rem',
    color: '#1e293b',
    fontWeight: '700',
    flex: 1
};

const controlsRowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'center'
};

const bottomControlsRowStyle = {
    display: 'flex',
    gap: '15px',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const btnStyle = {
    padding: '12px 20px',
    fontSize: '1.15rem',
    fontWeight: '800',
    borderRadius: '14px',
    cursor: 'pointer',
    minHeight: '48px'
};

const themeBtnStyle = {
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: '800',
    borderRadius: '10px',
    border: '2px solid',
    cursor: 'pointer',
    fontFamily: "'Fredoka', sans-serif",
    transition: 'all 0.15s ease'
};
