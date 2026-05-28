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
