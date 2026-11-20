import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function Model() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/creator-os-logo.glb');

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      <primitive object={scene} scale={1.5} />
    </group>
  );
}

export default function Logo3D() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 300 }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 30 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        style={{ outline: 'none' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 4, 3]} intensity={1.5} />
        <directionalLight position={[-2, 2, -3]} intensity={0.5} />
        <Environment preset="studio" background={false} />
        <ContactShadows opacity={0.3} scale={5} blur={2} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
        <Model />
      </Canvas>
    </div>
  );
}

// Preload the model
Logo3D.preload = () => {
  useGLTF.preload('/models/creator-os-logo.glb');
};