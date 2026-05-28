export type Tier = 'frame' | 't1' | 't2' | 't3'

export type Resource =
  | 'planks'
  | 'nails'
  | 'logs'
  | 'sheetMetal'
  | 'concreteBricks'
  | 'mortarMix'
  | 'barbwire'
  | 'bbpBook'

export type Category =
  | 'utility'
  | 'wall'
  | 'foundation'
  | 'door'
  | 'gate'
  | 'floor'
  | 'roof'
  | 'window'
  | 'hatch'
  | 'metal'
  | 'pillar'
  | 'stair'

export interface RecipeStep {
  resources: Partial<Record<Resource, number>>
  notes?: string
  // If true, this tier requires the previous tier to be built first
  // (resources accumulate). If false, this is a standalone recipe.
  cumulative?: boolean
}

export interface SnapAnchor {
  id: string
  position: [number, number, number]
  normal: [number, number, number]
  accepts: Category[]
}

export interface PartDef {
  id: string
  name: string
  category: Category
  dimensions: { w: number; h: number; d: number }
  snapAnchors: SnapAnchor[]
  recipes: Partial<Record<Tier, RecipeStep>>
  maxTier: Tier
  notes?: string
  verifiedAgainstBBPVersion: string
  verifiedSource: 'fandom-wiki' | 'cartel-mirror' | 'discord' | 'in-game'
}

export interface PlacedPiece {
  uuid: string
  partId: string
  position: [number, number, number]
  rotation: [number, number, number]
  tier: Tier
  layer: 'exterior' | 'interior'
}

export interface BuildMeta {
  name: string
  description: string
  createdAt: string
  updatedAt: string
  schemaVersion: 1
}

export interface ServerConfig {
  rotationStep: number
  raidToolsTier1: string[]
  raidToolsTier2: string[]
  raidToolsTier3: string[]
  flagpoleRadius: number
  decayDaysUnprotected: number
  decayDaysProtected: number
}

export interface BuildState {
  pieces: PlacedPiece[]
  meta: BuildMeta
  snapEnabled: boolean
  mode: 'exterior' | 'interior'
  selectedPieceId: string | null
  map: string | null
  serverConfig: ServerConfig
}

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  rotationStep: 5,
  raidToolsTier1: [],
  raidToolsTier2: [],
  raidToolsTier3: [],
  flagpoleRadius: 60,
  decayDaysUnprotected: 7,
  decayDaysProtected: 90,
}
