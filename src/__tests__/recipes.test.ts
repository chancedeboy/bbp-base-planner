import { describe, it, expect } from 'vitest'
import { PARTS_BY_ID, getPart } from '../data/parts'
import { resourcesForPart, aggregateResources } from '../lib/recipes'
import type { PlacedPiece } from '../data/types'

describe('resourcesForPart', () => {
  it('returns frame-only recipe for a frame tier piece', () => {
    const wall = getPart('large-wall')!
    expect(resourcesForPart(wall, 'frame')).toEqual({ nails: 10, planks: 5 })
  })

  it('accumulates cumulative tiers (frame + t1)', () => {
    const wall = getPart('large-wall')!
    // frame: 10 nails + 5 planks; t1 adds 10 nails + 2 logs
    expect(resourcesForPart(wall, 't1')).toEqual({
      nails: 20,
      planks: 5,
      logs: 2,
    })
  })

  it('accumulates through all tiers for a wall (frame + t1 + t2 + t3)', () => {
    const wall = getPart('large-wall')!
    expect(resourcesForPart(wall, 't3')).toEqual({
      nails: 30,
      planks: 5,
      logs: 2,
      sheetMetal: 4,
      concreteBricks: 3,
      mortarMix: 1,
    })
  })

  it('replaces accumulator for standalone (non-cumulative) tiers — T3 door', () => {
    // Large Door T3 is a SEPARATE build, not an upgrade. Its recipe stands alone.
    const door = getPart('large-door')!
    expect(resourcesForPart(door, 't3')).toEqual({
      nails: 15,
      sheetMetal: 5,
      planks: 5,
    })
  })

  it('handles tiers below maxTier without error (barbwire only has t1)', () => {
    const wire = getPart('barbwire-barrier')!
    expect(resourcesForPart(wire, 't1')).toEqual({
      nails: 20,
      logs: 2,
      barbwire: 1,
    })
  })
})

describe('aggregateResources', () => {
  it('sums totals across multiple placed pieces', () => {
    const pieces: PlacedPiece[] = [
      mkPiece('large-wall', 'frame'),
      mkPiece('large-wall', 'frame'),
      mkPiece('small-wall', 'frame'),
    ]
    expect(aggregateResources(pieces, PARTS_BY_ID)).toEqual({
      // 2× large wall frame: 2*(10 nails + 5 planks) = 20 nails, 10 planks
      // 1× small wall frame: 10 nails + 3 planks
      nails: 30,
      planks: 13,
    })
  })

  it('returns empty totals for an empty build', () => {
    expect(aggregateResources([], PARTS_BY_ID)).toEqual({})
  })

  it('skips pieces with unknown partId', () => {
    const pieces: PlacedPiece[] = [
      mkPiece('large-wall', 'frame'),
      mkPiece('does-not-exist', 'frame'),
    ]
    expect(aggregateResources(pieces, PARTS_BY_ID)).toEqual({
      nails: 10,
      planks: 5,
    })
  })

  it('handles mixed tiers correctly', () => {
    const pieces: PlacedPiece[] = [
      mkPiece('large-wall', 't2'),
      mkPiece('small-wall', 'frame'),
    ]
    // large-wall t2 cumulative: 30 nails (10+10+10) + 5 planks + 2 logs + 4 sheetMetal
    // small-wall frame: 10 nails + 3 planks
    expect(aggregateResources(pieces, PARTS_BY_ID)).toEqual({
      nails: 40,
      planks: 8,
      logs: 2,
      sheetMetal: 4,
    })
  })
})

function mkPiece(partId: string, tier: PlacedPiece['tier']): PlacedPiece {
  return {
    uuid: crypto.randomUUID(),
    partId,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    tier,
    layer: 'exterior',
  }
}
