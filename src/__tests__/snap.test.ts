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

describe('computeSnapPosition', () => {
  it('top surface: lifts ghost by half its height above the anchor', () => {
    const wall = getPart('large-wall')! // h = 3
    const candidate = {
      pieceUuid: 'f1',
      anchor: {
        id: 'top',
        position: [0, 0, 0] as Vec3,
        normal: [0, 1, 0] as Vec3,
        surface: 'top' as const,
        accepts: ['wall'] as Array<'wall'>,
      },
      worldPosition: [3, 0.2, 5] as Vec3,
      worldNormal: [0, 1, 0] as Vec3,
    }
    expect(computeSnapPosition(wall, candidate)).toEqual([3, 0.2 + 1.5, 5])
  })

  it('edge surface: centers ghost on edge line and lifts by half height', () => {
    const wall = getPart('large-wall')! // h = 3
    const candidate = {
      pieceUuid: 'f1',
      anchor: {
        id: 'edge-px',
        position: [2, 0.1, 0] as Vec3,
        normal: [1, 0, 0] as Vec3,
        surface: 'edge' as const,
        accepts: ['wall'] as Array<'wall'>,
      },
      worldPosition: [2, 0.1, 0] as Vec3,
      worldNormal: [1, 0, 0] as Vec3,
    }
    expect(computeSnapPosition(wall, candidate)).toEqual([2, 0.1 + 1.5, 0])
  })

  it('side surface: pushes ghost out along the anchor normal by half its depth', () => {
    const wall = getPart('large-wall')! // d = 0.2
    const candidate = {
      pieceUuid: 'w1',
      anchor: {
        id: 'right',
        position: [2, 0, 0] as Vec3,
        normal: [1, 0, 0] as Vec3,
        surface: 'side' as const,
        accepts: ['wall'] as Array<'wall'>,
      },
      worldPosition: [2, 1.5, 0] as Vec3,
      worldNormal: [1, 0, 0] as Vec3,
    }
    expect(computeSnapPosition(wall, candidate)).toEqual([2 + 0.1, 1.5, 0])
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
    const candidate = {
      pieceUuid: 'f1',
      anchor: {
        id: 'edge-pz',
        position: [0, 0, 2] as Vec3,
        normal: [0, 0, 1] as Vec3,
        surface: 'edge' as const,
        accepts: ['wall'] as Array<'wall'>,
      },
      worldPosition: [0, 0, 2] as Vec3,
      worldNormal: [0, 0, 1] as Vec3,
    }
    const rot = computeSnapRotation(candidate)
    // normal [0,0,1] → atan2(0, 1) = 0
    expect(rot[1]).toBeCloseTo(0)
  })

  it('returns identity for top surface', () => {
    const candidate = {
      pieceUuid: 'f1',
      anchor: {
        id: 'top',
        position: [0, 0, 0] as Vec3,
        normal: [0, 1, 0] as Vec3,
        surface: 'top' as const,
        accepts: ['wall'] as Array<'wall'>,
      },
      worldPosition: [0, 0, 0] as Vec3,
      worldNormal: [0, 1, 0] as Vec3,
    }
    expect(computeSnapRotation(candidate)).toEqual([0, 0, 0])
  })
})
