import { describe, it, expect, beforeEach } from 'vitest'
import { useBuildStore } from '../state/useBuildStore'

// Reset to a clean state before each test, bypassing the history-recording
// `clear()` action so tests don't inherit history entries from setup.
beforeEach(() => {
  useBuildStore.setState({
    pieces: [],
    pastPieces: [],
    selectedPieceId: null,
    selectedPartId: null,
  })
})

describe('undo', () => {
  it('is a no-op when history is empty', () => {
    const { undo } = useBuildStore.getState()
    undo()
    expect(useBuildStore.getState().pieces).toEqual([])
    expect(useBuildStore.getState().pastPieces).toEqual([])
  })

  it('undoes a placement', () => {
    const { placePiece, undo } = useBuildStore.getState()
    placePiece('large-wall', [0, 1.65, 0])
    expect(useBuildStore.getState().pieces).toHaveLength(1)
    undo()
    expect(useBuildStore.getState().pieces).toHaveLength(0)
  })

  it('undoes a removal (restores the piece)', () => {
    const { placePiece, removePiece, undo } = useBuildStore.getState()
    const uuid = placePiece('large-wall', [0, 1.65, 0])
    removePiece(uuid)
    expect(useBuildStore.getState().pieces).toHaveLength(0)
    undo()
    const after = useBuildStore.getState().pieces
    expect(after).toHaveLength(1)
    expect(after[0].uuid).toBe(uuid)
  })

  it('undoes a tier upgrade', () => {
    const { placePiece, upgradeTier, undo } = useBuildStore.getState()
    const uuid = placePiece('large-wall', [0, 1.65, 0])
    const initialTier = useBuildStore.getState().pieces[0].tier
    upgradeTier(uuid, 't3')
    expect(useBuildStore.getState().pieces[0].tier).toBe('t3')
    undo()
    expect(useBuildStore.getState().pieces[0].tier).toBe(initialTier)
  })

  it('undoes a rotation', () => {
    const { placePiece, rotatePiece, undo } = useBuildStore.getState()
    const uuid = placePiece('large-wall', [0, 1.65, 0])
    const initialYaw = useBuildStore.getState().pieces[0].rotation[1]
    rotatePiece(uuid, Math.PI / 2)
    expect(useBuildStore.getState().pieces[0].rotation[1]).toBeCloseTo(initialYaw + Math.PI / 2)
    undo()
    expect(useBuildStore.getState().pieces[0].rotation[1]).toBeCloseTo(initialYaw)
  })

  it('undoes a clear() (restores all pieces)', () => {
    const { placePiece, clear, undo } = useBuildStore.getState()
    placePiece('large-wall', [0, 1.65, 0])
    placePiece('large-wall', [4, 1.65, 0])
    expect(useBuildStore.getState().pieces).toHaveLength(2)
    clear()
    expect(useBuildStore.getState().pieces).toHaveLength(0)
    undo()
    expect(useBuildStore.getState().pieces).toHaveLength(2)
  })

  it('clears selection when the selected piece no longer exists after undo', () => {
    const { placePiece, selectPiece, undo } = useBuildStore.getState()
    const uuid = placePiece('large-wall', [0, 1.65, 0])
    selectPiece(uuid)
    expect(useBuildStore.getState().selectedPieceId).toBe(uuid)
    undo() // removes the only piece
    expect(useBuildStore.getState().selectedPieceId).toBeNull()
  })

  it('preserves selection when the selected piece still exists after undo', () => {
    const { placePiece, selectPiece, rotatePiece, undo } = useBuildStore.getState()
    const uuid = placePiece('large-wall', [0, 1.65, 0])
    selectPiece(uuid)
    rotatePiece(uuid, Math.PI / 4) // mutate, but piece still exists
    undo()
    expect(useBuildStore.getState().selectedPieceId).toBe(uuid)
  })

  it('supports multi-step undo (LIFO)', () => {
    const { placePiece, undo } = useBuildStore.getState()
    placePiece('large-wall', [0, 1.65, 0])
    placePiece('large-wall', [4, 1.65, 0])
    placePiece('large-wall', [8, 1.65, 0])
    expect(useBuildStore.getState().pieces).toHaveLength(3)
    undo()
    expect(useBuildStore.getState().pieces).toHaveLength(2)
    undo()
    expect(useBuildStore.getState().pieces).toHaveLength(1)
    undo()
    expect(useBuildStore.getState().pieces).toHaveLength(0)
    undo() // no-op
    expect(useBuildStore.getState().pieces).toHaveLength(0)
  })
})
