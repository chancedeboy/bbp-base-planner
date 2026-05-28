import type {
  Category,
  PartDef,
  PlacedPiece,
  SnapAnchor,
} from '../data/types'

export type Vec3 = [number, number, number]

export interface WorldAnchor {
  pieceUuid: string
  anchor: SnapAnchor
  worldPosition: Vec3
  worldNormal: Vec3
}

export interface SnapCandidate {
  worldAnchor: WorldAnchor
  distance: number
}

// Rotate a local-space vector around the Y axis by `yawRad` radians.
// For Sprint 2 we only support yaw rotation (R / Shift+R). Sprint 3+
// will introduce full 3-axis rotation if servers enable it.
export function rotateY(v: Vec3, yawRad: number): Vec3 {
  const cos = Math.cos(yawRad)
  const sin = Math.sin(yawRad)
  return [v[0] * cos + v[2] * sin, v[1], -v[0] * sin + v[2] * cos]
}

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function subVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

export function distXZ(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dz * dz)
}

// Snap a single axis to the nearest multiple of `step`.
export function snapToGrid(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function gridSnapPoint(p: Vec3, step: number): Vec3 {
  return [snapToGrid(p[0], step), p[1], snapToGrid(p[2], step)]
}

// Transform a piece's local anchors into world space.
export function computeWorldAnchorsForPiece(
  piece: PlacedPiece,
  part: PartDef
): WorldAnchor[] {
  const yaw = piece.rotation[1]
  return part.snapAnchors.map((anchor) => {
    const rotated = rotateY(anchor.position, yaw)
    const rotatedNormal = rotateY(anchor.normal, yaw)
    return {
      pieceUuid: piece.uuid,
      anchor,
      worldPosition: addVec(piece.position, rotated),
      worldNormal: rotatedNormal,
    }
  })
}

export function computeAllWorldAnchors(
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): WorldAnchor[] {
  const out: WorldAnchor[] = []
  for (const piece of pieces) {
    const part = partsById[piece.partId]
    if (!part) continue
    for (const wa of computeWorldAnchorsForPiece(piece, part)) {
      out.push(wa)
    }
  }
  return out
}

// Find anchors compatible with a ghost of `category`, within `radius` of cursor,
// sorted nearest-first.
export function findSnapCandidates(
  category: Category,
  cursor: Vec3,
  worldAnchors: WorldAnchor[],
  radius: number
): SnapCandidate[] {
  const out: SnapCandidate[] = []
  for (const wa of worldAnchors) {
    if (!wa.anchor.accepts.includes(category)) continue
    const d = distXZ(cursor, wa.worldPosition)
    if (d > radius) continue
    out.push({ worldAnchor: wa, distance: d })
  }
  out.sort((a, b) => a.distance - b.distance)
  return out
}

// Given a candidate anchor and the ghost part, compute where the ghost's
// CENTER should go. Placement rules per anchor.surface:
//   top    — ghost sits on top; center.x,z = anchor.x,z; center.y = anchor.y + ghost.h/2
//   bottom — ghost hangs below; center.y = anchor.y - ghost.h/2
//   side   — ghost butts up against the face; center pushed along normal by ghost depth/2
//            at matched Y height
//   edge   — ghost stands on the top edge of a flat piece; centered on edge line,
//            lifted by ghost.h/2 above the edge surface
export function computeSnapPosition(
  ghostPart: PartDef,
  candidate: WorldAnchor
): Vec3 {
  const { h, d } = ghostPart.dimensions
  const a = candidate.worldPosition
  const n = candidate.worldNormal
  const surface = candidate.anchor.surface

  switch (surface) {
    case 'top':
      return [a[0], a[1] + h / 2, a[2]]
    case 'bottom':
      return [a[0], a[1] - h / 2, a[2]]
    case 'edge':
      return [a[0], a[1] + h / 2, a[2]]
    case 'side': {
      // Push out along normal by half the ghost's extent in that direction.
      // Use the ghost's depth (d) as a reasonable proxy — works for walls and
      // wall-like pieces. Pieces with non-trivial extents along multiple axes
      // are an exception we'll refine in later sprints.
      const offset = scaleVec(n, d / 2)
      return [a[0] + offset[0], a[1], a[2] + offset[2]]
    }
  }
  // Unreachable — surface is exhaustively switched above
  return a
}

// Returns true if `point` is within the XZ footprint of `piece`, accounting
// for the piece's yaw rotation.
export function isPointInsideFootprint(
  point: Vec3,
  piece: PlacedPiece,
  part: PartDef
): boolean {
  const dx = point[0] - piece.position[0]
  const dz = point[2] - piece.position[2]
  const yaw = -piece.rotation[1]
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const localX = dx * cos + dz * sin
  const localZ = -dx * sin + dz * cos
  return (
    Math.abs(localX) <= part.dimensions.w / 2 &&
    Math.abs(localZ) <= part.dimensions.d / 2
  )
}

// Computes the elevation (top-surface Y) of whatever the ghost is over.
// Probes the ghost's footprint corners + center against every placed piece;
// the highest matching piece's top wins. Returns 0 if nothing is underneath.
//
// This is what makes "drag a roof over the box" work — the ghost auto-lifts
// to wall-top height because the floor's 4 corners land on the 4 walls.
export function computeElevation(
  cursor: Vec3,
  ghostPart: PartDef,
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): number {
  const { w, d } = ghostPart.dimensions
  const probes: Vec3[] = [
    [cursor[0] - w / 2, 0, cursor[2] - d / 2],
    [cursor[0] + w / 2, 0, cursor[2] - d / 2],
    [cursor[0] - w / 2, 0, cursor[2] + d / 2],
    [cursor[0] + w / 2, 0, cursor[2] + d / 2],
    [cursor[0], 0, cursor[2]],
  ]
  let maxTop = 0
  for (const piece of pieces) {
    const part = partsById[piece.partId]
    if (!part) continue
    const top = piece.position[1] + part.dimensions.h / 2
    if (top <= maxTop) continue // can't raise us
    for (const p of probes) {
      if (isPointInsideFootprint(p, piece, part)) {
        maxTop = top
        break
      }
    }
  }
  return maxTop
}

// Compute a snapped yaw that aligns the ghost's primary face with the candidate's
// normal. For 'edge' and 'side' anchors, walls should face perpendicular to the
// anchor normal (i.e., the wall's broad face matches the normal direction).
export function computeSnapRotation(candidate: WorldAnchor): Vec3 {
  const surface = candidate.anchor.surface
  if (surface === 'edge' || surface === 'side') {
    // Yaw so the ghost's +Z face aligns with the anchor's normal
    const yaw = Math.atan2(candidate.worldNormal[0], candidate.worldNormal[2])
    return [0, yaw, 0]
  }
  return [0, 0, 0]
}
