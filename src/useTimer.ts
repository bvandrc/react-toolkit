/**
 * @fileoverview A single timeout a handler can start and clear, cleared for
 * you on unmount.
 */

import { useCallback, useMemo, useRef } from 'react'
import { useUnmount } from 'usehooks-ts'

/**
 * `start(fn, ms)` runs `fn` after `ms`, replacing any timeout still pending,
 * and `clear()` cancels it.
 *
 * Unlike `usehooks-ts`'s `useTimeout`, which runs on render, this is started
 * from a handler. A pending timeout is cleared on unmount. Both functions keep
 * their identity across renders.
 */
export const useTimer = () => {
  const idRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const clear = useCallback(() => clearTimeout(idRef.current), [])
  const start = useCallback((fn: () => void, ms: number) => {
    clearTimeout(idRef.current)
    idRef.current = setTimeout(fn, ms)
  }, [])

  useUnmount(clear)

  return useMemo(() => ({ start, clear }), [start, clear])
}
