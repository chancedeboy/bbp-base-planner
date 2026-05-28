import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

// WASD camera movement. Runs alongside OrbitControls — left-click drag still
// orbits, right-click drag still pans, scroll still zooms. WASD slides the
// camera (and its OrbitControls target) horizontally relative to the camera's
// look direction, projected onto the ground plane. Works during placement,
// too, since key state is tracked independently of part selection.
const MOVE_KEYS = new Set(['w', 'a', 's', 'd'])
const SPEED = 12 // meters per second; Shift sprints at 2×

export default function CameraController() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as { target: Vector3 } | null
  const keysRef = useRef<Set<string>>(new Set())
  const shiftRef = useRef(false)

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
    const keys = keysRef.current
    if (keys.size === 0 || !controls) return

    const forward = new Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() < 1e-6) return
    forward.normalize()

    // Right = forward × up (Y up)
    const right = new Vector3(-forward.z, 0, forward.x)

    const move = new Vector3()
    if (keys.has('w')) move.add(forward)
    if (keys.has('s')) move.sub(forward)
    if (keys.has('d')) move.add(right)
    if (keys.has('a')) move.sub(right)

    if (move.lengthSq() === 0) return
    const speed = shiftRef.current ? SPEED * 2 : SPEED
    move.normalize().multiplyScalar(speed * delta)
    camera.position.add(move)
    controls.target.add(move)
  })

  return null
}
