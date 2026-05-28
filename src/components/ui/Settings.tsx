import { useBuildStore } from '../../state/useBuildStore'

interface Props {
  onClose: () => void
}

const ROTATION_STEPS = [5, 15, 45, 90]

export default function Settings({ onClose }: Props) {
  const rotationStep = useBuildStore((s) => s.serverConfig.rotationStep)
  const setServerConfig = useBuildStore((s) => s.setServerConfig)

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl text-gray-200 w-96 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <section className="space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Rotation step
            </label>
            <p className="text-xs text-gray-500 mt-1 mb-2">
              Degrees per scroll-click for fine rotation (Shift+R). Match your
              server's BBP advanced rotation setting.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ROTATION_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setServerConfig({ rotationStep: step })}
                className={`px-3 py-2 rounded text-sm border transition-colors ${
                  rotationStep === step
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                {step}°
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 text-xs text-gray-500">
          <p className="mb-1">Keyboard shortcuts:</p>
          <ul className="space-y-0.5 ml-3 list-disc">
            <li>
              <kbd className="text-gray-300">W</kbd>{' '}
              <kbd className="text-gray-300">A</kbd>{' '}
              <kbd className="text-gray-300">S</kbd>{' '}
              <kbd className="text-gray-300">D</kbd> — move camera
              (Shift = sprint)
            </li>
            <li><kbd className="text-gray-300">R</kbd> — rotate ghost 90°</li>
            <li>
              <kbd className="text-gray-300">Shift+R</kbd> — rotate by
              rotation step
            </li>
            <li>
              <kbd className="text-gray-300">Mouse wheel</kbd> — cycle snap
              candidates (while placing)
            </li>
            <li><kbd className="text-gray-300">ESC</kbd> — cancel placement</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
