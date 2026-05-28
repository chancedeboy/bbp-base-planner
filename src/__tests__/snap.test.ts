import { describe, it, expect } from 'vitest'
import {
  rotateY,
  snapToGrid,
  gridSnapPoint,
  computeWorldAnchorsForPiece,
  computeAllWorldAnchors,
  findSnapCandidates,
  computeSnapPosition,
  computeSnapRotation,
  computeElevation,
  isPointInsideFootprint,
  type Vec3,
} from '../lib/snap'
import { PARTS_BY_ID, getPart } from '../data/parts'
import type { PlacedPiece } from '../data/types'

describe('rotateY', () => {
  it('returns input unchanged for 0 rotation', () => {
    expect(rotateY([1, 0, 0], 0)).toEqual([1, 0, 0])
  })

  it('rotates +X to +Z after -90° (clockwise looking down)', () => {
    // R3F/Three.js Y-up, +Z toward camera. rotateY(yawRad) follows the same
    // convention used by computeWorldAnchorsForPiece.
    const out = rotateY([1, 0, 0], -Math.PI / 2)
    expect(out[0]).toBeCloseTo(0)
    expect(out[2]).toBeCloseTo(1)
  })

  it('preserves Y axis under yaw', () => {
    expect(rotateY([0, 5, 0], Math.PI / 4)).toEqual([0, 5, 0])
  })
})

describe('snapToGrid / gridSnapPoint', () => {
  it('snaps to nearest 0.25', () => {
    expect(snapToGrid(1.12, 0.25)).toBe(1.0)
    expect(snapToGrid(1.13, 0.25)).toBe(1.25)
    expect(snapToGrid(-0.37, 0.25)).toBe(-0.25)
    expect(snapToGrid(-0.4, 0.25)).toBe(-0.5)
  })

  it('preserves Y axis when snapping a point', () => {
    expect(gridSnapPoint([1.13, 2.5, -0.4], 0.25)).toEqual([1.25, 2.5, -0.5])
  })
})

