import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Mesh } from 'three'
import { CATEGORY_COLORS, PARTS_BY_ID, getPart } from '../../data/parts'
import { useBuildStore } from '../../state/useBuildStore'
import {
  computeAllWorldAnchors,
  computeElevation,
  computeSnapPosition,
  computeSnapRotation,
  findSnapCandidates,
  gridSnapPoint,
  type Vec3,
} from '../../lib/snap'

const SNAP_RADIUS = 3 // meters

interface Props {
  cursorRef: RefObject<Vector3 | null>
  // Updated each frame so the canvas click handler can read the snapped
  // position+rotation without recomputing the snap math.
  ghostPoseRef: RefObject<{ position: Vec3; rotation: Vec3 } | null>
}

export default function GhostPiece({ cursorRef, ghostPoseRef }: Props) {
  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const ghostRotation = useBuildStore((s) => s.ghostRotation)
  const snapCandidateIndex = useBuildStore((s) => s.snapCandidateIndex)
  const snapEnabled = useBuildStore((s) => s.snapEnabled)
  const pieces = useBuildStore((s) => s.pieces)

  const meshRef = useRef<Mesh>(null)
  const part = selectedPartId ? getPart(selectedPartId) : null

  // World anchors only change when pieces change
  const worldAnchors = useMemo(
    () => computeAllWorldAnchors(pieces, PARTS_BY_ID),
    [pieces]
  )

  useFrame(() => {
    const mesh = meshRef.current
    const cursor = cursorRef.current
    if (!mesh || !part || !cursor) return

    const cursorVec: Vec3 = [cursor.x, cursor.y, cursor.z]
    let position: Vec3
    let rotation: Vec3 = ghostRotation

    if (snapEnabled) {
      const candidates = findSnapCandidates(
        part.category,
        cursorVec,
        worldAnchors,
        SNAP_RADIUS
      )
      if (candidates.length > 0) {
        const idx =
          ((snapCandidateIndex % candidates.length) + candidates.length) %
          candidates.length
        const candidate = candidates[idx].worldAnchor
        position = computeSnapPosition(part, candidate)
        // Snap rotation only when user hasn't manually rotated (ghostRotation = identity)
        if (ghostRotation[1] === 0) {
          rotation = computeSnapRotation(candidate)
        }
      } else {
        // No anchor in range — float at cursor, elevated over what's beneath
        const elevation = computeElevation(cursorVec, part, pieces, PARTS_BY_ID)
        position = [cursorVec[0], elevation + part.dimensions.h / 2, cursorVec[2]]
      }
    } else {
      // Free mode: 0.25m grid + elevation over placed pieces
      const snapped = gridSnapPoint(cursorVec, 0.25)
      const elevation = computeElevation(snapped, part, pieces, PARTS_BY_ID)
      position = [snapped[0], elevation + part.dimensions.h / 2, snapped[2]]
    }

    mesh.position.set(position[0], position[1], position[2])
    mesh.rotation.set(rotation[0], rotation[1], rotation[2])

    ghostPoseRef.current = { position, rotation }
  })

  // Clear the shared ghost pose when no part is selected
  useEffect(() => {
    if (!part) ghostPoseRef.current = null
  }, [part, ghostPoseRef])

  if (!part) return null

  const color = CATEGORY_COLORS[part.category]
  const { w, h, d } = part.dimensions

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} transparent opacity={0.45} />
    </mesh>
  )
}
