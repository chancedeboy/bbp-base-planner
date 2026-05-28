import { useState } from 'react'

const STORAGE_KEY = 'bbp-mobile-dismissed'

export default function MobileSplash() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gray-900 p-8 text-white">
      <div className="text-5xl">🏗️</div>
      <h1 className="text-center text-2xl font-bold">BBP Base Planner</h1>
      <p className="text-center text-gray-400 max-w-xs">
        This tool is designed for desktop use. Please open it on a larger screen for the best experience.
      </p>
      <button
        className="mt-2 rounded bg-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-600"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, 'true')
          setDismissed(true)
        }}
      >
        Remind me later
      </button>
    </div>
  )
}
