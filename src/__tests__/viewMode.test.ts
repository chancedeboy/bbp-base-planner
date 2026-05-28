import { describe, it, expect, beforeEach } from 'vitest'
import { useBuildStore } from '../state/useBuildStore'
import { computeBuildCentroid, computeBuildBounds, computeBuildCeiling, detectFloorLevels } from '../lib/snap'
import { PARTS_BY_ID } from '../data/parts'
import type { PlacedPiece } from '../data/types'

beforeEach(() => {
  useBuildStore.setState({
    pieces: [],
    pastPieces: [],
    selectedPieceId: null,
    selectedPartId: null,
    mode: 'exterior',
    pendingCameraMove: null,
    floorLevel: 0,
  })
})

describe('layer tagging on placement', () => {
  it('tags pieces as exterior when mode is exterior', () => {
    const { placePiece } = useBuildStore.getState()
    placePiece('large-wall', [0, 1.65, 0])
    expect(useBuildStore.getState().pieces[0].layer).toBe('exterior')
  })

  it('tags pieces as interior when mode is interior', () => {
    useBuildStore.setState({ mode: 'interior' })
    const { placePiece } = useBuildStore.getState()
    placePiece('large-wall', [0, 1.65, 0])
    expect(useBuildStore.getState().pieces[0].layer).toBe('interior')
  })

  it('each piece gets the layer matching the mode at placement time', () => {
    const { placePiece, setMode } = useBuildStore.getState()
    placePiece('large-wall', [0, 1.65, 0])
    setMode('interior')
    placePiece('large-wall', [4, 1.65, 0])
    const pieces = useBuildStore.getState().pieces
    expect(pieces[0].layer).toBe('exterior')
    expect(pieces[1].layer).toBe('interior')
  })
})

describe('setMode', () => {
  it('switches from exterior to interior', () => {
    useBuildStore.getState().setMode('interior')
    expect(useBuildStore.getState().mode).toBe('interior')
  })

  it('switches back to exterior', () => {
    useBuildStore.setState({ mode: 'interior' })
    useBuildStore.getState().setMode('exterior')
    expect(useBuildStore.getState().mode).toBe('exterior')
  })
})

describe('toggleFloorMarker', () => {
  it('adds a floor marker', () => {
    useBuildStore.getState().toggleFloorMarker(3.9)
    expect(useBuildStore.getState().floorMarkers).toContain(3.9)
  })

  it('removes a marker that is already pinned', () => {
    useBuildStore.setState({ floorMarkers: [3.9] })
    useBuildStore.getState().toggleFloorMarker(3.9)
    expect(useBuildStore.getState().floorMarkers).not.toContain(3.9)
  })

  it('rounds to 0.1m before storing', () => {
    useBuildStore.getState().toggleFloorMarker(3.91234)
    expect(useBuildStore.getState().floorMarkers[0]).toBeCloseTo(3.9)
  })

  it('deduplicates near-equal values', () => {
    useBuildStore.setState({ floorMarkers: [3.9] })
    useBuildStore.getState().toggleFloorMarker(3.904) // within 0.05 of 3.9
    expect(useBuildStore.getState().floorMarkers).toHaveLength(0) // toggled off
  })
})

describe('setPendingCameraMove', () => {
  it('stores a pending move', () => {
    const move = { position: [0, 2, 5] as [number, number, number], target: [0, 1, 0] as [number, number, number] }
    useBuildStore.getState().setPendingCameraMove(move)
    expect(useBuildStore.getState().pendingCameraMove).toEqual(move)
  })

  it('clears the move when set to null', () => {
    useBuildStore.setState({ pendingCameraMove: { position: [0, 2, 5], target: [0, 1, 0] } })
    useBuildStore.getState().setPendingCameraMove(null)
    expect(useBuildStore.getState().pendingCameraMove).toBeNull()
  })
})

describe('setFloorLevel', () => {
  it('increments floor level', () => {
    useBuildStore.getState().setFloorLevel(2)
    expect(useBuildStore.getState().floorLevel).toBe(2)
  })

  it('resets to 0', () => {
    useBuildStore.setState({ floorLevel: 3 })
    useBuildStore.getState().setFloorLevel(0)
    expect(useBuildStore.getState().floorLevel).toBe(0)
  })
})

