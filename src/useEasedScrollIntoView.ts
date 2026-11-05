/**
 * @fileoverview Deprecated: `useScrollIntoView` with a smooth scroll, kept
 * under its old name so existing callers don't break.
 */

import { useCallback } from 'react'

import { useScrollIntoView } from './useScrollIntoView'
import type { ScrollBlock } from './utils'

/**
 * `useScrollIntoView`, with every scroll animated.
 *
 * @deprecated Use `useScrollIntoView`, passing `{ behavior: 'smooth' }` for
 * an animated scroll. This will be removed in the next major release.
 */
export const useEasedScrollIntoView = () => {
  const { scrollIntoView, cancel } = useScrollIntoView()
  return {
    scrollIntoView: useCallback(
      (el: HTMLElement, block: ScrollBlock) =>
        scrollIntoView(el, block, { behavior: 'smooth' }),
      [scrollIntoView]
    ),
    cancel,
  }
}
