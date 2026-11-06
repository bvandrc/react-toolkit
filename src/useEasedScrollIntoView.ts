/**
 * @fileoverview Deprecated: `useScrollIntoView` with a smooth scroll, kept
 * under its old name so existing callers don't break.
 */

import { useScrollIntoView } from './useScrollIntoView'

/**
 * `useScrollIntoView`, with every scroll animated.
 *
 * @deprecated Use `useScrollIntoView({ scrollBehavior: 'smooth' })`. This
 * will be removed in the next major release.
 */
export const useEasedScrollIntoView = () =>
  useScrollIntoView({ scrollBehavior: 'smooth' })
