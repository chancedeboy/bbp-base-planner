import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import MobileSplash from './components/MobileSplash'
import TopBar from './components/ui/TopBar'
import PartsPalette from './components/ui/PartsPalette'
import Inspector from './components/ui/Inspector'
import ResourcePanel from './components/ui/ResourcePanel'
import EditorCanvas from './components/scene/EditorCanvas'
import { useBuildStore } from './state/useBuildStore'
import { decodeBuild } from './lib/serialise'

export default function App() {
  const selectedPieceId = useBuildStore((s) => s.selectedPieceId)
  const loadBuild = useBuildStore((s) => s.loadBuild)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('b')
    if (!encoded) return
    try {
      loadBuild(decodeBuild(encoded))
      // Remove the param so a refresh doesn't re-load the share over edits.
      window.history.replaceState(null, '', window.location.pathname)
    } catch (e) {
      console.error('[BBP] Failed to load shared build:', e)
    }
  }, [loadBuild])

  return (
    <ErrorBoundary>
      <MobileSplash />
      <div className="w-full h-full flex flex-col bg-gray-900">
        <TopBar />
        <div className="flex-1 flex min-h-0">
          <PartsPalette />
          <div className="flex-1 relative">
            <EditorCanvas />
          </div>
          {selectedPieceId ? <Inspector /> : <ResourcePanel />}
        </div>
      </div>
    </ErrorBoundary>
  )
}
