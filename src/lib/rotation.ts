// In-game BBP rotation happens via mouse-wheel clicks of `stepDeg` each.
// The editor allows continuous yaw rotation, then the Inspector translates
// the result back into a click count so the user can match the design in-game.
//
// Algorithm per PLAN.md §13.

export interface ClicksResult {
  /** Normalized yaw in [0, 360). */
  normalized: number
  /** Click count from default (0°) going clockwise. */
  cw: number
  /** Click count from default (0°) going counter-clockwise. */
  ccw: number
  /** Whichever of cw/ccw is the shorter path. */
  shorter: 'cw' | 'ccw'
  /** True when the normalized angle lands exactly on a step boundary. */
  reachable: boolean
}

const EPSILON = 0.001

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function clicksToReach(targetDeg: number, stepDeg: number): ClicksResult {
  const normalized = normalizeDegrees(targetDeg)
  const cwExact = normalized / stepDeg
  const ccwExact = (360 - normalized) / stepDeg
  return {
    normalized,
    cw: Math.round(cwExact),
    ccw: Math.round(ccwExact),
    shorter: cwExact <= ccwExact ? 'cw' : 'ccw',
    // Reachable iff the exact CW click count is (very close to) an integer
    reachable: Math.abs(cwExact - Math.round(cwExact)) < EPSILON,
  }
}

// For unreachable angles, returns the two nearest valid angles (floor/ceil).
// When the angle IS reachable, both entries are the angle itself.
export function nearestValidAngles(
  targetDeg: number,
  stepDeg: number
): { lower: number; upper: number } {
  const normalized = normalizeDegrees(targetDeg)
  const lowerClick = Math.floor(normalized / stepDeg)
  const upperClick = Math.ceil(normalized / stepDeg)
  return {
    lower: normalizeDegrees(lowerClick * stepDeg),
    upper: normalizeDegrees(upperClick * stepDeg),
  }
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}
