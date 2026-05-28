export interface Migration {
  fromVersion: number
  toVersion: number
  migrate: (state: unknown) => unknown
}

// Add migrations here as the schema evolves. Each migration transforms a
// state object from `fromVersion` to `toVersion`. They run in sequence to
// upgrade older saved builds.
export const migrations: Migration[] = []

export function migrateState(state: unknown, currentVersion: number): unknown {
  let working = state
  for (const m of migrations) {
    if (m.fromVersion >= currentVersion) {
      working = m.migrate(working)
    }
  }
  return working
}
