import ErrorBoundary from './components/ErrorBoundary'
import MobileSplash from './components/MobileSplash'
import TopBar from './components/ui/TopBar'
import PartsPalette from './components/ui/PartsPalette'
import EditorCanvas from './components/scene/EditorCanvas'

export default function App() {
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
        </div>
      </div>
    </ErrorBoundary>
  )
}
