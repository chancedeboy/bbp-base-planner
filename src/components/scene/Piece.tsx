import { CATEGORY_COLORS, getPart } from '../../data/parts'
import type { PlacedPiece } from '../../data/types'

interface Props {
  piece: PlacedPiece
}

export default function Piece({ piece }: Props) {
  const part = getPart(piece.partId)
  if (!part) return null

  const { w, h, d } = part.dimensions
  const color = CATEGORY_COLORS[part.category]

  return (
    <mesh
      position={piece.position}
      rotation={piece.rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
