import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  BuildState,
  PlacedPiece,
  ServerConfig,
  Tier,
} from '../data/types'
import { DEFAULT_SERVER_CONFIG } from '../data/types'

const initialMeta: BuildState['meta'] = {
  name: 'Untitled Base',
  description: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaVersion: 1,
}

interface BuildStoreActions {
  selectedPartId: string | null
  selectPart: (id: string | null) => void
  placePiece: (partId: string, position: [number, number, number]) => string
  removePiece: (uuid: string) => void
  selectPiece: (uuid: string | null) => void
  upgradeTier: (uuid: string, tier: Tier) => void
  toggleSnap: () => void
  setMode: (mode: 'exterior' | 'interior') => void
  setServerConfig: (cfg: Partial<ServerConfig>) => void
  clear: () => void
}

export type BuildStore = BuildState & BuildStoreActions

const initialState: BuildState & { selectedPartId: string | null } = {
  pieces: [],
  meta: initialMeta,
  snapEnabled: true,
  mode: 'exterior',
  selectedPieceId: null,
  selectedPartId: null,
  map: null,
  serverConfig: DEFAULT_SERVER_CONFIG,
}

export const useBuildStore = create<BuildStore>()(
  devtools(
    (set) => ({
      ...initialState,
      selectPart: (id) => set({ selectedPartId: id }, false, 'selectPart'),
      placePiece: (partId, position) => {
        const uuid = crypto.randomUUID()
        const piece: PlacedPiece = {
          uuid,
          partId,
          position,
          rotation: [0, 0, 0],
          tier: 'frame',
          layer: 'exterior',
        }
        set(
          (s) => ({
            pieces: [...s.pieces, piece],
            meta: { ...s.meta, updatedAt: new Date().toISOString() },
          }),
          false,
          'placePiece'
        )
        return uuid
      },
      removePiece: (uuid) =>
        set(
          (s) => ({ pieces: s.pieces.filter((p) => p.uuid !== uuid) }),
          false,
          'removePiece'
        ),
      selectPiece: (uuid) => set({ selectedPieceId: uuid }, false, 'selectPiece'),
      upgradeTier: (uuid, tier) =>
        set(
          (s) => ({
            pieces: s.pieces.map((p) => (p.uuid === uuid ? { ...p, tier } : p)),
          }),
          false,
          'upgradeTier'
        ),
      toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled }), false, 'toggleSnap'),
      setMode: (mode) => set({ mode }, false, 'setMode'),
      setServerConfig: (cfg) =>
        set(
          (s) => ({ serverConfig: { ...s.serverConfig, ...cfg } }),
          false,
          'setServerConfig'
        ),
      clear: () => set({ ...initialState }, false, 'clear'),
    }),
    { name: 'bbp-build-store' }
  )
)