describe('computeWorldAnchorsForPiece', () => {
  it('transforms unrotated anchors by piece position only', () => {
    const wall = getPart('large-wall')!
    const piece: PlacedPiece = {
      uuid: 'p1',
      partId: 'large-wall',
      position: [5, 1.5, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const wa = computeWorldAnchorsForPiece(piece, wall)
    const right = wa.find((a) => a.anchor.id === 'right')!
    // right anchor is at [w/2, 0, 0] = [2, 0, 0] local; piece at [5, 1.5, 0]
    expect(right.worldPosition).toEqual([7, 1.5, 0])
    expect(right.worldNormal).toEqual([1, 0, 0])
  })

  it('applies yaw rotation to anchor positions and normals', () => {
    const wall = getPart('large-wall')!
    const piece: PlacedPiece = {
      uuid: 'p1',
      partId: 'large-wall',
      position: [0, 1.5, 0],
      rotation: [0, -Math.PI / 2, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const wa = computeWorldAnchorsForPiece(piece, wall)
    const right = wa.find((a) => a.anchor.id === 'right')!
    // local [2, 0, 0] rotated by -90° around Y → [0, 0, 2]
    expect(right.worldPosition[0]).toBeCloseTo(0)
    expect(right.worldPosition[1]).toBeCloseTo(1.5)
    expect(right.worldPosition[2]).toBeCloseTo(2)
    expect(right.worldNormal[0]).toBeCloseTo(0)
    expect(right.worldNormal[2]).toBeCloseTo(1)
  })
})

describe('findSnapCandidates', () => {
  it('returns only anchors compatible with the ghost category', () => {
    const floor: PlacedPiece = {
      uuid: 'f1',
      partId: 'large-floor',
      position: [0, 0.1, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const anchors = computeAllWorldAnchors([floor], PARTS_BY_ID)
    // Floor's edge & top anchors accept walls; bottom accepts only 'stair'.
    const candidates = findSnapCandidates('wall', [0, 0.1, 0], anchors, 10)
    const ids = candidates.map((c) => c.worldAnchor.anchor.id)
    expect(ids).toContain('top')
    expect(ids).toContain('edge-px')
    expect(ids).not.toContain('bottom')
  })

  it('respects the radius cutoff', () => {
    const floor: PlacedPiece = {
      uuid: 'f1',
      partId: 'large-floor',
      position: [0, 0.1, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const anchors = computeAllWorldAnchors([floor], PARTS_BY_ID)
    // Cursor 100m away — nothing in range
    expect(findSnapCandidates('wall', [100, 0, 100], anchors, 3)).toEqual([])
  })

  it('sorts candidates by distance ascending', () => {
    const floor: PlacedPiece = {
      uuid: 'f1',
      partId: 'large-floor',
      position: [0, 0.1, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const anchors = computeAllWorldAnchors([floor], PARTS_BY_ID)
    // Cursor near the +X edge — that edge should be the nearest candidate
    const candidates = findSnapCandidates('wall', [1.9, 0.1, 0], anchors, 10)
    expect(candidates[0].worldAnchor.anchor.id).toBe('edge-px')
  })
})

// Helper: synthesize a SnapCandidate from raw fields for tests
function mkCandidate(args: {
  surface: 'top' | 'bottom' | 'side' | 'edge'
  worldPosition: Vec3
  worldNormal: Vec3
  slideOffset?: -1 | 0 | 1
  worldSlideAxis?: Vec3 | null
}) {
  return {
    worldAnchor: {
      pieceUuid: 't1',
      anchor: {
        id: 'test',
        position: [0, 0, 0] as Vec3,
        normal: args.worldNormal,
        surface: args.surface,
        accepts: ['wall' as const],
      },
      worldPosition: args.worldPosition,
      worldNormal: args.worldNormal,
      worldSlideAxis: args.worldSlideAxis ?? null,
    },
    worldPosition: args.worldPosition,
    distance: 0,
    slideOffset: args.slideOffset ?? (0 as const),
  }
}

describe('computeSnapPosition', () => {
  it('top surface: lifts ghost by half its height above the anchor', () => {
    const wall = getPart('large-wall')! // h = 3
    const c = mkCandidate({ surface: 'top', worldPosition: [3, 0.2, 5], worldNormal: [0, 1, 0] })
    expect(computeSnapPosition(wall, c)).toEqual([3, 0.2 + 1.5, 5])
  })

  it('edge surface: centers ghost on edge line and lifts by half height', () => {
    const wall = getPart('large-wall')! // h = 3
    const c = mkCandidate({ surface: 'edge', worldPosition: [2, 0.1, 0], worldNormal: [1, 0, 0] })
    expect(computeSnapPosition(wall, c)).toEqual([2, 0.1 + 1.5, 0])
  })

  it('side surface: pushes ghost out along the anchor normal by half its depth', () => {
    const wall = getPart('large-wall')! // d = 0.2
    const c = mkCandidate({ surface: 'side', worldPosition: [2, 1.5, 0], worldNormal: [1, 0, 0] })
    expect(computeSnapPosition(wall, c)).toEqual([2 + 0.1, 1.5, 0])
  })
})

describe('slide axis expansion', () => {
  it('a wall top anchor produces 3 candidates when ghostPart is provided', () => {
    const wallH = 3
    const wallCenterY = 0.3 + wallH / 2 // sitting on foundation top of 0.3
    const wall: PlacedPiece = {
      uuid: 'w-east',
      partId: 'large-wall',
      // East wall on foundation, rotated 90° around Y so its length is along Z
      position: [2, wallCenterY, 0],
      rotation: [0, Math.PI / 2, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const anchors = computeAllWorldAnchors([wall], PARTS_BY_ID)
    const floor = getPart('large-floor')! // 4×0.2×4, depth d=4
    // Filter to floor-accepting candidates within radius; expect 3 around the wall top
    const candidates = findSnapCandidates('floor', [2, wallCenterY + wallH / 2, 0], anchors, 5, floor)
    const topCandidates = candidates.filter((c) => c.worldAnchor.anchor.surface === 'top')
    expect(topCandidates.length).toBe(3)
    const offsets = new Set(topCandidates.map((c) => c.slideOffset))
    expect(offsets).toEqual(new Set([-1, 0, 1]))
  })

  it('without ghostPart, slide axis is not expanded (single candidate per anchor)', () => {
    const wall: PlacedPiece = {
      uuid: 'w-east',
      partId: 'large-wall',
      position: [2, 1.8, 0],
      rotation: [0, Math.PI / 2, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const anchors = computeAllWorldAnchors([wall], PARTS_BY_ID)
    const candidates = findSnapCandidates('floor', [2, 3.3, 0], anchors, 5)
    const top = candidates.filter((c) => c.worldAnchor.anchor.surface === 'top')
    expect(top.length).toBe(1)
    expect(top[0].slideOffset).toBe(0)
  })

  it('slide candidate worldPosition is offset along the rotated slide axis', () => {
    // East wall (rotated 90° around Y). Local slideAxis [0,0,1] → world [1,0,0]
    // after rotation (rotateY([0,0,1], π/2) = [1, 0, 0]).
    const wall: PlacedPiece = {
      uuid: 'w-east',
      partId: 'large-wall',
      position: [2, 1.8, 0],
      rotation: [0, Math.PI / 2, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const anchors = computeAllWorldAnchors([wall], PARTS_BY_ID)
    const floor = getPart('large-floor')! // d = 4 → shift = 2
    const candidates = findSnapCandidates('floor', [2, 3.3, 0], anchors, 5, floor)
    const top = candidates.filter((c) => c.worldAnchor.anchor.surface === 'top')
    const minus = top.find((c) => c.slideOffset === -1)!
    const zero = top.find((c) => c.slideOffset === 0)!
    const plus = top.find((c) => c.slideOffset === 1)!
    // The wall top anchor is at world position approximately (2, wall_top, 0)
    expect(zero.worldPosition[0]).toBeCloseTo(2)
    // Slid by ghost.d/2 = 2 along +X (one direction places roof over box, the other away)
    expect(plus.worldPosition[0]).toBeCloseTo(4)
    expect(minus.worldPosition[0]).toBeCloseTo(0)
    // The -1 candidate landing at x=0 means roof centered over a box with east wall at x=2 ✓
  })

  it('snapped position centers a roof over a 4-wall box (the user-reported scenario)', () => {
    // Build: foundation centered at origin, 4 walls on its edges, hover a roof
    // near the east wall and pick the slide=-1 candidate → roof centered at origin.
    const wallH = 3
    const foundationY = 0.15
    const wallCenterY = foundationY + 0.15 + wallH / 2 // 1.8
    const mkWall = (x: number, z: number, yaw: number): PlacedPiece => ({
      uuid: `w-${x}-${z}`,
      partId: 'large-wall',
      position: [x, wallCenterY, z],
      rotation: [0, yaw, 0],
      tier: 'frame',
      layer: 'exterior',
    })
    const walls = [
      mkWall(2, 0, Math.PI / 2),
      mkWall(-2, 0, Math.PI / 2),
      mkWall(0, 2, 0),
      mkWall(0, -2, 0),
    ]
    const anchors = computeAllWorldAnchors(walls, PARTS_BY_ID)
    const floor = getPart('large-floor')! // d=4
    // Cursor near east wall top
    const candidates = findSnapCandidates('floor', [2, wallCenterY + wallH / 2, 0], anchors, 5, floor)
    // Find the candidate for the east wall with the slide that puts the roof at x≈0
    const east = candidates.filter(
      (c) => c.worldAnchor.pieceUuid === 'w-2-0' && c.worldAnchor.anchor.surface === 'top'
    )
    const centered = east.find((c) => Math.abs(c.worldPosition[0]) < 0.01)
    expect(centered).toBeDefined()
    const placement = computeSnapPosition(floor, centered!)
    expect(placement[0]).toBeCloseTo(0)
    expect(placement[2]).toBeCloseTo(0)
    // Y = wall top + roof half-height
    expect(placement[1]).toBeCloseTo(wallCenterY + wallH / 2 + 0.1)
  })
})

describe('isPointInsideFootprint', () => {
  it('returns true for point inside an unrotated piece', () => {
    const foundation = getPart('foundation-triangle')!
    const piece: PlacedPiece = {
      uuid: 'f1',
      partId: 'foundation-triangle',
      position: [0, 0.15, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    // Foundation is 4x4; (1.5, _, 1.5) is inside
    expect(isPointInsideFootprint([1.5, 0, 1.5], piece, foundation)).toBe(true)
    // (3, _, 3) is outside
    expect(isPointInsideFootprint([3, 0, 3], piece, foundation)).toBe(false)
  })

  it('respects yaw rotation', () => {
    const wall = getPart('large-wall')! // 4 wide × 0.2 deep
    const piece: PlacedPiece = {
      uuid: 'w1',
      partId: 'large-wall',
      position: [0, 1.65, 0],
      rotation: [0, Math.PI / 2, 0], // rotated 90° → now 0.2 wide × 4 deep in world
      tier: 'frame',
      layer: 'exterior',
    }
    // After rotation, the wall extends along Z. (0, _, 1.5) should be inside.
    expect(isPointInsideFootprint([0, 0, 1.5], piece, wall)).toBe(true)
    // (1.5, _, 0) should be outside (was inside before rotation)
    expect(isPointInsideFootprint([1.5, 0, 0], piece, wall)).toBe(false)
  })
})

describe('computeElevation', () => {
  it('returns 0 when no pieces are underneath the ghost', () => {
    const wall = getPart('large-wall')!
    expect(computeElevation([10, 0, 10], wall, [], PARTS_BY_ID)).toBe(0)
  })

  it('returns foundation top when ghost hovers over a foundation', () => {
    const foundation: PlacedPiece = {
      uuid: 'f1',
      partId: 'foundation-triangle',
      position: [0, 0.15, 0], // h=0.3, sitting on ground
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const wall = getPart('large-wall')!
    // Ghost wall centered at origin, over the foundation
    expect(computeElevation([0, 0, 0], wall, [foundation], PARTS_BY_ID)).toBeCloseTo(0.3)
  })

  it('returns wall-top when a roof ghost spans a 4-wall box', () => {
    // 4 walls forming a 4×4 box on a foundation. Walls placed at foundation
    // edges, top at y = 0.3 + 3 = 3.3 (wall center 1.8, half-height 1.5).
    const wallH = 3
    const wallCenterY = 0.15 + 0.15 + wallH / 2 // foundation top 0.3 + wall h/2
    const mkWall = (x: number, z: number, yaw: number): PlacedPiece => ({
      uuid: `w-${x}-${z}`,
      partId: 'large-wall',
      position: [x, wallCenterY, z],
      rotation: [0, yaw, 0],
      tier: 'frame',
      layer: 'exterior',
    })
    const walls = [
      mkWall(2, 0, 0),                  // east wall
      mkWall(-2, 0, 0),                 // west wall
      mkWall(0, 2, Math.PI / 2),        // north wall
      mkWall(0, -2, Math.PI / 2),       // south wall
    ]
    const floorGhost = getPart('large-floor')! // 4×0.2×4
    // Ghost centered over the box — its 4 corners should land on the 4 walls
    const elev = computeElevation([0, 0, 0], floorGhost, walls, PARTS_BY_ID)
    expect(elev).toBeCloseTo(wallCenterY + wallH / 2) // wall top
  })

  it('picks the highest top when stacked pieces overlap', () => {
    const foundation: PlacedPiece = {
      uuid: 'f1',
      partId: 'foundation-triangle',
      position: [0, 0.15, 0],
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const floor: PlacedPiece = {
      uuid: 'fl1',
      partId: 'large-floor',
      position: [0, 0.4, 0], // sitting above foundation
      rotation: [0, 0, 0],
      tier: 'frame',
      layer: 'exterior',
    }
    const wall = getPart('large-wall')!
    // Foundation top = 0.3, floor top = 0.5 — floor wins
    expect(computeElevation([0, 0, 0], wall, [foundation, floor], PARTS_BY_ID)).toBeCloseTo(0.5)
  })
})

describe('computeSnapRotation', () => {
  it('aligns ghost yaw to anchor normal for edge surface', () => {
    const c = mkCandidate({ surface: 'edge', worldPosition: [0, 0, 2], worldNormal: [0, 0, 1] })
    // normal [0,0,1] → atan2(0, 1) = 0
    expect(computeSnapRotation(c)[1]).toBeCloseTo(0)
  })

  it('returns identity for top surface', () => {
    const c = mkCandidate({ surface: 'top', worldPosition: [0, 0, 0], worldNormal: [0, 1, 0] })
    expect(computeSnapRotation(c)).toEqual([0, 0, 0])
  })
})

describe('foundation-to-foundation side snap', () => {
  const foundationId = 'foundation-triangle'
  const mkFoundation = (position: Vec3): PlacedPiece => ({
    uuid: 'f1',
    partId: foundationId,
    position,
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it('side-px anchor is at the center height of the foundation, not the top edge', () => {
    const part = getPart(foundationId)!
    const piece = mkFoundation([0, 0.15, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const sidePx = anchors.find((wa) => wa.anchor.id === 'side-px')!
    expect(sidePx).toBeDefined()
    // Center height = piece.position.y = 0.15; top edge would be 0.3
    expect(sidePx.worldPosition[1]).toBeCloseTo(0.15)
    expect(sidePx.worldPosition[0]).toBeCloseTo(2)
  })

  it('adjacent foundation snaps flush at the same height', () => {
    const part = getPart(foundationId)!
    const piece = mkFoundation([0, 0.15, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const sidePx = anchors.find((wa) => wa.anchor.id === 'side-px')!
    const candidate = {
      worldAnchor: sidePx,
      worldPosition: sidePx.worldPosition,
      distance: 0,
      slideOffset: 0 as const,
    }
    const pos = computeSnapPosition(part, candidate)
    // Ghost center: anchor_x + ghost.d/2 = 2 + 2 = 4; same Y as host
    expect(pos[0]).toBeCloseTo(4)
    expect(pos[1]).toBeCloseTo(0.15) // NOT elevated — same level as placed foundation
    expect(pos[2]).toBeCloseTo(0)
  })

  it('edge anchors do not accept foundation (regression — prevents elevated offset snap)', () => {
    const part = getPart(foundationId)!
    const piece = mkFoundation([0, 0.15, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const edgeAnchors = anchors.filter((wa) => wa.anchor.surface === 'edge')
    for (const ea of edgeAnchors) {
      expect(ea.anchor.accepts).not.toContain('foundation')
    }
  })

  it('findSnapCandidates returns a side anchor as the nearest candidate when hovering beside the foundation', () => {
    const part = getPart(foundationId)!
    const piece = mkFoundation([0, 0.15, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    // Cursor near the right face of the placed foundation
    const cursor: Vec3 = [2.5, 0.15, 0]
    const candidates = findSnapCandidates('foundation', cursor, anchors, 5, part)
    expect(candidates.length).toBeGreaterThan(0)
    // The nearest candidate must be a SIDE anchor (at center height) — not an edge anchor
    expect(candidates[0].worldAnchor.anchor.surface).toBe('side')
    // And no edge anchor should appear in the results (edge anchors no longer accept 'foundation')
    const edgeCandidates = candidates.filter((c) => c.worldAnchor.anchor.surface === 'edge')
    expect(edgeCandidates).toHaveLength(0)
  })
})

describe('wall-sized pieces snap to foundation edges (doors, windows, gates, stairs)', () => {
  const mkFoundation = (): PlacedPiece => ({
    uuid: 'f1',
    partId: 'foundation-triangle',
    position: [0, 0.15, 0],
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it.each([
    ['gate', 'single-garage-door'],
    ['gate', 'large-gate'],
    ['gate', 'double-garage-door'],
    ['door', 'large-door'],
    ['door', 'small-door'],
    ['window', 'large-window'],
    ['window', 'small-window'],
  ])('a %s (%s) snaps to a foundation edge at the correct height', (category, partId) => {
    const foundation = getPart('foundation-triangle')!
    const ghost = getPart(partId)!
    const piece = mkFoundation()
    const anchors = computeWorldAnchorsForPiece(piece, foundation)
    const edgePx = anchors.find((wa) => wa.anchor.id === 'edge-px')!
    expect(edgePx.anchor.accepts).toContain(category as Category)

    const candidate = {
      worldAnchor: edgePx,
      worldPosition: edgePx.worldPosition,
      distance: 0,
      slideOffset: 0 as const,
    }
    const pos = computeSnapPosition(ghost, candidate)
    // Ghost should stand on the foundation top: its base lines up with foundation top
    const expectedY = edgePx.worldPosition[1] + ghost.dimensions.h / 2
    expect(pos[1]).toBeCloseTo(expectedY)
    // Bottom of ghost = foundation top (0.3)
    expect(pos[1] - ghost.dimensions.h / 2).toBeCloseTo(0.3)
  })

  it('garage door hovering near a foundation edge produces a snap candidate (regression — was free-form only)', () => {
    const foundation = getPart('foundation-triangle')!
    const gate = getPart('single-garage-door')!
    const piece = mkFoundation()
    const anchors = computeWorldAnchorsForPiece(piece, foundation)
    // Cursor near east foundation edge
    const cursor: Vec3 = [2, 0.3, 0]
    const candidates = findSnapCandidates('gate', cursor, anchors, 3, gate)
    expect(candidates.length).toBeGreaterThan(0)
    // Nearest candidate is the east edge of the foundation
    expect(candidates[0].worldAnchor.anchor.id).toBe('edge-px')
  })
})

describe('floor-to-floor side snap', () => {
  const floorId = 'large-floor'
  const mkFloor = (position: Vec3): PlacedPiece => ({
    uuid: 'fl1',
    partId: floorId,
    position,
    rotation: [0, 0, 0],
    tier: 'frame',
    layer: 'exterior',
  })

  it('floor has side anchors at center height', () => {
    const part = getPart(floorId)! // h=0.2
    const piece = mkFloor([0, 0.5, 0]) // center at y=0.5 (above some foundation+walls)
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const sidePx = anchors.find((wa) => wa.anchor.id === 'side-px')
    expect(sidePx).toBeDefined()
    expect(sidePx!.worldPosition[1]).toBeCloseTo(0.5) // center height, NOT 0.6 (top edge)
  })

  it('adjacent floor snaps flush at the same height', () => {
    const part = getPart(floorId)! // w=4, h=0.2, d=4
    const piece = mkFloor([0, 0.5, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const sidePx = anchors.find((wa) => wa.anchor.id === 'side-px')!
    const candidate = {
      worldAnchor: sidePx,
      worldPosition: sidePx.worldPosition,
      distance: 0,
      slideOffset: 0 as const,
    }
    const pos = computeSnapPosition(part, candidate)
    expect(pos[0]).toBeCloseTo(4)    // anchor.x (2) + push (ghost.d/2 = 2)
    expect(pos[1]).toBeCloseTo(0.5)  // same height as host floor
    expect(pos[2]).toBeCloseTo(0)
  })

  it('edge anchors do not accept floor (regression — would cause elevated offset)', () => {
    const part = getPart(floorId)!
    const piece = mkFloor([0, 0.5, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const edgeAnchors = anchors.filter((wa) => wa.anchor.surface === 'edge')
    for (const ea of edgeAnchors) {
      expect(ea.anchor.accepts).not.toContain('floor')
    }
  })

  it('findSnapCandidates returns a side anchor as nearest when hovering beside a floor', () => {
    const part = getPart(floorId)!
    const piece = mkFloor([0, 0.5, 0])
    const anchors = computeWorldAnchorsForPiece(piece, part)
    const candidates = findSnapCandidates('floor', [2.5, 0.5, 0], anchors, 5, part)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].worldAnchor.anchor.surface).toBe('side')
  })
})
