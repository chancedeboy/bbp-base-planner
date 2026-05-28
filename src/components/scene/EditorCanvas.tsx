import { useEffect, useMemo, useRef } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'
import { Vector3 } from 'three'
import { useBuildStore } from '../../state/useBuildStore'
import Piece from './Piece'
import GhostPiece from './GhostPiece'
import CameraController from './CameraController'
import { computeBuildBounds, detectFloorLevels, type Vec3 } from '../../lib/snap'
import { PARTS_BY_ID } from '../../data/parts'

interface BuildPadProps {
  cursorRef: React.RefObject<Vector3 | null>
  ghostPoseRef: React.RefObject<{ position: Vec3; rotation: Vec3 } | null>
}

function BuildPad({ cursorRef, ghostPoseRef }: BuildPadProps) {
  const placePiece = useBuildStore((s) => s.placePiece)
  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const selectedPieceId = useBuildStore((s) => s.selectedPieceId)
  const selectPiece = useBuildStore((s) => s.selectPiece)

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    cursorRef.current = e.point.clone()
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (selectedPartId) {
      e.stopPropagation()
      const pose = ghostPoseRef.current
      if (pose) {
        placePiece(selectedPartId, pose.position, pose.rotation)
      } else {
        const { x, z } = e.point
        placePiece(selectedPartId, [x, 0, z])
      }
      return
    }
    // Empty-ground click with no part held → deselect any selected piece
    if (selectedPieceId) {
      e.stopPropagation()
      selectPiece(null)
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

// An invisible placement plane positioned at the current floor surface level,
// sized to the building's footprint. Used in interior mode so mouse rays hit
// the floor the user is standing on instead of the far-away ground plane.
function InteriorPad({ cursorRef, ghostPoseRef }: BuildPadProps) {
  const pieces = useBuildStore((s) => s.pieces)
  const floorLevel = useBuildStore((s) => s.floorLevel)
  const floorMarkers = useBuildStore((s) => s.floorMarkers)
  const placePiece = useBuildStore((s) => s.placePiece)
  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const selectedPieceId = useBuildStore((s) => s.selectedPieceId)
  const selectPiece = useBuildStore((s) => s.selectPiece)

  const allFloorLevels = useMemo(() => {
    const detected = detectFloorLevels(pieces, PARTS_BY_ID)
    const combined = new Map<number, true>()
    for (const y of detected) combined.set(Math.round(y * 10) / 10, true)
    for (const y of floorMarkers) combined.set(Math.round(y * 10) / 10, true)
    return [...combined.keys()].sort((a, b) => a - b)
  }, [pieces, floorMarkers])

  const floorY = allFloorLevels[Math.min(floorLevel, allFloorLevels.length - 1)] ?? 0

  const bounds = useMemo(() => computeBuildBounds(pieces, PARTS_BY_ID), [pieces])
  const cx = bounds ? (bounds.minX + bounds.maxX) / 2 : 0
  const cz = bounds ? (bounds.minZ + bounds.maxZ) / 2 : 0
  const pw = bounds ? Math.max(bounds.maxX - bounds.minX, 2) : 20
  const pd = bounds ? Math.max(bounds.maxZ - bounds.minZ, 2) : 20

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    cursorRef.current = e.point.clone()
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (selectedPartId) {
      const pose = ghostPoseRef.current
      if (pose) {
        placePiece(selectedPartId, pose.position, pose.rotation)
      } else {
        placePiece(selectedPartId, [e.point.x, floorY, e.point.z])
      }
      return
    }
    if (selectedPieceId) selectPiece(null)
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[cx, floorY + 0.005, cz]}
      onPointerMove={handleMove}
      onClick={handleClick}
    >
      <planeGeometry args={[pw, pd]} />
      {/* Invisible — only here to catch pointer events at floor level */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
  const selectedPieceId = useBuildStore((s) => s.selectedPieceId)
  const selectPart = useBuildStore((s) => s.selectPart)
  const selectPiece = useBuildStore((s) => s.selectPiece)
  const rotateGhost = useBuildStore((s) => s.rotateGhost)
  const rotatePiece = useBuildStore((s) => s.rotatePiece)
  const removePiece = useBuildStore((s) => s.removePiece)
  const undo = useBuildStore((s) => s.undo)
  const rotationStep = useBuildStore((s) => s.serverConfig.rotationStep)
  const cycleSnapCandidate = useBuildStore((s) => s.cycleSnapCandidate)
  const snapEnabled = useBuildStore((s) => s.snapEnabled)
  const mode = useBuildStore((s) => s.mode)

  // Keyboard: ESC clears selection. R / Shift+R rotate whichever is active —
  // the ghost during placement, or the selected placed piece otherwise.
  // Delete / Backspace removes the selected placed piece.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectPart(null)
        selectPiece(null)
        return
      }
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return

      // Ctrl/Cmd+Z — undo the most recent piece mutation
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        const degrees = e.shiftKey ? rotationStep : 90
        const deltaRad = (degrees * Math.PI) / 180
        if (selectedPartId) {
          e.preventDefault()
          rotateGhost(deltaRad)
        } else if (selectedPieceId) {
          e.preventDefault()
          rotatePiece(selectedPieceId, deltaRad)
        }
        return
      }

      // Q / E cycle snap candidates — keyboard equivalent of mouse wheel for
      // laptop users without a scroll wheel. Same gating as the wheel handler.
      if ((e.key === 'q' || e.key === 'Q') && selectedPartId && snapEnabled) {
        e.preventDefault()
        cycleSnapCandidate(-1)
        return
      }
      if ((e.key === 'e' || e.key === 'E') && selectedPartId && snapEnabled) {
        e.preventDefault()
        cycleSnapCandidate(1)
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPieceId) {
        e.preventDefault()
        removePiece(selectedPieceId)
        selectPiece(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    selectedPartId,
    selectedPieceId,
    rotationStep,
    rotateGhost,
    rotatePiece,
    removePiece,
    selectPart,
    selectPiece,
    snapEnabled,
    cycleSnapCandidate,
    undo,
  ])

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
      {mode === 'interior' && (
        <InteriorPad cursorRef={cursorRef} ghostPoseRef={ghostPoseRef} />
      )}
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
      <OrbitControls
        makeDefault
        enableZoom={!selectedPartId}
      />
      <CameraController />
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
