import ErrorBoundary from './components/ErrorBoundary'
import MobileSplash from './components/MobileSplash'
import EditorCanvas from './components/scene/EditorCanvas'

export default function App() {
  return (
    <ErrorBoundary>
      <div className="w-full h-full bg-gray-900">
        <MobileSplash />
        <EditorCanvas />
      </div>
    </ErrorBoundary>
  )
}
