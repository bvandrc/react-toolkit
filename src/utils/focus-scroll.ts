/**
 * @fileoverview Waiting out the scroll that focusing an element brings.
 */

import { isOnFixedLayer } from './fixed-layer'
import { isInView } from './layout'
import { SMOOTH_SCROLL_MAX_MS } from './scroll-timing'

/** The nodes `node` sits inside, out to the document, counting a shadow root's host as one. */
const getComposedAncestors = (node: Node) => {
  const ancestors = new Set<EventTarget>()
  for (
    let current: Node | null = node.parentNode;
    current;
    current = current instanceof ShadowRoot ? current.host : current.parentNode
  ) {
    ancestors.add(current)
  }
  return ancestors
}

/**
 * Calls `callback` once the scroll that focusing `element` brings has
 * finished, and returns a function that calls it off.
 *
 * The browser scrolls a focused element into view, in its scroll container and
 * the page, over many frames where `scroll-behavior` is smooth. One already in
 * view waits a frame, for the scroll event of any instant scroll that brought
 * it there; one out of view waits for `scrollend` from everything moving it,
 * and then for the frame after, in case another starts, or a second at most.
 * A scroll elsewhere on the page, like a sticky bar scrolling its own links
 * along, ends without calling back.
 */
export const onFocusScrollEnd = (
  element: HTMLElement,
  callback: () => void
) => {
  if (isInView(element)) {
    const frame = requestAnimationFrame(callback)
    return () => cancelAnimationFrame(frame)
  }
  // The scrolls under way that move the element: the page's, whose events
  // fire on the document, unless the element sits on a fixed layer, like a
  // dialog, and any container's around it.
  const scrolling = new Set<EventTarget>()
  const pageMovesElement = !isOnFixedLayer(element)
  // Taken once, so a scroll event costs a lookup, and a container still counts
  // if a render moves the element out of it mid-scroll.
  const ancestors = getComposedAncestors(element)
  /** Whether a scroll of `target` moves the element. */
  const movesElement = (target: EventTarget | null): target is EventTarget =>
    target === document
      ? pageMovesElement
      : target !== null && ancestors.has(target)
  let frame: number | undefined
  const trackScroll = ({ target }: Event) => {
    if (movesElement(target)) scrolling.add(target)
  }
  const endScroll = ({ target }: Event) => {
    if (!movesElement(target)) return
    scrolling.delete(target)
    if (scrolling.size > 0) return
    // A browser can run nested scrolls in turn, so wait out the next frame's
    // scroll steps for one to start: `scrollend` fires ahead of this frame's.
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (scrolling.size === 0) finish()
      })
    })
  }
  const finish = () => {
    cancel()
    callback()
  }
  const timeout = setTimeout(finish, SMOOTH_SCROLL_MAX_MS)
  // Captured, since a scroll container's `scroll` and `scrollend` don't bubble
  // up to the window the way the page's own do.
  window.addEventListener('scroll', trackScroll, { capture: true })
  window.addEventListener('scrollend', endScroll, { capture: true })
  const cancel = () => {
    clearTimeout(timeout)
    if (frame !== undefined) cancelAnimationFrame(frame)
    window.removeEventListener('scroll', trackScroll, { capture: true })
    window.removeEventListener('scrollend', endScroll, { capture: true })
  }
  return cancel
}
