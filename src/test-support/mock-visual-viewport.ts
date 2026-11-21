/**
 * @fileoverview Test helper that stands in for `window.visualViewport`, which
 * happy-dom doesn't provide.
 */

import { act } from '@testing-library/react'
import { vi } from 'vitest'

/** The parts of the visual viewport this mock lets a test set. */
export interface MockVisualViewportState {
  offsetTop: number
  height: number
}

/**
 * Stubs `window.visualViewport` with `initial` (both default to 0), returning
 * `change`, which updates it and fires `eventName` the way the browser would.
 *
 * Give it a `height` where the layout helpers measure: at 0, they count all of
 * the page as behind the on-screen keyboard.
 *
 * @example
 * ```ts
 * const viewport = mockVisualViewport({ height: 800 })
 *
 * // The on-screen keyboard opens.
 * // `change` runs in `act` itself.
 * viewport.change({ height: 500 }, 'resize')
 * ```
 */
export const mockVisualViewport = (
  initial: Partial<MockVisualViewportState> = {}
) => {
  const viewport = Object.assign(new EventTarget(), {
    offsetTop: 0,
    height: 0,
    ...initial,
  })
  vi.stubGlobal('visualViewport', viewport)

  return {
    change: (
      next: Partial<MockVisualViewportState>,
      eventName: keyof VisualViewportEventMap
    ) =>
      act(() => {
        Object.assign(viewport, next)
        viewport.dispatchEvent(new Event(eventName))
      }),
  }
}
