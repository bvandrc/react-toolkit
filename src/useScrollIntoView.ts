/**
 * @fileoverview Hook that scrolls an element to the top of its nearest
 * scrollable ancestor, or just far enough to show all of it, in one jump or
 * animated, holding that position against CSS scroll anchoring for as long as
 * a layout shift nearby (a toolbar expanding under the element, say) might
 * still trigger it.
 */

import { useCallback, useEffect, useRef } from 'react'

import { useTimer } from './useTimer'
import {
  findScrollableAncestor,
  getTargetScrollTop,
  type ScrollBlock,
} from './utils'

/**
 * How long to suppress the scroll container's own scroll anchoring after
 * the one write below -- long enough to cover a layout shift nearby that's
 * still settling (a CSS transition resizing something under the element,
 * say), since anchoring reacting to that shift, not this hook, is what
 * actually moves `scrollTop` afterward. 300ms comfortably covers the
 * longest transition this fires alongside (the RTE toolbar's own 150ms
 * expand/collapse) plus a buffer for its layout to settle.
 */
const ANCHOR_SUPPRESSION_MS = 300

/** Above a single device pixel, so a sub-pixel gap doesn't trigger a write that rounds away to nothing. */
const SNAP_PX = 1

/**
 * The longest an animated scroll keeps anchoring off, for a browser that never
 * says it finished -- one without `scrollend`. Past any browser's own smooth
 * scroll, which runs a few hundred ms.
 */
const SMOOTH_SCROLL_MAX_MS = 1000

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * How a scroll gets there.
 *
 * `'instant'` jumps. `'smooth'` animates it, or jumps anyway when the user
 * prefers reduced motion.
 */
export type ScrollIntoViewBehavior = Extract<
  ScrollBehavior,
  'instant' | 'smooth'
>

export interface ScrollIntoViewCallOptions {
  /** The hook's `defaultBehavior` by default. */
  behavior?: ScrollIntoViewBehavior
  /**
   * Called once the element is where `block` asks.
   *
   * Straight away for an instant scroll, or when a smooth one ends; never
   * for one cancelled first.
   */
  onScrollEnd?: () => void
}

/**
 * Returns `scrollIntoView`, which scrolls `el` within its scroll container as
 * `block` asks, and `cancel`, which undoes anything a call still has pending
 * (also run automatically on unmount).
 *
 * Each scroll goes as `defaultBehavior` asks, `'instant'` by default, unless
 * its call says otherwise. Calling `scrollIntoView` again, on the same or a
 * different element, cancels anything still pending first. Cancelling an
 * animated scroll stops it where it is.
 */
export const useScrollIntoView = (
  defaultBehavior: ScrollIntoViewBehavior = 'instant'
) => {
  const restoreTimer = useTimer()
  const restoreAnchorRef = useRef<(() => void) | null>(null)
  const stopScrollRef = useRef<(() => void) | null>(null)

  const cancel = useCallback(() => {
    stopScrollRef.current?.()
    restoreAnchorRef.current?.()
  }, [])

  useEffect(() => cancel, [cancel])

  const scrollIntoView = useCallback(
    (
      el: HTMLElement,
      block: ScrollBlock,
      {
        behavior = defaultBehavior,
        onScrollEnd,
      }: ScrollIntoViewCallOptions = {}
    ) => {
      cancel()
      const scrollParent = findScrollableAncestor(el)
      // CSS scroll anchoring reacting to a layout shift this scroll is
      // itself alongside (an expanding toolbar under `el`, say) is what
      // moves `scrollTop` again after the one write below -- fighting that
      // continuously produced a visible overshoot-and-settle. Anchoring
      // exists to keep *unrelated* content from jumping under a reader;
      // there's nothing unrelated here for it to protect, since this
      // container's position is exactly what's being managed, so it's
      // turned off for the window that shift needs to finish in.
      const previousAnchor = scrollParent.style.overflowAnchor
      scrollParent.style.overflowAnchor = 'none'
      // The page's own scroll ends on the document, not its scrolling element.
      const scrollEndTarget =
        scrollParent === document.scrollingElement ? document : scrollParent
      const restoreAnchor = () => {
        restoreTimer.clear()
        stopScrollRef.current = null
        scrollEndTarget.removeEventListener('scrollend', finishSmoothScroll)
        scrollParent.style.overflowAnchor = previousAnchor
        restoreAnchorRef.current = null
      }
      const finishSmoothScroll = () => {
        restoreAnchor()
        onScrollEnd?.()
      }
      restoreAnchorRef.current = restoreAnchor

      const target = getTargetScrollTop(el, block, scrollParent)
      const smooth =
        behavior === 'smooth' &&
        !window.matchMedia(REDUCED_MOTION_QUERY).matches
      // Writing `scrollTop` at all -- even to the value it's already at --
      // is a live scroll action, not a guaranteed no-op: with anchoring
      // suppressed but a transition still resizing something nearby, an
      // unnecessary write is its own opening for the browser's layout
      // machinery to move it anyway.
      if (Math.abs(target - scrollParent.scrollTop) <= SNAP_PX) {
        restoreTimer.start(restoreAnchor, ANCHOR_SUPPRESSION_MS)
        onScrollEnd?.()
      } else if (!smooth) {
        scrollParent.scrollTop = target
        restoreTimer.start(restoreAnchor, ANCHOR_SUPPRESSION_MS)
        onScrollEnd?.()
      } else {
        // The browser's own smooth scroll, rather than one stepped through
        // `scrollTop` each frame, runs off the main thread where it can, so
        // work on the page alongside it (an iframe loading, say) doesn't
        // make it stutter. Anchoring stays off until it ends.
        scrollParent.scrollTo({ top: target, behavior: 'smooth' })
        scrollEndTarget.addEventListener('scrollend', finishSmoothScroll)
        // Scrolling instantly to where it already is cuts a smooth scroll short.
        stopScrollRef.current = () =>
          scrollParent.scrollTo({
            top: scrollParent.scrollTop,
            behavior: 'instant',
          })
        restoreTimer.start(finishSmoothScroll, SMOOTH_SCROLL_MAX_MS)
      }
    },
    [cancel, restoreTimer, defaultBehavior]
  )

  return { scrollIntoView, cancel }
}
