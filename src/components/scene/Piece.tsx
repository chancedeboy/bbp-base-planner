import type { ThreeEvent } from '@react-three/fiber'
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

  if (!part) return null

  const isSelected = selectedPieceId === piece.uuid
  const { w, h, d } = part.dimensions
  const color = TIER_COLORS[piece.tier]

  // Clicks while a part is being placed should pass through to the BuildPad
  // (so the new piece can be placed). Otherwise, click to select.
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (selectedPartId) return
    e.stopPropagation()
    selectPiece(piece.uuid)
  }

  return (
    <mesh
      position={piece.position}
      rotation={piece.rotation}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? '#4f46e5' : '#000000'}
        emissiveIntensity={isSelected ? 0.4 : 0}
      />
    </mesh>
  )
}
