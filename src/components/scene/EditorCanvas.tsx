import { useEffect, useRef } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'
import { Vector3 } from 'three'
import { useBuildStore } from '../../state/useBuildStore'
import Piece from './Piece'
import GhostPiece from './GhostPiece'
import type { Vec3 } from '../../lib/snap'

interface BuildPadProps {
  cursorRef: React.RefObject<Vector3 | null>
  ghostPoseRef: React.RefObject<{ position: Vec3; rotation: Vec3 } | null>
}

function BuildPad({ cursorRef, ghostPoseRef }: BuildPadProps) {
  const placePiece = useBuildStore((s) => s.placePiece)
  const selectedPartId = useBuildStore((s) => s.selectedPartId)

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    cursorRef.current = e.point.clone()
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedPartId) return
    e.stopPropagation()
    const pose = ghostPoseRef.current
    if (pose) {
      placePiece(selectedPartId, pose.position, pose.rotation)
    } else {
      const { x, z } = e.point
      placePiece(selectedPartId, [x, 0, z])
    }
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onPointerMove={handleMove}
      onClick={handleClick}
      receiveShadow
    >
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#1f2937" />
    </mesh>
  )
}

function Pieces() {
  const pieces = useBuildStore((s) => s.pieces)
  return (
    <>
      {pieces.map((piece) => (
        <Piece key={piece.uuid} piece={piece} />
      ))}
    </>
  )
}

export default function EditorCanvas() {
  const cursorRef = useRef<Vector3 | null>(null)
  const ghostPoseRef = useRef<{ position: Vec3; rotation: Vec3 } | null>(null)

  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const selectPart = useBuildStore((s) => s.selectPart)
  const rotateGhost = useBuildStore((s) => s.rotateGhost)
  const rotationStep = useBuildStore((s) => s.serverConfig.rotationStep)
  const cycleSnapCandidate = useBuildStore((s) => s.cycleSnapCandidate)
  const snapEnabled = useBuildStore((s) => s.snapEnabled)

  // Keyboard: ESC cancels; R / Shift+R rotate the ghost.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectPart(null)
        return
      }
      if (!selectedPartId) return
      // Don't intercept when typing in an input/textarea
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const degrees = e.shiftKey ? rotationStep : 90
        rotateGhost((degrees * Math.PI) / 180)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedPartId, rotationStep, rotateGhost, selectPart])

  // Mouse wheel cycles snap candidates while a part is selected & snap is on.
  // When no part is selected, wheel passes through to OrbitControls (zoom).
  useEffect(() => {
    if (!selectedPartId || !snapEnabled) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cycleSnapCandidate(e.deltaY > 0 ? 1 : -1)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [selectedPartId, snapEnabled, cycleSnapCandidate])

  return (
    <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <BuildPad cursorRef={cursorRef} ghostPoseRef={ghostPoseRef} />
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#4b5563"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#6b7280"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />
      <Pieces />
      <GhostPiece cursorRef={cursorRef} ghostPoseRef={ghostPoseRef} />
      <OrbitControls makeDefault enableZoom={!selectedPartId} />
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
