/**
 * @fileoverview Holds a change back until the press under way has finished,
 * so a layout shift it causes can't move the pressed control out from under
 * it.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useTimer } from './useTimer'

/** How long after release a press that never clicks is taken to be over. */
const NO_CLICK_TIMEOUT_MS = 500

/**
 * `run(fn)` calls `fn` straight away, or, while a press is under way anywhere
 * on the page, once that press has finished. `cancel()` drops a call still
 * waiting.
 *
 * For a change that moves things, like closing a toolbar when focus leaves:
 * focus leaves as a press goes down, and anything that moves before its click
 * lands takes the click away from the control that was pressed. A press
 * finishes with the click it ends in, which a tap only sends after the finger
 * lifts; with `pointercancel`, as when a touch turns into a scroll; or half a
 * second after release where no click comes. `run` replaces a call still
 * waiting, and unmount drops it. Both functions keep their identity across
 * renders.
 *
 * @example
 * ```tsx
 * const { run } = useAfterPress()
 *
 * // Close the toolbar as focus leaves, without taking the click from whatever
 * // was pressed to move it.
 * const onBlur = (event: React.FocusEvent<HTMLDivElement>) => {
 *   if (!event.currentTarget.contains(event.relatedTarget)) {
 *     run(() => setToolbarOpen(false))
 *   }
 * }
 * ```
 */
export const useAfterPress = () => {
  const isPressingRef = useRef(false)
  const waitingRef = useRef<(() => void) | undefined>(undefined)
  const timer = useTimer()

  const cancel = useCallback(() => {
    waitingRef.current = undefined
  }, [])

  const run = useCallback((fn: () => void) => {
    if (isPressingRef.current) waitingRef.current = fn
    else fn()
  }, [])

  useEffect(() => {
    const finish = () => {
      isPressingRef.current = false
      timer.clear()
      const waiting = waitingRef.current
      waitingRef.current = undefined
      waiting?.()
    }
    const onPointerDown = () => {
      isPressingRef.current = true
      timer.clear()
    }
    const onPointerUp = () => {
      if (isPressingRef.current) timer.start(finish, NO_CLICK_TIMEOUT_MS)
    }
    // The next task, so the click has reached its target before anything moves.
    const onClick = () => {
      if (isPressingRef.current) timer.start(finish, 0)
    }

    // Capture, so a handler that stops the event on its way down can't hide it.
    const listeners = [
      ['pointerdown', onPointerDown],
      ['pointerup', onPointerUp],
      ['pointercancel', finish],
      ['click', onClick],
    ] as const
    for (const [type, listener] of listeners) {
      document.addEventListener(type, listener, true)
    }
    // Unmounting drops a waiting call along with these, and `timer` clears its
    // own timeout.
    return () => {
      for (const [type, listener] of listeners) {
        document.removeEventListener(type, listener, true)
      }
    }
  }, [timer])

  return useMemo(() => ({ run, cancel }), [run, cancel])
}
