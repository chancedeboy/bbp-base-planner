import LZString from 'lz-string'
import type { PersistedBuild } from './migrations'
import { migrateBuild } from './migrations'

// URL encoding version prefix — increment only when the encoding FORMAT changes
// (e.g. switching from JSON to MessagePack). Schema changes use schemaVersion
// inside the payload and are handled by migrateBuild instead.
const URL_VERSION = 'v1.'

export function encodeBuild(build: PersistedBuild): string {
  return URL_VERSION + LZString.compressToEncodedURIComponent(JSON.stringify(build))
}

export function decodeBuild(encoded: string): PersistedBuild {
  if (encoded.startsWith(URL_VERSION)) {
    const json = LZString.decompressFromEncodedURIComponent(encoded.slice(URL_VERSION.length))
    if (!json) throw new Error('Failed to decompress build data — the URL may be truncated.')
    return migrateBuild(JSON.parse(json))
  }
  const prefix = encoded.slice(0, 10)
  throw new Error(`Unknown share URL version "${prefix}…" — this link may be from a newer version of the planner.`)
}

export function buildToJson(build: PersistedBuild): string {
  return JSON.stringify(build, null, 2)
}

export function jsonToBuild(json: string): PersistedBuild {
  return migrateBuild(JSON.parse(json))
}
