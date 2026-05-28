import ErrorBoundary from './components/ErrorBoundary'
import MobileSplash from './components/MobileSplash'
import PartsPalette from './components/ui/PartsPalette'
import EditorCanvas from './components/scene/EditorCanvas'

export default function App() {
  return (
    <ErrorBoundary>
      <MobileSplash />
      <div className="w-full h-full flex bg-gray-900">
        <PartsPalette />
        <div className="flex-1 relative">
          <EditorCanvas />
        </div>
      </div>
    </ErrorBoundary>
  )
}
