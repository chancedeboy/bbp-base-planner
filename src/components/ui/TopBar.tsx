import { useState } from 'react'
import { useBuildStore } from '../../state/useBuildStore'
import Settings from './Settings'

export default function TopBar() {
  const snapEnabled = useBuildStore((s) => s.snapEnabled)
  const toggleSnap = useBuildStore((s) => s.toggleSnap)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <header className="h-12 flex items-center px-4 bg-gray-950 border-b border-gray-800 text-gray-200 gap-4">
        <h1 className="text-sm font-semibold tracking-wide text-indigo-300">
          BBP Base Planner
        </h1>
        <div className="flex-1" />
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
