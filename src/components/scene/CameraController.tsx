import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { useBuildStore } from '../../state/useBuildStore'
import { computeBuildBounds, computeBuildCeiling } from '../../lib/snap'
import { PARTS_BY_ID } from '../../data/parts'

interface OrbitRef {
  target: Vector3
  update: () => void
}

// WASD camera movement. Runs alongside OrbitControls — left-click drag still
// orbits, right-click drag still pans, scroll still zooms. WASD slides the
// camera (and its OrbitControls target) horizontally relative to the camera's
// look direction, projected onto the ground plane. Works during placement,
// too, since key state is tracked independently of part selection.
const MOVE_KEYS = new Set(['w', 'a', 's', 'd'])
const EXTERIOR_SPEED = 12 // m/s; Shift sprints at 2×
const EXTERIOR_FOV = 50
const INTERIOR_FOV = 75   // wider FOV gives more working space inside
// Keep the camera 0.3m inside the wall faces so it doesn't clip through.
const INTERIOR_INSET = 0.3

export default function CameraController() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitRef | null
  const keysRef = useRef<Set<string>>(new Set())
  const shiftRef = useRef(false)

  const pendingCameraMove = useBuildStore((s) => s.pendingCameraMove)
  const setPendingCameraMove = useBuildStore((s) => s.setPendingCameraMove)
  const mode = useBuildStore((s) => s.mode)
  const pieces = useBuildStore((s) => s.pieces)

  // Interior: bounding box of the floor footprint (null = no footprint yet).
  // Also store the diagonal-derived speed and ceiling Y so useFrame reads stable refs.
  type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number }
  const boundsRef = useRef<Bounds | null>(null)
  const interiorSpeedRef = useRef(EXTERIOR_SPEED)
  const ceilingRef = useRef<number | null>(null)

  useEffect(() => {
    if (mode !== 'interior') {
      boundsRef.current = null
      ceilingRef.current = null
      return
    }
    const b = computeBuildBounds(pieces, PARTS_BY_ID)
    boundsRef.current = b
    ceilingRef.current = computeBuildCeiling(pieces, PARTS_BY_ID)
    if (b) {
      const w = b.maxX - b.minX
      const d = b.maxZ - b.minZ
      const diagonal = Math.sqrt(w * w + d * d)
      // Cross the building in ~2.5s; floor at 2 m/s for tiny builds.
      interiorSpeedRef.current = Math.max(2, diagonal / 2.5)
    }
  }, [pieces, mode])

  // Apply a pending camera move triggered from outside the canvas (TopBar buttons,
  // mode toggle, floor selector). Cleared immediately after applying.
  useEffect(() => {
    if (!pendingCameraMove || !controls) return
    const { position, target } = pendingCameraMove
    camera.position.set(...position)
    controls.target.set(...target)
    controls.update()
    setPendingCameraMove(null)
  }, [pendingCameraMove, camera, controls, setPendingCameraMove])

  // Widen FOV when inside a building so more of the interior is visible.
  // Three.js camera mutation is the correct R3F pattern — react-hooks/immutability
  // is a false positive here (camera is a Three.js object, not React state).
  useEffect(() => {
    const cam = camera as PerspectiveCamera
    // eslint-disable-next-line react-hooks/immutability
    cam.fov = mode === 'interior' ? INTERIOR_FOV : EXTERIOR_FOV
    cam.updateProjectionMatrix()
  }, [mode, camera])

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const key = e.key.toLowerCase()
      if (MOVE_KEYS.has(key)) {
        keysRef.current.add(key)
        e.preventDefault()
      }
      if (e.shiftKey) shiftRef.current = true
    }
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
      if (!e.shiftKey) shiftRef.current = false
    }
    const onBlur = () => {
      // Releasing focus (alt-tab, devtools) — clear all held keys so the
      // camera doesn't keep drifting forever.
      keysRef.current.clear()
      shiftRef.current = false
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useFrame((_, delta) => {
    if (!controls) return
    const isInterior = useBuildStore.getState().mode === 'interior'

    // WASD movement — horizontal only, projected onto the ground plane.
    const keys = keysRef.current
    if (keys.size > 0) {
      const forward = new Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() >= 1e-6) {
        forward.normalize()
        // Right = forward × up (Y up)
        const right = new Vector3(-forward.z, 0, forward.x)
        const move = new Vector3()
        if (keys.has('w')) move.add(forward)
        if (keys.has('s')) move.sub(forward)
        if (keys.has('d')) move.add(right)
        if (keys.has('a')) move.sub(right)
        if (move.lengthSq() > 0) {
          const baseSpeed = isInterior ? interiorSpeedRef.current : EXTERIOR_SPEED
          const speed = shiftRef.current ? baseSpeed * 2 : baseSpeed
          move.normalize().multiplyScalar(speed * delta)
          camera.position.add(move)
          controls.target.add(move)
        }
      }
    }

    // Interior boundary clamps — run every frame so OrbitControls scroll/orbit
    // is also constrained (not just WASD). Uses .set() method calls to satisfy
    // the react-hooks/immutability rule.
    if (isInterior) {
      const lo = INTERIOR_INSET
      const clamp = (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v))

      // XZ: keep camera inside the floor footprint walls.
      if (boundsRef.current) {
        const b = boundsRef.current
        camera.position.set(
          clamp(camera.position.x, b.minX + lo, b.maxX - lo),
          camera.position.y,
          clamp(camera.position.z, b.minZ + lo, b.maxZ - lo)
        )
        controls.target.set(
          clamp(controls.target.x, b.minX + lo, b.maxX - lo),
          controls.target.y,
          clamp(controls.target.z, b.minZ + lo, b.maxZ - lo)
        )
      }

      // Y: keep camera below the ceiling surface.
      if (ceilingRef.current !== null) {
        const maxY = ceilingRef.current - lo
        camera.position.set(
          camera.position.x,
          Math.min(camera.position.y, maxY),
          camera.position.z
        )
        controls.target.set(
          controls.target.x,
          Math.min(controls.target.y, maxY),
          controls.target.z
        )
      }
    }
  })

  return null
}
