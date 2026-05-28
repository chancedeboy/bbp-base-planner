import type { BuildMeta, PlacedPiece, ServerConfig } from '../data/types'
import { DEFAULT_SERVER_CONFIG } from '../data/types'

// The shape that is persisted to localStorage and serialised into share URLs.
export interface PersistedBuild {
  pieces: PlacedPiece[]
  meta: BuildMeta
  serverConfig: ServerConfig
  snapEnabled: boolean
}

// Takes any raw (potentially old-schema) object and returns a valid
// PersistedBuild at the current schema version. Add a new branch here
// whenever schemaVersion is bumped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateBuild(raw: any): PersistedBuild {
  const version: number = raw?.meta?.schemaVersion ?? 0

  // v0 → v1: PlacedPiece gained a `layer` field
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pieces: PlacedPiece[] = (raw?.pieces ?? []).map((p: any) => ({
    ...p,
    layer: p.layer ?? 'exterior',
  }))

  // Future: add `if (version < 2) { ... }` blocks here before the return to
  // chain further migrations. `version` is read here so TypeScript knows it's used.
  void version

  return {
    pieces,
    meta: {
      name: raw?.meta?.name ?? 'Untitled Base',
      description: raw?.meta?.description ?? '',
      createdAt: raw?.meta?.createdAt ?? new Date().toISOString(),
      updatedAt: raw?.meta?.updatedAt ?? new Date().toISOString(),
      schemaVersion: 1,
    },
    serverConfig: { ...DEFAULT_SERVER_CONFIG, ...(raw?.serverConfig ?? {}) },
    snapEnabled: raw?.snapEnabled ?? true,
  }
}

