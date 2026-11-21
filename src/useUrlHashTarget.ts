/**
 * @fileoverview Hook that scrolls to the element a URL's `#` names once an app
 * has rendered it, and returns its target once the page has landed there.
 */

import { useEffect, useState } from 'react'

import { parseUrlHash, type UrlHashTarget } from './utils'

/**
 * The target of the URL's `#`, like `#pricing` or `#pricing?plan=pro`, once
 * the page has landed on it; `undefined` until then, or for no `#`.
 *
 * A browser scrolls to a `#` as the page loads, before a client-rendered app
 * has drawn its element, so finds nothing. This jumps there once the app has
 * rendered, a frame after its first effects, by when layout effects that
 * resize what's above it have settled. It jumps again when the `#` changes to
 * one with parameters, which names no element the browser could find itself,
 * and leaves a plain `#id` it changes to, like an in-page link's, to the
 * browser's own scroll, returning that at once.
 *
 * It returns a target it jumped to a frame after the jump, past the jump's
 * scroll event, so a tooltip or popover opened on it, which Radix and others
 * close on any scroll that moves their trigger, stays open. The jump is
 * instant, and keeps to the element's `scroll-margin` and its scroll
 * container's `scroll-padding`. Call it once, near the app's root: each caller
 * jumps.
 */
export const useUrlHashTarget = () => {
  const [landed, setLanded] = useState<UrlHashTarget>()
  useEffect(() => {
    let frame: number | undefined
    const land = (target: UrlHashTarget) => {
      frame = requestAnimationFrame(() => {
        // Instant, as the browser's own would be, rather than gliding past
        // everything above it.
        document
          .getElementById(target.id)
          ?.scrollIntoView({ behavior: 'instant' })
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
