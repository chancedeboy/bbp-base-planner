import { useMemo, useState } from 'react'
import { useBuildStore } from '../../state/useBuildStore'
import { computeBuildCentroid, detectFloorLevels } from '../../lib/snap'
import { PARTS_BY_ID } from '../../data/parts'
import { encodeBuild } from '../../lib/serialise'
import Settings from './Settings'

// Standing eye height above a floor surface, in metres.
const EYE_HEIGHT = 1.7

// Camera positions for the three preset views (orbit, top-down, isometric).
const CAMERA_PRESETS = {
  orbit: { position: [10, 10, 10] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  top:   { position: [0, 60, 0.001] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  iso:   { position: [20, 20, 20] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
}

// Move the camera to stand at eye height above `floorTopY`, facing the build centroid.
function interiorCameraMove(
  cx: number,
  cz: number,
  floorTopY: number
): { position: [number, number, number]; target: [number, number, number] } {
  const y = floorTopY + EYE_HEIGHT
  return {
    position: [cx + 2, y, cz + 2],
    target: [cx, y, cz],
  }
}

export default function TopBar() {
  const snapEnabled = useBuildStore((s) => s.snapEnabled)
  const toggleSnap = useBuildStore((s) => s.toggleSnap)
  const mode = useBuildStore((s) => s.mode)
  const setMode = useBuildStore((s) => s.setMode)
  const pieces = useBuildStore((s) => s.pieces)
  const floorLevel = useBuildStore((s) => s.floorLevel)
  const floorMarkers = useBuildStore((s) => s.floorMarkers)
  const setFloorLevel = useBuildStore((s) => s.setFloorLevel)
  const toggleFloorMarker = useBuildStore((s) => s.toggleFloorMarker)
  const setPendingCameraMove = useBuildStore((s) => s.setPendingCameraMove)
  const meta = useBuildStore((s) => s.meta)
  const serverConfig = useBuildStore((s) => s.serverConfig)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const encoded = encodeBuild({ pieces, meta, serverConfig, snapEnabled })
    const url = `${window.location.origin}${window.location.pathname}?b=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Merge auto-detected floors (from placed floor/foundation pieces) with any
  // manually pinned Y levels. This is the source of truth for navigation.
  const allFloorLevels = useMemo(() => {
    const detected = detectFloorLevels(pieces, PARTS_BY_ID)
    const combined = new Map<number, true>()
    for (const y of detected) combined.set(Math.round(y * 10) / 10, true)
    for (const y of floorMarkers) combined.set(Math.round(y * 10) / 10, true)
    return [...combined.keys()].sort((a, b) => a - b)
  }, [pieces, floorMarkers])

  // Guard against the index going out of range when pieces are removed.
  const safeFloorIdx = Math.min(floorLevel, allFloorLevels.length - 1)
  const currentFloorY = allFloorLevels[safeFloorIdx] ?? 0
  const isPinned = floorMarkers.some((m) => Math.abs(m - currentFloorY) < 0.05)

  const jumpToFloor = (idx: number) => {
    const y = allFloorLevels[idx] ?? 0
    const [cx, cz] = computeBuildCentroid(pieces, PARTS_BY_ID)
    setFloorLevel(idx)
    setPendingCameraMove(interiorCameraMove(cx, cz, y))
  }

  const handleModeToggle = () => {
    const next = mode === 'exterior' ? 'interior' : 'exterior'
    setMode(next)
    if (next === 'interior') {
      jumpToFloor(0)
    } else {
      setFloorLevel(0)
      setPendingCameraMove(CAMERA_PRESETS.orbit)
    }
  }

  return (
    <>
      <header className="h-12 flex items-center px-4 bg-gray-950 border-b border-gray-800 text-gray-200 gap-3">
        <h1 className="text-sm font-semibold tracking-wide text-indigo-300 shrink-0">
          BBP Base Planner
        </h1>
        <div className="flex-1" />

        {/* Camera preset buttons */}
        <div className="flex gap-1">
          {(Object.entries(CAMERA_PRESETS) as [keyof typeof CAMERA_PRESETS, typeof CAMERA_PRESETS[keyof typeof CAMERA_PRESETS]][]).map(
            ([key, move]) => (
              <button
                key={key}
                type="button"
                title={{ orbit: 'Orbit view', top: 'Top-down view', iso: 'Isometric view' }[key]}
                onClick={() => setPendingCameraMove(move)}
                className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors"
              >
                {{ orbit: '3D', top: 'Top', iso: 'Iso' }[key]}
              </button>
            )
          )}
        </div>

        <div className="w-px h-5 bg-gray-700" />

        {/* Exterior / Interior mode toggle */}
        <button
          type="button"
          onClick={handleModeToggle}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            mode === 'interior'
              ? 'bg-amber-700 border-amber-600 text-white'
              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
          }`}
          title={mode === 'exterior' ? 'Enter interior view' : 'Exit interior view'}
        >
          {mode === 'exterior' ? 'Exterior' : 'Interior'}
        </button>

        {/* Floor selector — visible only in interior mode */}
        {mode === 'interior' && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => jumpToFloor(safeFloorIdx - 1)}
              disabled={safeFloorIdx === 0}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Lower floor"
            >
              ↓
            </button>
            <span className="w-20 text-center text-gray-300" title={`Top surface Y: ${currentFloorY.toFixed(1)} m`}>
              {safeFloorIdx + 1} / {allFloorLevels.length}
            </span>
            <button
              type="button"
              onClick={() => jumpToFloor(safeFloorIdx + 1)}
              disabled={safeFloorIdx >= allFloorLevels.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Upper floor"
            >
              ↑
            </button>
            {/* Pin button — adds the current floor level as a manual marker so it
                persists even if no floor piece is placed at that height. */}
            <button
              type="button"
              onClick={() => toggleFloorMarker(currentFloorY)}
              className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${
                isPinned
                  ? 'bg-amber-700 border-amber-600 text-white'
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              }`}
              title={isPinned ? 'Unpin this floor level' : 'Pin this floor level manually'}
            >
              📌
            </button>
          </div>
        )}

        <div className="w-px h-5 bg-gray-700" />

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={toggleSnap}
            className="accent-indigo-500"
          />
          Snap
        </label>
        <button
          type="button"
          onClick={handleShare}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            copied
              ? 'bg-green-700 border-green-600 text-white'
              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
          }`}
          title="Copy share URL to clipboard"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700"
        >
          Settings
        </button>
      </header>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </>
  )
}
