/**
 * @fileoverview Test helper that stands in for `ResizeObserver`, which
 * happy-dom provides but never fires.
 */

import { act } from '@testing-library/react'
import { vi } from 'vitest'

/**
 * Stubs the global `ResizeObserver`, returning a function that reports a
 * resize to every observer still connected.
 *
 * @example
 * ```ts
 * const reportResize = mockResizeObserver()
 * renderEditor()
 *
 * act(() => reportResize())
 * ```
 */
export const mockResizeObserver = () => {
  const connected = new Set<() => void>()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      readonly #callback: () => void
      constructor(callback: () => void) {
        this.#callback = callback
      }
      observe() {
        connected.add(this.#callback)
      }
      unobserve() {
        connected.delete(this.#callback)
      }
      disconnect() {
        connected.delete(this.#callback)
      }
    }
  )
  return () =>
    act(() => {
      for (const callback of connected) callback()
    })
}
