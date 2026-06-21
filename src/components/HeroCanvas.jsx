// src/components/HeroCanvas.jsx
// Thin wrapper around the R3F <Canvas> + <Hero3D> preview so that three.js / fiber
// only load when a 3D view is actually shown (code-split via React.lazy in App.jsx).
import React from 'react';
import { Canvas } from '@react-three/fiber';
import Hero3D from './Hero3D';

export default function HeroCanvas({ features, petColor, petAccessory }) {
  return (
    <Canvas camera={{ position: [0, 1.2, 3], fov: 38 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Hero3D features={features} isCelebrating={true} scale={0.95} position={[0, -0.65, 0]} petColor={petColor} petAccessory={petAccessory} />
    </Canvas>
  );
}
