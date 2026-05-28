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
  // Lift the piece so its base sits on the ground at piece.position.y
  const y = piece.position[1] + h / 2

  return (
    <mesh
      position={[piece.position[0], y, piece.position[2]]}
      rotation={piece.rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
