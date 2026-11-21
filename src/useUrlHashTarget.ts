/**
 * @fileoverview Hook that scrolls to the element a URL's `#` names once an app
 * has rendered it, and returns its target once the page has landed there.
 */

import { useEffect, useState } from 'react'

import { useLatestRef } from './useLatestRef'
import { parseUrlHash, type UrlHashTarget } from './utils'

export type UseUrlHashTargetOptions = {
  /**
   * Jumps to the target's element, in place of an instant `scrollIntoView` to
   * its top, as for a target that should land centered.
   *
   * Must jump instantly, since the target returns a frame after it.
   */
  scrollToTarget?: (element: HTMLElement, target: UrlHashTarget) => void
}

/** The default jump: instant, to the element's top, as the browser's own would be. */
const scrollToTop = (element: HTMLElement) =>
  element.scrollIntoView({ behavior: 'instant' })

/**
 * The URL's `#` target, like `#pricing?plan=pro`, once the page has landed on
 * it; `undefined` until then, or for no `#`.
 *
 * Jumps to its element once the app has rendered it, and again when the `#`
 * changes to one with parameters; a plain `#id` it changes to, it leaves to the
 * browser. Returns a target a frame after jumping to it, so a tooltip opened on
 * it isn't closed by the jump's scroll. Call it once, near the app's root.
 */
export const useUrlHashTarget = ({
  scrollToTarget = scrollToTop,
}: UseUrlHashTargetOptions = {}) => {
  const [landed, setLanded] = useState<UrlHashTarget>()
  // Read when it jumps, so a new function each render doesn't start over.
  const scrollToTargetRef = useLatestRef(scrollToTarget)
  useEffect(() => {
    let frame: number | undefined
    const land = (target: UrlHashTarget) => {
      // A frame on, by when layout effects that resize what's above it have
      // settled.
      frame = requestAnimationFrame(() => {
        const element = document.getElementById(target.id)
        if (element) {
          scrollToTargetRef.current(element, target)
        }
        // The jump's scroll event fires as the next frame renders, before its
        // animation frame callbacks.
        frame = requestAnimationFrame(() => setLanded(target))
      })
    }
    const changeHash = () => {
      // A landing still on its way is for the `#` before.
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
      }
      const target = parseUrlHash(window.location.hash)
      // A plain `#id` the browser scrolls to itself, so nothing waits on it.
      if (target === undefined || target.params.size === 0) {
        setLanded(target)
        return
      }
      land(target)
    }

    // The browser looked for it as the page loaded, before the app drew it.
    const loadTarget = parseUrlHash(window.location.hash)
    if (loadTarget !== undefined) {
      land(loadTarget)
    }
    window.addEventListener('hashchange', changeHash)
    return () => {
      window.removeEventListener('hashchange', changeHash)
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
      }
    }
  }, [])
  return landed
}
