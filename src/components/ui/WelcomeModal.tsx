import { useState } from 'react'

const STORAGE_KEY = 'bbp-welcome-dismissed'

interface Props {
  onDismiss: () => void
}

export default function WelcomeModal({ onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl text-gray-200 w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-indigo-300 mb-1">BBP Base Planner</h1>
        <p className="text-sm text-gray-400 mb-5">
          Plan your{' '}
          <span className="text-gray-200 font-medium">BaseBuildingPlus</span> base
          before breaking a single plank in-game.
        </p>

        <div className="bg-gray-800 rounded-lg p-4 mb-6 text-sm text-gray-300 space-y-2">
          <p className="font-medium text-gray-200">What is BaseBuildingPlus?</p>
          <p className="text-gray-400">
            BBP is a popular DayZ mod that expands building far beyond vanilla — multi-story
            bases, tiered upgrades (wood → metal → concrete), lockable doors, hatches, and
            server-configurable raid rules. This planner mirrors the full BBP part catalog so
            you can design, resource-plan, and share your base layout before committing
            materials in-game.
          </p>
        </div>

        <ul className="text-sm text-gray-400 space-y-1.5 mb-8 ml-1">
          <li>🧱 Full BBP parts catalog with snap placement</li>
          <li>📐 Exterior &amp; interior camera modes</li>
          <li>🪵 Per-tier resource cost totals</li>
          <li>🔗 Share builds with a single URL</li>
          <li>💾 Auto-saves to your browser</li>
        </ul>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Start from scratch
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 text-sm cursor-not-allowed"
            >
              Try a template
              <span className="block text-xs text-gray-600">Coming soon</span>
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 text-sm cursor-not-allowed"
            >
              30-second demo
              <span className="block text-xs text-gray-600">Coming soon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
