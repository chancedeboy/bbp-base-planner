import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { BoxGeometry, EdgesGeometry } from 'three'
import { TIER_COLORS, getPart } from '../../data/parts'
import type { PlacedPiece } from '../../data/types'
import { useBuildStore } from '../../state/useBuildStore'

interface Props {
  piece: PlacedPiece
}

export default function Piece({ piece }: Props) {
  const part = getPart(piece.partId)
  const selectedPieceId = useBuildStore((s) => s.selectedPieceId)
  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const selectPiece = useBuildStore((s) => s.selectPiece)
  const mode = useBuildStore((s) => s.mode)

  const { w, h, d } = part?.dimensions ?? { w: 0, h: 0, d: 0 }

  // Edge outline geometry — reused across renders, disposed on unmount/resize.
  const edgesGeo = useMemo(() => {
    const box = new BoxGeometry(w, h, d)
    const edges = new EdgesGeometry(box)
    box.dispose()
    return edges
  }, [w, h, d])

  useEffect(() => () => edgesGeo.dispose(), [edgesGeo])

  if (!part) return null

  // In interior mode, hide roof and hatch pieces (they obscure the view inside).
  if (mode === 'interior' && (part.category === 'roof' || part.category === 'hatch')) return null

  const isSelected = selectedPieceId === piece.uuid
  // In interior mode, exterior-tagged pieces are dimmed to create a cutaway feel.
  const isDimmed = mode === 'interior' && piece.layer === 'exterior'
  const color = TIER_COLORS[piece.tier]

  // Clicks while a part is being placed should pass through to the BuildPad
  // (so the new piece can be placed). Otherwise, click to select.
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (selectedPartId) return
    e.stopPropagation()
    selectPiece(piece.uuid)
  }

  return (
    <group position={piece.position} rotation={piece.rotation}>
      <mesh onClick={handleClick} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? '#4f46e5' : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : 0}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1}
        />
      </mesh>
      {/* Edge outline — always visible; makes pieces distinguishable even when
          tier colors are similar. 1px in WebGL (hardware limitation on Windows). */}
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color="#9ca3af" />
      </lineSegments>
    </group>
  )
}
