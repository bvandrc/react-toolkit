/**
 * @fileoverview Hook that listens to `window.visualViewport`, which
 * `usehooks-ts`'s `useEventListener` has no target for.
 */

import { useEffect } from 'react'

import { useLatestRef } from './useLatestRef'

/**
 * Calls `handler` on each `eventName` the visual viewport fires, for as long as
 * the component is mounted.
 *
 * The visual viewport is the part of the page actually on screen: unlike the
 * window, it shrinks when an on-screen keyboard opens and moves under pinch
 * zoom. Does nothing in a browser without one. `handler` can change between
 * renders without re-subscribing.
 */
export const useVisualViewportListener = <
  K extends keyof VisualViewportEventMap,
>(
  eventName: K,
  handler: (event: VisualViewportEventMap[K]) => void
) => {
  const handlerRef = useLatestRef(handler)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const listener = (event: VisualViewportEventMap[K]) =>
      handlerRef.current(event)
    viewport.addEventListener(eventName, listener)
    return () => viewport.removeEventListener(eventName, listener)
  }, [eventName])
}
