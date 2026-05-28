import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  BuildState,
  PlacedPiece,
  ServerConfig,
  Tier,
} from '../data/types'
import { DEFAULT_SERVER_CONFIG } from '../data/types'
import { getPart } from '../data/parts'

const initialMeta: BuildState['meta'] = {
  name: 'Untitled Base',
  description: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaVersion: 1,
}

interface GhostState {
  // Yaw rotation of the ghost piece in radians. Sprint 2: yaw-only.
  ghostRotation: [number, number, number]
  // Index into the sorted snap candidates; mouse wheel cycles.
  snapCandidateIndex: number
}

interface BuildStoreActions {
  selectedPartId: string | null
  selectPart: (id: string | null) => void
  placePiece: (
    partId: string,
    position: [number, number, number],
    rotation?: [number, number, number]
  ) => string
  removePiece: (uuid: string) => void
  selectPiece: (uuid: string | null) => void
  upgradeTier: (uuid: string, tier: Tier) => void
  setPieceRotation: (uuid: string, rotation: [number, number, number]) => void
  rotatePiece: (uuid: string, deltaRad: number) => void
  toggleSnap: () => void
  setMode: (mode: 'exterior' | 'interior') => void
  setServerConfig: (cfg: Partial<ServerConfig>) => void
  clear: () => void

  // Ghost / placement controls
  setGhostRotation: (rot: [number, number, number]) => void
  rotateGhost: (deltaRad: number) => void
  resetGhostRotation: () => void
  cycleSnapCandidate: (delta: number) => void
  resetSnapCandidate: () => void
}

export type BuildStore = BuildState & GhostState & BuildStoreActions

const initialState: BuildState & GhostState & { selectedPartId: string | null } = {
  pieces: [],
  meta: initialMeta,
  snapEnabled: true,
  mode: 'exterior',
  selectedPieceId: null,
  selectedPartId: null,
  map: null,
  serverConfig: DEFAULT_SERVER_CONFIG,
  ghostRotation: [0, 0, 0],
  snapCandidateIndex: 0,
}

export const useBuildStore = create<BuildStore>()(
  devtools(
    (set) => ({
      ...initialState,
      selectPart: (id) =>
        set(
          { selectedPartId: id, ghostRotation: [0, 0, 0], snapCandidateIndex: 0 },
          false,
          'selectPart'
        ),
      placePiece: (partId, position, rotation = [0, 0, 0]) => {
        const uuid = crypto.randomUUID()
        // Default to T1 when the part has higher tiers available; otherwise
        // stay at frame (utility/pillar/stair pieces with no upgrades).
        const part = getPart(partId)
        const defaultTier: Tier = part && part.maxTier !== 'frame' ? 't1' : 'frame'
        const piece: PlacedPiece = {
          uuid,
          partId,
          position,
          rotation,
          tier: defaultTier,
          layer: 'exterior',
        }
        set(
          (s) => ({
            pieces: [...s.pieces, piece],
            meta: { ...s.meta, updatedAt: new Date().toISOString() },
            snapCandidateIndex: 0,
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
      setPieceRotation: (uuid, rotation) =>
        set(
          (s) => ({
            pieces: s.pieces.map((p) => (p.uuid === uuid ? { ...p, rotation } : p)),
          }),
          false,
          'setPieceRotation'
        ),
      rotatePiece: (uuid, deltaRad) =>
        set(
          (s) => ({
            pieces: s.pieces.map((p) =>
              p.uuid === uuid
                ? { ...p, rotation: [p.rotation[0], p.rotation[1] + deltaRad, p.rotation[2]] }
                : p
            ),
          }),
          false,
          'rotatePiece'
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

      setGhostRotation: (rot) => set({ ghostRotation: rot }, false, 'setGhostRotation'),
      rotateGhost: (deltaRad) =>
        set(
          (s) => ({
            ghostRotation: [
              s.ghostRotation[0],
              s.ghostRotation[1] + deltaRad,
              s.ghostRotation[2],
            ],
          }),
          false,
          'rotateGhost'
        ),
      resetGhostRotation: () => set({ ghostRotation: [0, 0, 0] }, false, 'resetGhostRotation'),
      cycleSnapCandidate: (delta) =>
        set(
          (s) => ({ snapCandidateIndex: s.snapCandidateIndex + delta }),
          false,
          'cycleSnapCandidate'
        ),
      resetSnapCandidate: () => set({ snapCandidateIndex: 0 }, false, 'resetSnapCandidate'),
    }),
    { name: 'bbp-build-store' }
  )
)
