import { describe, it, expect } from 'vitest'

// Smoke test — confirms the test runner itself is wired up correctly.
// R3F canvas tests require a WebGL context; save those for integration tests.
describe('smoke', () => {
  it('test runner works', () => {
    expect(true).toBe(true)
  })
})
