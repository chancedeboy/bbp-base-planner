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
  rankCandidatesByCoverage,
  type Vec3,
} from '../../lib/snap'
import type { Category } from '../../data/types'

const SNAP_RADIUS = 3 // meters

// In free-placement mode (snap off, no Shift): only floors and foundations set
// the elevation so walls can be freely overlapped without the ghost jumping on
// top of them. Shift = true free-form where even floors are ignored.
const FLOOR_CATEGORIES: ReadonlySet<Category> = new Set(['foundation', 'floor'])

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
  const shiftRef = useRef(false)
  const part = selectedPartId ? getPart(selectedPartId) : null

  // Track Shift key state so free-placement can enter full free-form mode.
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.shiftKey) shiftRef.current = true }
    const onUp = (e: KeyboardEvent) => { if (!e.shiftKey) shiftRef.current = false }
    const onBlur = () => { shiftRef.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // World anchors only change when pieces change
  const worldAnchors = useMemo(
    () => computeAllWorldAnchors(pieces, PARTS_BY_ID),
    [pieces]
  )

  useFrame(() => {
    const mesh = meshRef.current
    const cursor = cursorRef.current
    if (!mesh || !part || !cursor) return

    // The raw cursor comes from the BuildPad (ground plane), so cursor.y is
    // ~0 regardless of what the mouse is hovering over. Replace its Y with
    // the elevation probed around the GHOST'S footprint — this is what lets
    // snap ranking distinguish stories AND correctly elevate roofs/floors
    // hovering over the interior of a wall box (where the cursor XZ is over
    // empty air but the ghost's corners sit on the surrounding walls).
    const cursorXZ: Vec3 = [cursor.x, 0, cursor.z]
    const cursorY = computeElevation(cursorXZ, part, pieces, PARTS_BY_ID)
    const cursorVec: Vec3 = [cursor.x, cursorY, cursor.z]
    let position: Vec3
    let rotation: Vec3 = ghostRotation

    if (snapEnabled) {
      const rawCandidates = findSnapCandidates(
        part.category,
        cursorVec,
        worldAnchors,
        SNAP_RADIUS,
        part
      )
      // Re-rank so 'centered over a wall box' wins over 'on top of the nearest
      // single wall' for roofs/floors — the user doesn't need to scroll to find
      // the centered placement in the common box-with-roof case.
      const candidates = rankCandidatesByCoverage(rawCandidates, part, pieces, PARTS_BY_ID)
      if (candidates.length > 0) {
        const idx =
          ((snapCandidateIndex % candidates.length) + candidates.length) %
          candidates.length
        const candidate = candidates[idx]
        position = computeSnapPosition(part, candidate)
        // Snap rotation only when user hasn't manually rotated (ghostRotation = identity)
        if (ghostRotation[1] === 0) {
          rotation = computeSnapRotation(candidate)
        }
      } else {
        // No anchor in range — float at cursor at the elevation we already computed
        position = [cursorVec[0], cursorY + part.dimensions.h / 2, cursorVec[2]]
      }
    } else {
      // Free placement mode (snap off):
      //   • Default: 0.25 m grid, elevation from floors/foundations only —
      //     walls are ignored so pieces can freely overlap them.
      //   • Shift held: true free-form — no elevation at all, piece floats at
      //     ground level regardless of what's below.
      const snapped = gridSnapPoint(cursorVec, 0.25)
      const elevation = shiftRef.current
        ? 0
        : computeElevation(snapped, part, pieces, PARTS_BY_ID, FLOOR_CATEGORIES)
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
