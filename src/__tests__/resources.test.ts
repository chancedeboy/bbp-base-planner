import { describe, it, expect } from 'vitest'
import { getToolsNeeded } from '../lib/resources'
import { aggregateResources } from '../lib/recipes'
import { PARTS_BY_ID, getPart } from '../data/parts'
import type { PlacedPiece } from '../data/types'

describe('getToolsNeeded', () => {
  it('returns empty array for empty totals', () => {
    expect(getToolsNeeded({})).toEqual([])
  })

  it('always includes BBP Hammer when any resources are present', () => {
    expect(getToolsNeeded({ nails: 10 })).toContain('BBP Hammer')
  })

  it('includes Handsaw when planks are required', () => {
    const tools = getToolsNeeded({ planks: 5, nails: 10 })
    expect(tools).toContain('Handsaw')
    expect(tools).not.toContain('Axe')
  })

  it('includes Axe and Sharpening Stone when logs are required', () => {
    const tools = getToolsNeeded({ logs: 2, nails: 10 })
    expect(tools).toContain('Axe')
    expect(tools).toContain('Sharpening Stone')
  })

  it('includes Shovel / Pickaxe when concreteBricks are required', () => {
    expect(getToolsNeeded({ concreteBricks: 3, nails: 10 })).toContain('Shovel / Pickaxe')
  })

  it('includes Shovel / Pickaxe when mortarMix is required', () => {
    expect(getToolsNeeded({ mortarMix: 1 })).toContain('Shovel / Pickaxe')
  })

  it('includes Sharpening Stone when planks are required', () => {
    expect(getToolsNeeded({ planks: 5 })).toContain('Sharpening Stone')
  })

  it('does not include Axe or Handsaw when only sheet metal and nails', () => {
    const tools = getToolsNeeded({ sheetMetal: 4, nails: 10 })
    expect(tools).not.toContain('Axe')
    expect(tools).not.toContain('Handsaw')
    expect(tools).not.toContain('Sharpening Stone')
  })
})

describe('Sprint 4 acceptance criteria', () => {
  it('4 large walls frame → nails: 40, planks: 20', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 4 }, () => ({
      uuid: crypto.randomUUID(),
      partId: 'large-wall',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }))
    const totals = aggregateResources(pieces, PARTS_BY_ID)
    expect(totals.nails).toBe(40)
    expect(totals.planks).toBe(20)
  })

  it('4 large walls frame → tools include BBP Hammer and Handsaw', () => {
    const pieces: PlacedPiece[] = Array.from({ length: 4 }, () => ({
      uuid: crypto.randomUUID(),
      partId: 'large-wall',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }))
    const totals = aggregateResources(pieces, PARTS_BY_ID)
    const tools = getToolsNeeded(totals)
    expect(tools).toContain('BBP Hammer')
    expect(tools).toContain('Handsaw')
  })

  it('large-wall part exists in catalog', () => {
    expect(getPart('large-wall')).not.toBeNull()
  })
})
