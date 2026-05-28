import { describe, it, expect } from 'vitest'
import { encodeBuild, decodeBuild, buildToJson, jsonToBuild } from '../lib/serialise'
import { migrateBuild } from '../lib/migrations'
import type { PersistedBuild } from '../lib/migrations'
import { DEFAULT_SERVER_CONFIG } from '../data/types'

const sampleBuild: PersistedBuild = {
  pieces: [
    {
      uuid: 'abc-123',
      partId: 'foundation-triangle',
      position: [0, 0.15, 0],
      rotation: [0, 0, 0],
      tier: 't1',
      layer: 'exterior',
    },
  ],
  meta: {
    name: 'Test Base',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
  },
  serverConfig: DEFAULT_SERVER_CONFIG,
  snapEnabled: true,
}

describe('encodeBuild / decodeBuild', () => {
  it('roundtrips a build through URL encoding', () => {
    const encoded = encodeBuild(sampleBuild)
    expect(encoded).toMatch(/^v1\./)
    const decoded = decodeBuild(encoded)
    expect(decoded.pieces).toHaveLength(1)
    expect(decoded.pieces[0].uuid).toBe('abc-123')
    expect(decoded.meta.name).toBe('Test Base')
  })

  it('throws on unknown version prefix', () => {
    expect(() => decodeBuild('v2.somejunk')).toThrow(/Unknown share URL version/)
  })

  it('throws on corrupted compressed data', () => {
    expect(() => decodeBuild('v1.!!!notvalidlzstring!!!')).toThrow()
  })
})

describe('buildToJson / jsonToBuild', () => {
  it('roundtrips a build through JSON', () => {
    const json = buildToJson(sampleBuild)
    const parsed = jsonToBuild(json)
    expect(parsed.pieces[0].partId).toBe('foundation-triangle')
    expect(parsed.meta.schemaVersion).toBe(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => jsonToBuild('not json {')).toThrow()
  })
})

describe('migrateBuild', () => {
  it('adds missing layer field (v0 → v1)', () => {
    const v0 = {
      pieces: [{ uuid: 'x', partId: 'large-wall', position: [0, 1.65, 0], rotation: [0, 0, 0], tier: 't1' }],
      meta: { name: 'Old', description: '', createdAt: '', updatedAt: '', schemaVersion: 0 },
      serverConfig: DEFAULT_SERVER_CONFIG,
      snapEnabled: true,
    }
    const migrated = migrateBuild(v0)
    expect(migrated.pieces[0].layer).toBe('exterior')
    expect(migrated.meta.schemaVersion).toBe(1)
  })

  it('preserves existing layer field', () => {
    const v1 = {
      ...sampleBuild,
      pieces: [{ ...sampleBuild.pieces[0], layer: 'interior' as const }],
    }
    const migrated = migrateBuild(v1)
    expect(migrated.pieces[0].layer).toBe('interior')
  })

  it('handles empty/missing pieces array gracefully', () => {
    const migrated = migrateBuild({ meta: { schemaVersion: 1 } })
    expect(migrated.pieces).toEqual([])
    expect(migrated.snapEnabled).toBe(true)
  })

  it('merges missing serverConfig fields with defaults', () => {
    const partial = { ...sampleBuild, serverConfig: { rotationStep: 15 } }
    const migrated = migrateBuild(partial)
    expect(migrated.serverConfig.rotationStep).toBe(15)
    expect(migrated.serverConfig.flagpoleRadius).toBe(DEFAULT_SERVER_CONFIG.flagpoleRadius)
  })
})
