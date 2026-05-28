import { CATEGORY_LABELS, getPart } from '../../data/parts'
import type { Tier } from '../../data/types'
import { useBuildStore } from '../../state/useBuildStore'
import { clicksToReach, degToRad, nearestValidAngles, radToDeg } from '../../lib/rotation'

const TIER_ORDER: Tier[] = ['frame', 't1', 't2', 't3']
const TIER_LABELS: Record<Tier, string> = {
  frame: 'Frame',
  t1: 'T1 Wood',
  t2: 'T2 Metal',
  t3: 'T3 Concrete',
}

export default function Inspector() {
  const selectedPieceId = useBuildStore((s) => s.selectedPieceId)
  const pieces = useBuildStore((s) => s.pieces)
  const selectPiece = useBuildStore((s) => s.selectPiece)
  const upgradeTier = useBuildStore((s) => s.upgradeTier)
  const setPieceRotation = useBuildStore((s) => s.setPieceRotation)
  const removePiece = useBuildStore((s) => s.removePiece)
  const rotationStep = useBuildStore((s) => s.serverConfig.rotationStep)

  if (!selectedPieceId) return null
  const piece = pieces.find((p) => p.uuid === selectedPieceId)
  if (!piece) return null
  const part = getPart(piece.partId)
  if (!part) return null

  const maxTierIdx = TIER_ORDER.indexOf(part.maxTier)
  const availableTiers = TIER_ORDER.slice(0, maxTierIdx + 1)

  const yawRad = piece.rotation[1]
  const yawDeg = radToDeg(yawRad)
  const clicks = clicksToReach(yawDeg, rotationStep)
  const isDefault = clicks.normalized === 0
  const snapTargets = nearestValidAngles(yawDeg, rotationStep)

  // T3 doors and a few hatches are standalone builds (not upgrades) — flag it
  const t3Recipe = part.recipes.t3
  const t3IsStandalone = t3Recipe?.cumulative === false

  const updateRotation = (newDeg: number) => {
    setPieceRotation(piece.uuid, [0, degToRad(newDeg), 0])
  }

  const handleDelete = () => {
    removePiece(piece.uuid)
    selectPiece(null)
  }

  return (
    <aside className="w-72 h-full overflow-y-auto bg-gray-950 text-gray-200 border-l border-gray-800">
      <div className="p-3 border-b border-gray-800 flex items-start justify-between sticky top-0 bg-gray-950 z-10">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {CATEGORY_LABELS[part.category]}
          </p>
          <h2 className="text-sm font-semibold truncate">{part.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => selectPiece(null)}
          className="text-gray-500 hover:text-gray-200 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <section className="p-3 border-b border-gray-800 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Tier
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {availableTiers.map((tier) => {
            const active = piece.tier === tier
            return (
              <button
                key={tier}
                type="button"
                onClick={() => upgradeTier(piece.uuid, tier)}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                {TIER_LABELS[tier]}
              </button>
            )
          })}
        </div>
        {t3IsStandalone && (
          <p className="text-[11px] text-amber-400 leading-snug mt-1">
            ⚠️ T3 is a separate build in BBP — you destroy the lower-tier piece
            and start over in-game. Editor doesn't enforce this.
          </p>
        )}
      </section>

      <section className="p-3 border-b border-gray-800 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Rotation
        </h3>
        <div className="text-sm">
          <div>
            Yaw: <span className="font-mono">{clicks.normalized.toFixed(1)}°</span>
          </div>
          {isDefault ? (
            <div className="text-xs text-gray-500 mt-1">(default)</div>
          ) : clicks.reachable ? (
            <div className="text-xs text-gray-400 mt-1">
              {clicks[clicks.shorter]} click{clicks[clicks.shorter] === 1 ? '' : 's'}{' '}
              {clicks.shorter === 'cw' ? 'CW' : 'CCW'} at {rotationStep}° step
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-amber-400">
                ⚠️ Not reachable in {rotationStep}° steps. Snap to:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateRotation(snapTargets.lower)}
                  className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
                >
                  {snapTargets.lower}° (
                  {clicksToReach(snapTargets.lower, rotationStep)[
                    clicksToReach(snapTargets.lower, rotationStep).shorter
                  ]}{' '}
                  {clicksToReach(snapTargets.lower, rotationStep).shorter.toUpperCase()})
                </button>
                <button
                  type="button"
                  onClick={() => updateRotation(snapTargets.upper)}
                  className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:border-gray-600"
                >
                  {snapTargets.upper}° (
                  {clicksToReach(snapTargets.upper, rotationStep)[
                    clicksToReach(snapTargets.upper, rotationStep).shorter
                  ]}{' '}
                  {clicksToReach(snapTargets.upper, rotationStep).shorter.toUpperCase()})
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="p-3 text-xs text-gray-500 space-y-1">
        <div>UUID: <span className="font-mono">{piece.uuid.slice(0, 8)}…</span></div>
        <div>
          Position:{' '}
          <span className="font-mono">
            ({piece.position[0].toFixed(2)}, {piece.position[1].toFixed(2)},{' '}
            {piece.position[2].toFixed(2)})
          </span>
        </div>
      </section>

      <section className="p-3 border-t border-gray-800">
        <button
          type="button"
          onClick={handleDelete}
          className="w-full px-3 py-2 text-xs font-medium rounded border border-red-900 bg-red-950 text-red-200 hover:bg-red-900 hover:border-red-700 transition-colors"
        >
          Delete Piece <span className="text-red-400 ml-1">(Del)</span>
        </button>
      </section>
    </aside>
  )
}

