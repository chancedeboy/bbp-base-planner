import type {
  Category,
  PartDef,
  PlacedPiece,
  SnapAnchor,
} from '../data/types'

export type Vec3 = [number, number, number]

export interface WorldAnchor {
  pieceUuid: string
  // Host piece's rotation — used by computeSnapRotation so a ghost stacking
  // onto a 'top' or 'bottom' anchor inherits the host's yaw (keeps a wall
  // stacked on a 90°-rotated wall from landing perpendicular).
  pieceRotation: Vec3
  // Host piece's dimensions — used by findSnapCandidates when expanding a
  // slideAxis into ±1 candidates so the slide magnitude can account for the
  // host's thickness (keeps roof slide=-1 centered over a box of inset walls).
  pieceDimensions: { w: number; h: number; d: number }
  anchor: SnapAnchor
  worldPosition: Vec3
  worldNormal: Vec3
  worldSlideAxis: Vec3 | null
}

// A snap candidate is a specific (anchor, slide) target the ghost can land on.
// One WorldAnchor with a slideAxis produces 3 SnapCandidates (offsets -1/0/+1).
export interface SnapCandidate {
  worldAnchor: WorldAnchor
  worldPosition: Vec3       // may differ from worldAnchor.worldPosition when slid
  distance: number          // from cursor to worldPosition (XZ)
  slideOffset: -1 | 0 | 1
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

export function dist3D(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// Returns the highest top-surface Y of any placed piece whose XZ footprint
// contains `point`. Returns 0 if `point` is over empty ground. Used to give
// the cursor a Y value that reflects what the user is hovering over so the
// snap system can distinguish e.g. a foundation edge from a second-story
// floor edge at the same XZ.
export function topElevationAt(
  point: Vec3,
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): number {
  let maxTop = 0
  for (const piece of pieces) {
    const part = partsById[piece.partId]
    if (!part) continue
    if (isPointInsideFootprint(point, piece, part)) {
      const top = piece.position[1] + part.dimensions.h / 2
      if (top > maxTop) maxTop = top
    }
  }
  return maxTop
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
    return {
      pieceUuid: piece.uuid,
      pieceRotation: piece.rotation,
      pieceDimensions: part.dimensions,
      anchor,
      worldPosition: addVec(piece.position, rotateY(anchor.position, yaw)),
      worldNormal: rotateY(anchor.normal, yaw),
      worldSlideAxis: anchor.slideAxis ? rotateY(anchor.slideAxis, yaw) : null,
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
// sorted nearest-first. When `ghostPart` is provided, anchors with a slideAxis
// expand into 3 candidates (offsets −1, 0, +1 of ghost.d/2 along the slide axis).
export function findSnapCandidates(
  category: Category,
  cursor: Vec3,
  worldAnchors: WorldAnchor[],
  radius: number,
  ghostPart?: PartDef
): SnapCandidate[] {
  const out: SnapCandidate[] = []
  for (const wa of worldAnchors) {
    if (!wa.anchor.accepts.includes(category)) continue

    const expansions: Array<{ pos: Vec3; offset: -1 | 0 | 1 }> = (() => {
      if (!ghostPart || !wa.worldSlideAxis) {
        return [{ pos: wa.worldPosition, offset: 0 as const }]
      }
      // Slide magnitude = (ghost.d − host.d) / 2 along the slideAxis. This
      // aligns the ghost's outer face with the host's outer face at slide=-1
      // (so a roof's outer edge meets the wall's outer edge — which is the
      // foundation edge when walls are inset). Old formula (ghost.d / 2)
      // assumed walls sat ON the foundation edge; with inset walls that
      // shifted the centered candidate off by host.d/2.
      const sa = wa.anchor.slideAxis! // local slideAxis (set if ghostPart && worldSlideAxis)
      const hostAlongSlide =
        Math.abs(sa[0]) * wa.pieceDimensions.w +
        Math.abs(sa[1]) * wa.pieceDimensions.h +
        Math.abs(sa[2]) * wa.pieceDimensions.d
      const shift = Math.max(0, (ghostPart.dimensions.d - hostAlongSlide) / 2)
      return [
        { pos: wa.worldPosition, offset: 0 as const },
        { pos: addVec(wa.worldPosition, scaleVec(wa.worldSlideAxis, shift)), offset: 1 as const },
        { pos: subVec(wa.worldPosition, scaleVec(wa.worldSlideAxis, shift)), offset: -1 as const },
      ]
    })()

    for (const { pos, offset } of expansions) {
      // 3D distance so the cursor's Y (set from topElevationAt in GhostPiece)
      // disambiguates anchors at different stories that share an XZ position.
      const d = dist3D(cursor, pos)
      if (d > radius) continue
      out.push({
        worldAnchor: wa,
        worldPosition: pos,
        distance: d,
        slideOffset: offset,
      })
    }
  }
  out.sort((a, b) => a.distance - b.distance)
  return out
}

// Given a candidate and the ghost part, compute where the ghost's CENTER
// should go. Placement rules per anchor.surface:
//   top    — ghost sits on top; center.x,z = candidate.x,z; center.y = candidate.y + ghost.h/2
//   bottom — ghost hangs below
//   side   — ghost butts up against the face; center pushed along normal by ghost.d/2
//   edge   — ghost stands on the top edge with its OUTER face flush with the
//            host's edge: lifted by ghost.h/2, AND pushed INWARD (opposite the
//            anchor normal) by ghost.d/2. The companion change is in
//            findSnapCandidates — the slide magnitude is reduced by host.d/2
//            so a roof slide=-1 still lands centered over the box despite the
//            wall being inset.
export function computeSnapPosition(
  ghostPart: PartDef,
  candidate: SnapCandidate
): Vec3 {
  const { h, d } = ghostPart.dimensions
  const a = candidate.worldPosition
  const n = candidate.worldAnchor.worldNormal
  const surface = candidate.worldAnchor.anchor.surface

  switch (surface) {
    case 'top':
      return [a[0], a[1] + h / 2, a[2]]
    case 'bottom':
      return [a[0], a[1] - h / 2, a[2]]
    case 'edge': {
      const inward = scaleVec(n, -d / 2)
      return [a[0] + inward[0], a[1] + h / 2, a[2] + inward[2]]
    }
    case 'side': {
      const offset = scaleVec(n, d / 2)
      return [a[0] + offset[0], a[1], a[2] + offset[2]]
    }
  }
  return a
}

// Computes the XZ centroid of all foundation/floor pieces in the build
// (falls back to all pieces if none of those categories are present).
// Returns [0, 0] for an empty build. Used to position the camera when entering
// interior mode.
export function computeBuildCentroid(
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): [number, number] {
  const floors = pieces.filter((p) => {
    const part = partsById[p.partId]
    return part && (part.category === 'foundation' || part.category === 'floor')
  })
  const source = floors.length > 0 ? floors : pieces
  if (source.length === 0) return [0, 0]
  const sumX = source.reduce((acc, p) => acc + p.position[0], 0)
  const sumZ = source.reduce((acc, p) => acc + p.position[2], 0)
  return [sumX / source.length, sumZ / source.length]
}

// Returns the sorted list of floor top-surface Y positions derived from placed
// foundation and floor pieces. Each distinct Y level represents one navigable
// floor in interior mode. Stacked walls without an intervening floor piece do
// NOT produce a new entry — the level comes from actual floor/foundation pieces.
//
// Foundations always define a floor level. Floor pieces only define a floor
// level if something is built on top of them — this prevents a ceiling/roof cap
// (a floor piece placed as the top of a single-story build) from being counted
// as a second story.
//
// Rounds to 0.1 m to absorb float drift from snap placement.
export function detectFloorLevels(
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): number[] {
  const OCCUPY_TOLERANCE = 0.15
  const seen = new Map<number, true>()

  for (const piece of pieces) {
    const part = partsById[piece.partId]
    if (!part) continue

    const topY = Math.round((piece.position[1] + part.dimensions.h / 2) * 10) / 10

    if (part.category === 'foundation') {
      // Foundations always mark a floor level — they're the structural base.
      seen.set(topY, true)
    } else if (part.category === 'floor') {
      // Only count as a floor if something is resting on top of this piece.
      // A floor piece with nothing above it is a ceiling/roof cap, not a walkable story.
      const hasOccupants = pieces.some((other) => {
        if (other.uuid === piece.uuid) return false
        const otherPart = partsById[other.partId]
        if (!otherPart) return false
        const otherBottomY =
          Math.round((other.position[1] - otherPart.dimensions.h / 2) * 10) / 10
        return Math.abs(otherBottomY - topY) < OCCUPY_TOLERANCE
      })
      if (hasOccupants) seen.set(topY, true)
    }
  }

  const levels = [...seen.keys()].sort((a, b) => a - b)
  return levels.length > 0 ? levels : [0]
}

// Computes the axis-aligned XZ bounding box of the build's floor footprint.
// Uses foundation/floor pieces; falls back to all pieces if none are present.
// Returns null for an empty build. Used by CameraController to keep the camera
// inside the structure in interior mode.
export function computeBuildBounds(
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
  const floors = pieces.filter((p) => {
    const part = partsById[p.partId]
    return part && (part.category === 'foundation' || part.category === 'floor')
  })
  const source = floors.length > 0 ? floors : pieces
  if (source.length === 0) return null
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const piece of source) {
    const part = partsById[piece.partId]
    if (!part) continue
    minX = Math.min(minX, piece.position[0] - part.dimensions.w / 2)
    maxX = Math.max(maxX, piece.position[0] + part.dimensions.w / 2)
    minZ = Math.min(minZ, piece.position[2] - part.dimensions.d / 2)
    maxZ = Math.max(maxZ, piece.position[2] + part.dimensions.d / 2)
  }
  return { minX, maxX, minZ, maxZ }
}

// Returns the top-surface Y of the highest piece in the build (the ceiling).
// Used by CameraController to clamp vertical movement in interior mode.
// Returns null for an empty build.
export function computeBuildCeiling(
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): number | null {
  let max: number | null = null
  for (const piece of pieces) {
    const part = partsById[piece.partId]
    if (!part) continue
    const topY = piece.position[1] + part.dimensions.h / 2
    if (max === null || topY > max) max = topY
  }
  return max
}

// Returns true if `point` is within the XZ footprint of `piece`, accounting
// for the piece's yaw rotation. Uses a small epsilon so that points landing
// exactly on a piece's boundary count as inside — without this, probes at
// coordinates like x=2 (foundation edge) miss adjacent walls at x=2.0 because
// e.g. (2 - 1.9) in JS = 0.10000000000000009 > 0.1.
export function isPointInsideFootprint(
  point: Vec3,
  piece: PlacedPiece,
  part: PartDef
): boolean {
  const EPSILON = 1e-6
  const dx = point[0] - piece.position[0]
  const dz = point[2] - piece.position[2]
  const yaw = -piece.rotation[1]
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const localX = dx * cos + dz * sin
  const localZ = -dx * sin + dz * cos
  return (
    Math.abs(localX) <= part.dimensions.w / 2 + EPSILON &&
    Math.abs(localZ) <= part.dimensions.d / 2 + EPSILON
  )
}

// Computes the elevation (top-surface Y) of whatever the ghost is over.
// Probes the ghost's footprint corners + center against every placed piece;
// the highest matching piece's top wins. Returns 0 if nothing is underneath.
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
    if (top <= maxTop) continue
    for (const p of probes) {
      if (isPointInsideFootprint(p, piece, part)) {
        maxTop = top
        break
      }
    }
  }
  return maxTop
}

// Re-rank candidates so the one that puts the ghost over the most existing
// pieces wins. This is what makes a roof default to 'centered over the wall
// box' instead of 'sitting on the single wall closest to the cursor' — the
// centered slide candidate covers all 4 walls of a box, while edge candidates
// only cover 1 or 2. The host piece is excluded so that wall-on-wall stacking
// (single piece host) still falls back to distance-from-cursor ordering.
export function rankCandidatesByCoverage(
  candidates: SnapCandidate[],
  ghostPart: PartDef,
  pieces: PlacedPiece[],
  partsById: Record<string, PartDef>
): SnapCandidate[] {
  if (candidates.length <= 1 || pieces.length === 0) return candidates
  const { w, h, d } = ghostPart.dimensions
  const Y_EPSILON = 0.05 // tolerate small float drift when comparing tops
  const localCorners: Vec3[] = [
    [-w / 2, 0, -d / 2],
    [w / 2, 0, -d / 2],
    [-w / 2, 0, d / 2],
    [w / 2, 0, d / 2],
    [0, 0, 0],
  ]
  const scored = candidates.map((c) => {
    const pos = computeSnapPosition(ghostPart, c)
    const ghostBottom = pos[1] - h / 2
    // Probes must reflect the candidate's snap rotation — otherwise asymmetric
    // ghosts (e.g. a 4×0.2 wall) under-count coverage when the snap rotates
    // them 90°, making coverage scores inconsistent across edges of a box.
    const yaw = computeSnapRotation(c)[1]
    const probes: Vec3[] = localCorners.map((lc) => {
      const r = rotateY(lc, yaw)
      return [pos[0] + r[0], 0, pos[2] + r[2]]
    })
    const covered = new Set<string>()
    for (const piece of pieces) {
      if (piece.uuid === c.worldAnchor.pieceUuid) continue
      const part = partsById[piece.partId]
      if (!part) continue
      // Only count pieces that sit AT OR BELOW the ghost — pieces above the
      // ghost don't count as "coverage" (they'd cause stack-on-wall candidates
      // to falsely outscore the floor-edge candidate when placing a 2nd-story
      // wall under an existing floor).
      const pieceTop = piece.position[1] + part.dimensions.h / 2
      if (pieceTop > ghostBottom + Y_EPSILON) continue
      for (const p of probes) {
        if (isPointInsideFootprint(p, piece, part)) {
          covered.add(piece.uuid)
          break
        }
      }
    }
    return { candidate: c, coverage: covered.size }
  })
  scored.sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage
    return a.candidate.distance - b.candidate.distance
  })
  return scored.map((s) => s.candidate)
}

// Compute a snapped yaw that aligns the ghost's primary face with the candidate's
// normal. For 'edge' and 'side' anchors, walls should face perpendicular to the
// anchor normal (i.e., the wall's broad face matches the normal direction).
// For 'top' and 'bottom' anchors, the horizontal normal is degenerate — the
// ghost inherits the host's rotation so stacked pieces stay aligned with the
// piece below them (a second-story wall lands parallel to its host, not
// perpendicular).
export function computeSnapRotation(candidate: SnapCandidate): Vec3 {
  const surface = candidate.worldAnchor.anchor.surface
  const normal = candidate.worldAnchor.worldNormal
  if (surface === 'edge' || surface === 'side') {
    const yaw = Math.atan2(normal[0], normal[2])
    return [0, yaw, 0]
  }
  return candidate.worldAnchor.pieceRotation
}
