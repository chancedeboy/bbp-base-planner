import { useState } from 'react'
import { useBuildStore } from '../../state/useBuildStore'
import { aggregateResources, resourcesForPart } from '../../lib/recipes'
import { getToolsNeeded } from '../../lib/resources'
import { PARTS_BY_ID, getPart } from '../../data/parts'
import type { Resource } from '../../data/types'

const RESOURCE_LABELS: Record<Resource, string> = {
  planks: 'Planks',
  nails: 'Nails',
  logs: 'Logs',
  sheetMetal: 'Sheet Metal',
  concreteBricks: 'Concrete Bricks',
  mortarMix: 'Mortar Mix',
  barbwire: 'Barbwire',
  bbpBook: 'BBP Book',
}

const RESOURCE_ORDER: Resource[] = [
  'planks', 'nails', 'logs', 'sheetMetal',
  'concreteBricks', 'mortarMix', 'barbwire', 'bbpBook',
]

const TIER_LABEL: Record<string, string> = {
  frame: 'Frame',
  t1: 'T1',
  t2: 'T2',
  t3: 'T3',
}

export default function ResourcePanel() {
  const pieces = useBuildStore((s) => s.pieces)
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  if (pieces.length === 0) {
    return (
      <aside className="w-72 h-full overflow-y-auto bg-gray-950 text-gray-200 border-l border-gray-800 flex items-center justify-center">
        <p className="text-xs text-gray-600 text-center px-4">Place pieces to see resource totals</p>
      </aside>
    )
  }

  const totals = aggregateResources(pieces, PARTS_BY_ID)
  const tools = getToolsNeeded(totals)
  const resourceEntries = RESOURCE_ORDER.filter((r) => (totals[r] ?? 0) > 0)

  return (
    <aside className="w-72 h-full overflow-y-auto bg-gray-950 text-gray-200 border-l border-gray-800">
      <div className="p-3 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
        <h2 className="text-sm font-semibold">Resources</h2>
        <p className="text-xs text-gray-500">
          {pieces.length} piece{pieces.length !== 1 ? 's' : ''}
        </p>
      </div>

      <section className="p-3 border-b border-gray-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Totals
        </h3>
        {resourceEntries.length > 0 ? (
          <div className="space-y-1.5">
            {resourceEntries.map((r) => (
              <div key={r} className="flex justify-between text-sm">
                <span className="text-gray-300">{RESOURCE_LABELS[r]}</span>
                <span className="font-mono text-white">{totals[r]}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No materials yet</p>
        )}
      </section>

      {tools.length > 0 && (
        <section className="p-3 border-b border-gray-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Tools Needed
          </h3>
          <div className="space-y-1.5">
            {tools.map((tool) => (
              <div key={tool} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-gray-600">•</span>
                {tool}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="p-3">
        <button
          type="button"
          onClick={() => setBreakdownOpen((o) => !o)}
          className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200 transition-colors"
        >
          <span>Per-Piece Breakdown</span>
          <span>{breakdownOpen ? '▲' : '▼'}</span>
        </button>
        {breakdownOpen && (
          <div className="mt-2 space-y-2">
            {pieces.map((piece) => {
              const part = getPart(piece.partId)
              if (!part) return null
              const partTotals = resourcesForPart(part, piece.tier)
              const entries = RESOURCE_ORDER.filter((r) => (partTotals[r] ?? 0) > 0)
              return (
                <div key={piece.uuid} className="bg-gray-900 rounded p-2 text-xs">
                  <div className="font-medium text-gray-200 truncate">{part.name}</div>
                  <div className="text-gray-500 mb-1">{TIER_LABEL[piece.tier] ?? piece.tier}</div>
                  {entries.length > 0 ? (
                    <div className="space-y-0.5">
                      {entries.map((r) => (
                        <div key={r} className="flex justify-between text-gray-400">
                          <span>{RESOURCE_LABELS[r]}</span>
                          <span className="font-mono">{partTotals[r]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-600">No materials</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </aside>
  )
}
