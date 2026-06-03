import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// Inner card component that handles interactive rotation in R3F render loop
function CardModel({ name }) {
  const cardRef = useRef()
  const [hovered, setHovered] = useState(false)

  // format name to upper case
  const formattedName = (name || 'BOB MILLER').toUpperCase()

  useFrame((state) => {
    if (!cardRef.current) return

    const t = state.clock.getElapsedTime()

    // 1. Gentle continuous Y-axis rotation (spin) and floating Y-axis movement
    // When mouse is inside, skew slightly to cursor. When outside, spin 360 degrees.
    let targetX = Math.sin(t * 0.8) * 0.12
    let targetY = t * 0.45 // continuous spin
    let targetZ = Math.cos(t * 0.6) * 0.05

    if (hovered) {
      // Skew target rotation based on normalized mouse pointer (-1 to 1)
      targetX = -state.pointer.y * 0.5
      targetY = state.pointer.x * 0.7 + (t * 0.15) // slow spin with pointer bias
      targetZ = state.pointer.x * 0.15
    }

    // Smooth linear interpolation (lerp) for card rotations
    cardRef.current.rotation.x = THREE.MathUtils.lerp(cardRef.current.rotation.x, targetX, 0.06)
    cardRef.current.rotation.y = THREE.MathUtils.lerp(cardRef.current.rotation.y, targetY, 0.06)
    cardRef.current.rotation.z = THREE.MathUtils.lerp(cardRef.current.rotation.z, targetZ, 0.06)

    // Gentle up-and-down vertical wave (float effect)
    cardRef.current.position.y = THREE.MathUtils.lerp(
      cardRef.current.position.y,
      Math.sin(t * 1.2) * 0.08,
      0.06
    )
  })

  return (
    <group 
      ref={cardRef} 
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 1. FRONT GLASS CARD BODY */}
      <mesh>
        <boxGeometry args={[4.2, 2.65, 0.05]} />
        <meshPhysicalMaterial
          color="#060c13"
          metalness={0.9}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transmission={0.35}
          thickness={1.5}
          ior={1.6}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* 2. NEON WIREFRAME OUTER EDGE (For holographic glow accent) */}
      <mesh>
        <boxGeometry args={[4.23, 2.68, 0.055]} />
        <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.35} />
      </mesh>

      {/* 3. PHYSICAL 3D EMV SMART CHIP (Front left side) */}
      <group position={[-1.35, 0.45, 0.028]}>
        <mesh>
          <boxGeometry args={[0.55, 0.42, 0.008]} />
          <meshStandardMaterial 
            color="#00e676" 
            roughness={0.2} 
            metalness={0.9} 
            emissive="#00e676" 
            emissiveIntensity={0.25} 
          />
        </mesh>
        {/* Fine gold lines wireframe */}
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[0.42, 0.32]} />
          <meshBasicMaterial color="#05080c" wireframe />
        </mesh>
      </group>

      {/* 4. PHYSICAL 3D CONTACTLESS ANTENNA WAVES */}
      <group position={[-1.35, -0.15, 0.028]} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <torusGeometry args={[0.16, 0.008, 6, 18, Math.PI]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
        <mesh scale={[0.7, 0.7, 1]}>
          <torusGeometry args={[0.16, 0.008, 6, 18, Math.PI]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
        <mesh scale={[0.4, 0.4, 1]}>
          <torusGeometry args={[0.16, 0.008, 6, 18, Math.PI]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* 5. PHYSICAL MAGNETIC STRIPE (Back side top) */}
      <mesh position={[0, 0.55, -0.028]}>
        <planeGeometry args={[4.2, 0.48]} />
        <meshBasicMaterial color="#020406" />
      </mesh>

      {/* 6. PHYSICAL SIGNATURE STRIP (Back side middle) */}
      <mesh position={[-0.4, -0.05, -0.028]}>
        <planeGeometry args={[2.5, 0.38]} />
        <meshBasicMaterial color="#1a2530" />
      </mesh>

      {/* 7. PHYSICAL BACK HOLOGRAM ACCENT */}
      <mesh position={[1.35, -0.05, -0.028]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial 
          color="#00e676" 
          roughness={0.05} 
          metalness={0.95} 
          emissive="#00e676" 
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* 8. FRONT SIDE TEXT LABELS (Crisp HTML layout) */}
      <Html
        transform
        distanceFactor={3.15}
        position={[0, 0, 0.028]}
        style={{
          width: '420px',
          height: '265px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 24px',
          color: 'white',
          fontFamily: '"Space Grotesk", sans-serif',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* TOP ROW: Brand and Type */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[14px] font-bold tracking-[2px] leading-tight text-white">KIIS BANK</span>
            <span className="text-[7px] font-mono tracking-[3px] text-cyber-cyan font-bold uppercase">Mainframe Core</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[12px] font-black tracking-[1px] text-emerald-400">RuPay</span>
            <span className="text-[6px] font-mono tracking-[2px] text-slate-400 uppercase">PLATINUM</span>
          </div>
        </div>

        {/* MIDDLE ROW: Card Numbers */}
        <div className="flex flex-col mt-4">
          <span className="text-[18px] font-mono tracking-[4px] text-slate-200 text-shadow-sm font-semibold">
            4532 9901 8840 9432
          </span>
          <div className="flex gap-4 items-center mt-1">
            <span className="text-[5px] font-mono text-slate-500 tracking-[1px] leading-none">VALID<br/>THRU</span>
            <span className="text-[9px] font-mono text-slate-300 tracking-[1px]">09/31</span>
            <span className="text-[6px] font-mono text-cyber-emerald/90 tracking-[2px] font-bold uppercase ml-auto">BSBDA CLEARANCE</span>
          </div>
        </div>

        {/* BOTTOM ROW: Holder Name */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[6px] font-mono text-slate-500 tracking-[1px] uppercase">CARDMEMBER</span>
            <span className="text-[11px] font-mono tracking-[2px] text-cyber-cyan font-bold uppercase mt-0.5 max-w-[200px] truncate">
              {formattedName}
            </span>
          </div>
          {/* SECURE NETWORK LOGO */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5 font-mono text-[7px] text-cyber-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse"></span>
            <span>NPCI LINKED</span>
          </div>
        </div>
      </Html>

      {/* 9. BACK SIDE TEXT LABELS (Mirrored on Y-axis for dual spin) */}
      <Html
        transform
        distanceFactor={3.15}
        position={[0, 0, -0.028]}
        rotation={[0, Math.PI, 0]} // Rotate so it is readable on the back side
        style={{
          width: '420px',
          height: '265px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 24px',
          color: 'white',
          fontFamily: '"Space Grotesk", sans-serif',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* TOP ROW: Blank spacing underneath magnetic stripe */}
        <div className="h-10"></div>

        {/* MIDDLE ROW: CVV Box overlay & Helpline text */}
        <div className="flex items-center gap-3">
          {/* Signature block helper text */}
          <div className="text-[5px] font-mono text-slate-500 max-w-[120px] leading-tight">
            AUTHORIZED SIGNATURE &bull; NOT TRANSFERABLE. KEEP SECURE FROM PHYSICAL LEDGERS.
          </div>
          {/* CVV Container */}
          <div className="flex items-center bg-cyan-950/20 border border-cyber-cyan/30 rounded px-2 py-0.5 font-mono text-[9px] text-cyber-cyan font-bold ml-auto">
            <span className="text-[6px] text-slate-500 tracking-[1px] uppercase mr-2">CVV</span>
            <span>000</span>
          </div>
        </div>

        {/* BOTTOM ROW: RBI regulatory fine print */}
        <div className="flex flex-col text-[6px] font-mono text-slate-500 gap-1.5 border-t border-white/5 pt-2">
          <div className="flex justify-between items-center text-cyber-cyan/70 font-semibold">
            <span>REGULATORY OVERRIDE CODE: BSBDA-990-SECURE</span>
            <span className="text-cyber-emerald">✓ VERIFIED NODE</span>
          </div>
          <p className="leading-tight text-justify">
            This card is issued under Basic Savings Bank Deposit Account rules compliant with Reserve Bank of India (RBI) notifications. UPI, NEFT, and RTGS clearing is governed by National Payments Corporation of India (NPCI) frameworks. Daily cash out clearance limit ₹50,000.
          </p>
        </div>
      </Html>

    </group>
  )
}

export default function RuPayCard3D({ name }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Dynamic Cinematic Lights tailored for glossy cyber card */}
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 3]} intensity={1.5} color="#00ffff" />
      <pointLight position={[-3, -4, -3]} intensity={1.5} color="#00e676" />
      <directionalLight position={[0, 4, 1]} intensity={0.8} />

      <CardModel name={name} />
    </Canvas>
  )
}
