import { useEffect } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'
import { useBuildStore } from '../../state/useBuildStore'
import Piece from './Piece'

function BuildPad() {
  const placePiece = useBuildStore((s) => s.placePiece)
  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const selectPart = useBuildStore((s) => s.selectPart)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedPartId) return
    e.stopPropagation()
    const { x, z } = e.point
    placePiece(selectedPartId, [x, 0, z])
    // Keep the part selected so users can rapid-place; ESC clears.
  }

  // ESC clears the active selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectPart(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectPart])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
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
      <BuildPad />
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
      <OrbitControls makeDefault />
      {import.meta.env.DEV && <Stats />}
    </Canvas>
  )
}
