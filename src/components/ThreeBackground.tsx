import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function getQuality(): 'low' | 'medium' | 'high' {
  if (typeof window === 'undefined') return 'medium'
  const mem = (navigator as any).deviceMemory
  const cpu = navigator.hardwareConcurrency
  const mobile = window.innerWidth < 768
  if ((mem !== undefined && mem < 4) || (cpu !== undefined && cpu < 4) || mobile) return 'low'
  if ((mem !== undefined && mem < 8) || (cpu !== undefined && cpu < 8)) return 'medium'
  return 'high'
}

const Q = getQuality()
const PARTICLE_COUNT = Q === 'low' ? 25 : Q === 'medium' ? 50 : 80
const SHAPE_COUNT = Q === 'low' ? 4 : Q === 'medium' ? 8 : 12

function Particles({ count = PARTICLE_COUNT }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!)

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 8 + Math.random() * 25
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r * 0.4
      pos[i * 3 + 2] = Math.cos(phi) * r
      siz[i] = 0.02 + Math.random() * 0.04
    }
    return [pos, siz]
  }, [count])

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.015
    ref.current.rotation.x += delta * 0.005
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
        <bufferAttribute args={[sizes, 1]} attach="attributes-size" />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.25}
        color="#09346A"
      />
    </points>
  )
}

function FloatingShapes() {
  const groupRef = useRef<THREE.Group>(null!)

  const shapes = useMemo(() => {
    const items: { pos: [number, number, number]; rotSpeed: number; shape: 'tetrahedron' | 'octahedron' | 'dodecahedron'; size: number; color: string }[] = []
    const colors = ['#09346A', '#153D8A', '#06244A', '#F4F084']
    const geomTypes = ['tetrahedron', 'octahedron', 'dodecahedron'] as const
    for (let i = 0; i < SHAPE_COUNT; i++) {
      items.push({
        pos: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 15 + 2,
          (Math.random() - 0.5) * 20 - 10,
        ],
        rotSpeed: 0.1 + Math.random() * 0.3,
        shape: geomTypes[Math.floor(Math.random() * geomTypes.length)],
        size: 0.08 + Math.random() * 0.12,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    return items
  }, [])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (i < shapes.length) {
          child.rotation.x += delta * shapes[i].rotSpeed
          child.rotation.y += delta * shapes[i].rotSpeed * 0.7
          child.position.y += Math.sin(Date.now() * 0.001 + i) * delta * 0.1
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {shapes.map((s, i) => {
        let geom: THREE.BufferGeometry
        switch (s.shape) {
          case 'tetrahedron': geom = new THREE.TetrahedronGeometry(s.size); break
          case 'octahedron': geom = new THREE.OctahedronGeometry(s.size); break
          case 'dodecahedron': geom = new THREE.DodecahedronGeometry(s.size); break
          default: geom = new THREE.OctahedronGeometry(s.size)
        }
        return (
          <mesh key={i} position={s.pos} geometry={geom}>
            <meshStandardMaterial
              color={s.color}
              transparent
              opacity={0.08}
              wireframe
            />
          </mesh>
        )
      })}
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.2} />
      <Particles />
      <FloatingShapes />
    </>
  )
}

export default function ThreeBackground() {
  if (Q === 'low') return null
  return (
    <div className="three-bg">
      <Canvas
        camera={{ position: [0, 2, 18], fov: 50 }}
        dpr={[1, Q === 'high' ? 1.5 : 1]}
        gl={{ antialias: Q === 'high', alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => { gl.xr.enabled = false }}
      >
        <Scene />
      </Canvas>
      <style>{`
        .three-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          z-index: 0;
          pointer-events: none;
          opacity: 0.6;
        }
      `}</style>
    </div>
  )
}
