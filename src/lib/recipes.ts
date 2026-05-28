import type { PartDef, PlacedPiece, Resource, Tier } from '../data/types'

const TIER_ORDER: Tier[] = ['frame', 't1', 't2', 't3']

// Returns the resources needed to build a single part up to (and including)
// the given tier. Handles cumulative vs standalone tier recipes.
export function resourcesForPart(
  part: PartDef,
  tier: Tier
): Partial<Record<Resource, number>> {
  const targetIdx = TIER_ORDER.indexOf(tier)
  const totals: Partial<Record<Resource, number>> = {}

  // Walk tiers up to and including target. Standalone (non-cumulative) tiers
  // replace prior totals; cumulative tiers add to them.
  for (let i = 0; i <= targetIdx; i++) {
    const t = TIER_ORDER[i]
    const recipe = part.recipes[t]
    if (!recipe) continue

    if (recipe.cumulative === false) {
      // Standalone recipe — reset accumulator
      for (const key of Object.keys(totals) as Resource[]) {
        delete totals[key]
      }
    }
    for (const [res, qty] of Object.entries(recipe.resources) as [Resource, number][]) {
      totals[res] = (totals[res] ?? 0) + qty
    }
  }
  return totals
}

// Aggregates resource totals across all placed pieces, given the parts catalog.
export function aggregateResources(
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): Partial<Record<Resource, number>> {
  const totals: Partial<Record<Resource, number>> = {}
  for (const piece of pieces) {
    const part = partsById[piece.partId]
    if (!part) continue
    const partTotals = resourcesForPart(part, piece.tier)
    for (const [res, qty] of Object.entries(partTotals) as [Resource, number][]) {
      totals[res] = (totals[res] ?? 0) + qty
    }
  }
  return totals
}
