import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Inner scene controller that handles scroll updates in the R3F loop
function SceneController({ progress }) {
  const lobbyGroupRef = useRef()
  const aiCoreRef = useRef()
  const vaultGroupRef = useRef()

  useFrame((state) => {
    // 1. DYNAMIC CAMERA TRAVEL ALONG THE Z-AXIS AND Y-AXIS (UNDERGROUND)
    // Scroll 0.0 -> camera Z = 15, Y = 0
    // Scroll 1.0 -> camera Z = -15, Y = -10 (Vault)
    let targetZ = 15 - progress * 32
    let targetY = 0

    if (progress > 0.65) {
      // Panning down underground into the cyber-vault
      const vaultProgress = (progress - 0.65) / 0.35
      targetY = -vaultProgress * 9.0
    }

    // Smooth linear interpolation (lerp) for the camera coordinates
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.06)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.06)
    
    // Look ahead of the travel path
    state.camera.lookAt(0, targetY, targetZ - 10)

    // 2. ANIMATE SCENE GEOMETRIES
    // Lobby grid rotation
    if (lobbyGroupRef.current) {
      lobbyGroupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05
    }

    // AI Core pulsing
    if (aiCoreRef.current) {
      aiCoreRef.current.rotation.y = state.clock.getElapsedTime() * 0.4
      aiCoreRef.current.rotation.x = state.clock.getElapsedTime() * 0.2
      // Pulsing scale wave
      const scale = 1.6 + Math.sin(state.clock.getElapsedTime() * 2) * 0.2
      aiCoreRef.current.scale.set(scale, scale, scale)
    }

    // Vault lockers sliding open on scroll target
    if (vaultGroupRef.current && progress > 0.72) {
      const openProgress = Math.min((progress - 0.72) * 4, 1) // 0 to 1
      vaultGroupRef.current.children.forEach((child, idx) => {
        // Rotate locker doors open
        if (child.name === 'door') {
          child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, openProgress * (Math.PI / 1.6), 0.08)
        }
        // Scale and spin asset octahedrons
        if (child.name === 'asset') {
          child.rotation.y = state.clock.getElapsedTime() * 0.6 + idx
          child.scale.setScalar(THREE.MathUtils.lerp(0, 0.4, openProgress))
        }
      })
    }
  })

  // Procedural Starfield Particle background
  const particleCount = 600
  const positions = new Float32Array(particleCount * 3)
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 50
    positions[i + 1] = (Math.random() - 0.5) * 50
    positions[i + 2] = (Math.random() - 0.5) * 60
  }

  return (
    <>
      {/* Portals lights */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-5, -10, -10]} intensity={1.5} color="#00e676" />
      <directionalLight position={[0, 10, 0]} intensity={0.8} />

      {/* PARTICLES DESK DESIGNS */}
      <Points positions={positions} stride={3} limit={particleCount}>
        <PointMaterial
          transparent
          color="#00ffff"
          size={0.12}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>

      {/* SECTION 1: THE GRAND 3D GLASS ENTRANCE (Z = 8) */}
      <group position={[0, 0, 8]}>
        {/* Grand biometric wireframe ring */}
        <mesh>
          <torusGeometry args={[3.2, 0.08, 16, 64]} />
          <meshBasicMaterial color="#00ffff" wireframe />
        </mesh>
        {/* Concentric inner glow ring */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[2.8, 0.03, 16, 64]} />
          <meshBasicMaterial color="#00e676" wireframe />
        </mesh>
        {/* Backing obsidian glass panel */}
        <mesh>
          <planeGeometry args={[10, 10]} />
          <meshPhysicalMaterial 
            transparent 
            opacity={0.15} 
            color="#0b1118" 
            roughness={0.1} 
            metalness={0.9} 
            thickness={1} 
          />
        </mesh>
      </group>

      {/* SECTION 2: HIGH-VELOCITY LOBBY (Z = 1 to Z = -3) */}
      <group ref={lobbyGroupRef} position={[0, 0, 0]}>
        {/* Floating wireframe server cubes */}
        <mesh position={[-3, 1.5, 2]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#00ffff" wireframe />
        </mesh>
        <mesh position={[3, -1.2, 0]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#00e676" wireframe />
        </mesh>
        <mesh position={[-2.5, -2, -2]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshBasicMaterial color="#00ffff" wireframe />
        </mesh>
        {/* Neon floor grid */}
        <gridHelper args={[40, 40, '#00ffff', '#05080c']} position={[0, -2.5, 0]} />
      </group>

      {/* SECTION 3: AI TELLER CORE DESK (Z = -4) */}
      <group position={[0, 0, -4]}>
        {/* Glowing Holographic Pulsing Sphere Core */}
        <mesh ref={aiCoreRef}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial color="#00e676" wireframe />
        </mesh>
        {/* Outer cyber shield rings */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.04, 8, 32]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.8, 0.03, 8, 32]} />
          <meshBasicMaterial color="#00e676" />
        </mesh>
      </group>

      {/* SECTION 4: THE UNDERGROUND 3D VAULT (Z = -14, Y = -9) */}
      <group ref={vaultGroupRef} position={[0, -9, -14]}>
        {/* Vault relational grid boundaries */}
        <gridHelper args={[30, 20, '#00e676', '#05080c']} position={[0, -2, 0]} />
        
        {/* Relational safe deposit boxes */}
        {/* Locker Left Box */}
        <group position={[-2.5, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#0f1922" roughness={0.4} metalness={0.9} />
          </mesh>
          {/* Locker door (rotating hinge point) */}
          <group name="door" position={[0.75, 0, 0.75]}>
            <mesh position={[-0.75, 0, 0]}>
              <boxGeometry args={[1.5, 1.5, 0.08]} />
              <meshStandardMaterial color="#00ffff" roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
          {/* Unveiling asset inside locker */}
          <mesh name="asset" position={[0, 0, 0]}>
            <octahedronGeometry args={[0.4, 0]} />
            <meshBasicMaterial color="#00e676" wireframe />
          </mesh>
        </group>

        {/* Locker Right Box */}
        <group position={[2.5, 0, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial color="#0f1922" roughness={0.4} metalness={0.9} />
          </mesh>
          {/* Locker door (rotating hinge point) */}
          <group name="door" position={[-0.75, 0, 0.75]}>
            <mesh position={[0.75, 0, 0]}>
              <boxGeometry args={[1.5, 1.5, 0.08]} />
              <meshStandardMaterial color="#00ffff" roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
          {/* Unveiling asset inside locker */}
          <mesh name="asset" position={[0, 0, 0]}>
            <octahedronGeometry args={[0.4, 0]} />
            <meshBasicMaterial color="#00e676" wireframe />
          </mesh>
        </group>
      </group>
    </>
  )
}

export default function BankTourScene({ progress }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      className="w-full h-full"
    >
      <color attach="background" args={['#05080c']} />
      <SceneController progress={progress} />
    </Canvas>
  )
}
