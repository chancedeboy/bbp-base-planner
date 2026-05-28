import { describe, it, expect } from 'vitest'
import {
  clicksToReach,
  nearestValidAngles,
  normalizeDegrees,
  radToDeg,
  degToRad,
} from '../lib/rotation'

describe('normalizeDegrees', () => {
  it('handles values in [0, 360)', () => {
    expect(normalizeDegrees(45)).toBe(45)
    expect(normalizeDegrees(0)).toBe(0)
    expect(normalizeDegrees(359)).toBe(359)
  })

  it('wraps values >= 360', () => {
    expect(normalizeDegrees(360)).toBe(0)
    expect(normalizeDegrees(720)).toBe(0)
    expect(normalizeDegrees(450)).toBe(90)
  })

  it('wraps negative values', () => {
    expect(normalizeDegrees(-45)).toBe(315)
    expect(normalizeDegrees(-90)).toBe(270)
  })
})

describe('clicksToReach', () => {
  it('0° is reachable in 0 clicks (default)', () => {
    const r = clicksToReach(0, 5)
    expect(r.normalized).toBe(0)
    expect(r.cw).toBe(0)
    expect(r.reachable).toBe(true)
  })

  it('45° at 5° step = 9 clicks CW (reachable)', () => {
    const r = clicksToReach(45, 5)
    expect(r.cw).toBe(9)
    expect(r.ccw).toBe(63)
    expect(r.shorter).toBe('cw')
    expect(r.reachable).toBe(true)
  })

  it('90° at 5° step = 18 CW / 54 CCW (CW shorter)', () => {
    const r = clicksToReach(90, 5)
    expect(r.cw).toBe(18)
    expect(r.ccw).toBe(54)
    expect(r.shorter).toBe('cw')
    expect(r.reachable).toBe(true)
  })

  it('270° at 5° step = 54 CW / 18 CCW (CCW shorter)', () => {
    const r = clicksToReach(270, 5)
    expect(r.cw).toBe(54)
    expect(r.ccw).toBe(18)
    expect(r.shorter).toBe('ccw')
    expect(r.reachable).toBe(true)
  })

  it('37° at 5° step is NOT reachable (between 35° and 40°)', () => {
    const r = clicksToReach(37, 5)
    expect(r.reachable).toBe(false)
  })

  it('handles 90° rotation steps (vanilla DayZ snap)', () => {
    expect(clicksToReach(0, 90).cw).toBe(0)
    expect(clicksToReach(90, 90).cw).toBe(1)
    expect(clicksToReach(180, 90).cw).toBe(2)
    expect(clicksToReach(45, 90).reachable).toBe(false)
  })

  it('normalizes negative input', () => {
    const r = clicksToReach(-90, 5)
    expect(r.normalized).toBe(270)
    expect(r.shorter).toBe('ccw')
  })
})

describe('nearestValidAngles', () => {
  it('returns the angle itself when reachable', () => {
    const { lower, upper } = nearestValidAngles(45, 5)
    expect(lower).toBe(45)
    expect(upper).toBe(45)
  })

  it('returns floor and ceil for unreachable angles', () => {
    const { lower, upper } = nearestValidAngles(37, 5)
    expect(lower).toBe(35)
    expect(upper).toBe(40)
  })

  it('respects the 15° step', () => {
    const { lower, upper } = nearestValidAngles(20, 15)
    expect(lower).toBe(15)
    expect(upper).toBe(30)
  })
})

describe('radToDeg / degToRad', () => {
  it('roundtrips', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180)
    expect(degToRad(180)).toBeCloseTo(Math.PI)
    expect(radToDeg(degToRad(45))).toBeCloseTo(45)
  })
})
