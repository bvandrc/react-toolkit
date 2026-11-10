/**
 * @fileoverview A ref to a value's latest committed version, for the package's
 * own hooks; not exported from the package.
 */

import { useRef } from 'react'
import { useIsomorphicLayoutEffect } from 'usehooks-ts'

/**
 * A ref holding `value` as of the last commit, for handlers and effects that
 * should read it without being rebuilt or re-run every time it changes.
 *
 * A render React throws away never reaches it. The ref keeps its identity
 * across renders.
 */
export const useLatestRef = <T>(value: T) => {
  const ref = useRef(value)
  useIsomorphicLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
