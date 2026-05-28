import { useEffect, useMemo, useRef, type RefObject, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Plane, Raycaster, Vector3, type Mesh } from 'three'
import { CATEGORY_COLORS, PARTS_BY_ID, getPart } from '../../data/parts'
import { useBuildStore } from '../../state/useBuildStore'
import {
  computeAllWorldAnchors,
  computeElevation,
  computeSnapPosition,
  computeSnapRotation,
  detectFloorLevels,
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
  const floorLevel = useBuildStore((s) => s.floorLevel)
  const floorMarkers = useBuildStore((s) => s.floorMarkers)

  const meshRef = useRef<Mesh>(null)
  const shiftRef = useRef(false)
  const part = selectedPartId ? getPart(selectedPartId) : null

  // Pre-allocated Three.js objects so useFrame never triggers GC.
  const raycasterRef = useRef(new Raycaster())
  const floorPlaneRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const hitTargetRef = useRef(new Vector3())

  // Current floor surface Y — updated whenever floor level or pieces change.
  // Stored in a ref so useFrame reads it without causing re-renders.
  const floorYRef = useRef(0) as MutableRefObject<number>
  const floorY = useMemo(() => {
    const detected = detectFloorLevels(pieces, PARTS_BY_ID)
    const combined = new Map<number, true>()
    for (const y of detected) combined.set(Math.round(y * 10) / 10, true)
    for (const y of floorMarkers) combined.set(Math.round(y * 10) / 10, true)
    const levels = [...combined.keys()].sort((a, b) => a - b)
    return levels[Math.min(floorLevel, levels.length - 1)] ?? 0
  }, [pieces, floorMarkers, floorLevel])
  useEffect(() => { floorYRef.current = floorY }, [floorY])

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

  useFrame(({ camera, pointer }) => {
    const mesh = meshRef.current
    if (!mesh || !part) return

    const isInterior = useBuildStore.getState().mode === 'interior'

    // Determine cursor XZ.
    //
    // Exterior: read from cursorRef (set by BuildPad ground-plane raycasting).
    //
    // Interior: cast a ray from the camera through the mouse pointer and
    // intersect a mathematical horizontal plane at the current floor level.
    // This works regardless of where the camera is looking — no need to aim
    // at the floor mesh. If the ray points upward (ceiling/sky) we freeze
    // the ghost at its last position.
    let cursorX: number
    let cursorZ: number

    if (isInterior) {
      floorPlaneRef.current.constant = -floorYRef.current
      raycasterRef.current.setFromCamera(pointer, camera)
      const hit = raycasterRef.current.ray.intersectPlane(
        floorPlaneRef.current,
        hitTargetRef.current
      )
      if (!hit) {
        // Ray is pointing up or horizontal — keep the ghost where it was.
        return
      }
      cursorX = hitTargetRef.current.x
      cursorZ = hitTargetRef.current.z
    } else {
      const cursor = cursorRef.current
      if (!cursor) return
      cursorX = cursor.x
      cursorZ = cursor.z
    }

    const cursorXZ: Vec3 = [cursorX, 0, cursorZ]
    const cursorY = computeElevation(cursorXZ, part, pieces, PARTS_BY_ID)
    const cursorVec: Vec3 = [cursorX, cursorY, cursorZ]
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
      // single wall' for roofs/floors.
      const candidates = rankCandidatesByCoverage(rawCandidates, part, pieces, PARTS_BY_ID)
      if (candidates.length > 0) {
        const idx =
          ((snapCandidateIndex % candidates.length) + candidates.length) %
          candidates.length
        const candidate = candidates[idx]
        position = computeSnapPosition(part, candidate)
        if (ghostRotation[1] === 0) {
          rotation = computeSnapRotation(candidate)
        }
      } else {
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
