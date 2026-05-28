import { useMemo } from 'react'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PARTS,
} from '../../data/parts'
import type { PartDef } from '../../data/types'
import { useBuildStore } from '../../state/useBuildStore'

export default function PartsPalette() {
  const selectedPartId = useBuildStore((s) => s.selectedPartId)
  const selectPart = useBuildStore((s) => s.selectPart)

  const grouped = useMemo(() => {
    const map = new Map<PartDef['category'], PartDef[]>()
    for (const part of PARTS) {
      const arr = map.get(part.category) ?? []
      arr.push(part)
      map.set(part.category, arr)
    }
    return map
  }, [])

  return (
    <aside className="w-64 h-full overflow-y-auto bg-gray-950 text-gray-200 border-r border-gray-800">
      <div className="p-3 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Parts
        </h2>
        {selectedPartId && (
          <p className="mt-1 text-xs text-indigo-400">
            Click ground to place. Press ESC to cancel.
          </p>
        )}
      </div>
      {CATEGORY_ORDER.map((cat) => {
        const parts = grouped.get(cat) ?? []
        if (parts.length === 0) return null
        return (
          <div key={cat} className="border-b border-gray-800">
            <div className="px-3 py-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: CATEGORY_COLORS[cat] }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {CATEGORY_LABELS[cat]}
              </span>
            </div>
            <ul>
              {parts.map((p) => {
                const active = p.id === selectedPartId
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectPart(active ? null : p.id)}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-800 transition-colors ${
                        active ? 'bg-indigo-900/40 text-indigo-200' : ''
                      }`}
                    >
                      {p.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </aside>
  )
}