describe('detectFloorLevels', () => {
  const makePiece = (partId: string, y: number): PlacedPiece => ({
    uuid: crypto.randomUUID(),
    partId,
    position: [0, y, 0],
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it('returns [0] for empty build', () => {
    expect(detectFloorLevels([], PARTS_BY_ID)).toEqual([0])
  })

  it('returns ground floor from a foundation piece', () => {
    // foundation-triangle: h=0.3, center y=0.15 → top = 0.3
    const levels = detectFloorLevels([makePiece('foundation-triangle', 0.15)], PARTS_BY_ID)
    expect(levels).toHaveLength(1)
    expect(levels[0]).toBeCloseTo(0.3)
  })

  it('detects a second floor when a floor piece has walls built on top', () => {
    // large-floor: h=0.2, center at y=3.9 → top = 4.0
    // large-wall: h=3, center at y=4.0+1.5=5.5 → bottom = 4.0 (on top of floor)
    const pieces = [
      makePiece('foundation-triangle', 0.15),
      makePiece('large-floor', 3.9),
      makePiece('large-wall', 5.5),  // wall resting on the floor piece
    ]
    const levels = detectFloorLevels(pieces, PARTS_BY_ID)
    expect(levels).toHaveLength(2)
    expect(levels[0]).toBeCloseTo(0.3)  // foundation top
    expect(levels[1]).toBeCloseTo(4.0)  // second-story floor top
  })

  it('does NOT count a floor piece used as a ceiling/roof cap', () => {
    // Floor piece at the top of a single-story build — no walls above it
    const pieces = [
      makePiece('foundation-triangle', 0.15),
      makePiece('large-wall', 1.65),
      makePiece('large-floor', 3.9),  // capping the top — no occupants above
    ]
    const levels = detectFloorLevels(pieces, PARTS_BY_ID)
    expect(levels).toHaveLength(1)  // only the foundation = one floor
  })

  it('does NOT create a new floor level from stacked walls', () => {
    // Two walls stacked = high ceiling, not a second floor
    const pieces = [
      makePiece('foundation-triangle', 0.15),
      makePiece('large-wall', 1.7),   // first wall, y-center 1.7
      makePiece('large-wall', 4.85),  // second wall stacked on top
    ]
    const levels = detectFloorLevels(pieces, PARTS_BY_ID)
    expect(levels).toHaveLength(1)  // only the foundation = one floor
  })

  it('deduplicates foundations at the same height', () => {
    // Two side-by-side foundations at the same Y
    const pieces = [
      makePiece('foundation-triangle', 0.15),
      makePiece('foundation-triangle', 0.15),
    ]
    const levels = detectFloorLevels(pieces, PARTS_BY_ID)
    expect(levels).toHaveLength(1)
  })
})

describe('computeBuildBounds', () => {
  const makePiece = (partId: string, x: number, z: number): PlacedPiece => ({
    uuid: crypto.randomUUID(),
    partId,
    position: [x, 0.15, z],
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it('returns null for empty build', () => {
    expect(computeBuildBounds([], PARTS_BY_ID)).toBeNull()
  })

  it('returns correct bounds for a single foundation', () => {
    // foundation-triangle: w=4, d=4, center at [0, 0]
    const b = computeBuildBounds([makePiece('foundation-triangle', 0, 0)], PARTS_BY_ID)
    expect(b).not.toBeNull()
    expect(b!.minX).toBeCloseTo(-2)
    expect(b!.maxX).toBeCloseTo(2)
    expect(b!.minZ).toBeCloseTo(-2)
    expect(b!.maxZ).toBeCloseTo(2)
  })

  it('expands bounds across multiple foundations', () => {
    const pieces = [
      makePiece('foundation-triangle', 0, 0),   // covers [-2,2]×[-2,2]
      makePiece('foundation-triangle', 4, 0),   // covers [2,6]×[-2,2]
    ]
    const b = computeBuildBounds(pieces, PARTS_BY_ID)
    expect(b!.minX).toBeCloseTo(-2)
    expect(b!.maxX).toBeCloseTo(6)
    expect(b!.minZ).toBeCloseTo(-2)
    expect(b!.maxZ).toBeCloseTo(2)
  })
})

describe('computeBuildCentroid', () => {
  const makePiece = (partId: string, x: number, z: number): PlacedPiece => ({
    uuid: crypto.randomUUID(),
    partId,
    position: [x, 0.2, z],
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it('returns [0, 0] for empty build', () => {
    expect(computeBuildCentroid([], PARTS_BY_ID)).toEqual([0, 0])
  })

  it('returns the XZ centroid of foundation pieces', () => {
    const pieces = [
      makePiece('foundation-triangle', 0, 0),
      makePiece('foundation-triangle', 4, 0),
    ]
    const [x, z] = computeBuildCentroid(pieces, PARTS_BY_ID)
    expect(x).toBeCloseTo(2)
    expect(z).toBeCloseTo(0)
  })

  it('prefers foundation/floor pieces over walls', () => {
    const pieces = [
      makePiece('foundation-triangle', 0, 0),
      makePiece('large-wall', 100, 100), // should be ignored since foundation exists
    ]
    const [x, z] = computeBuildCentroid(pieces, PARTS_BY_ID)
    expect(x).toBeCloseTo(0) // centroid of foundation only
    expect(z).toBeCloseTo(0)
  })

  it('falls back to all pieces when no foundation/floor exists', () => {
    const pieces = [
      makePiece('large-wall', 0, 0),
      makePiece('large-wall', 4, 0),
    ]
    const [x, z] = computeBuildCentroid(pieces, PARTS_BY_ID)
    expect(x).toBeCloseTo(2)
    expect(z).toBeCloseTo(0)
  })
})

describe('computeBuildCeiling', () => {
  const makePiece = (partId: string, y: number): PlacedPiece => ({
    uuid: crypto.randomUUID(),
    partId,
    position: [0, y, 0],
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it('returns null for empty build', () => {
    expect(computeBuildCeiling([], PARTS_BY_ID)).toBeNull()
  })

  it('returns top surface of a single foundation', () => {
    // foundation-triangle: h=0.3, center y=0.15 → top = 0.3
    expect(computeBuildCeiling([makePiece('foundation-triangle', 0.15)], PARTS_BY_ID)).toBeCloseTo(0.3)
  })

  it('returns the highest top surface across multiple pieces', () => {
    // large-wall: h=3, center y=1.65 → top = 3.15
    const pieces = [
      makePiece('foundation-triangle', 0.15),  // top = 0.3
      makePiece('large-wall', 1.65),           // top = 3.15
    ]
    expect(computeBuildCeiling(pieces, PARTS_BY_ID)).toBeCloseTo(3.15)
  })
})
