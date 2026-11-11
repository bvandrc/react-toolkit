/**
 * @fileoverview Helpers for where elements sit on screen, and where scrolling
 * them puts them.
 */

import { SMOOTH_SCROLL_MAX_MS } from './scroll-timing'

/** An x and y pair, in px. */
export interface Point {
  x: number
  y: number
}

/**
 * The nearest ancestor of `node` whose own overflow scrolls, or the document's
 * scrolling element when none does.
 */
export const findScrollableAncestor = (node: HTMLElement): HTMLElement => {
  let el = node.parentElement
  while (el) {
    const { overflowY } = getComputedStyle(el)
    if (overflowY === 'auto' || overflowY === 'scroll') return el
    el = el.parentElement
  }
  return (
    (document.scrollingElement as HTMLElement | null) ??
    document.documentElement
  )
}

/** A scroll padding's computed value in px, where a percentage is of the scrollport's height. */
const toScrollPaddingPx = (value: string, scrollportHeight: number) => {
  // `auto`, and the empty value a DOM that doesn't lay out leaves, are none.
  // So is a `calc()` mixing a percentage and a length, which the browser
  // keeps unresolved; a plain length or percentage, as Tailwind's
  // `scroll-pt-*` gives, comes through.
  const length = Number.parseFloat(value) || 0
  return value.endsWith('%') ? (length / 100) * scrollportHeight : length
}

/**
 * The visible top and bottom of `scrollParent`, in viewport coordinates.
 *
 * Leaves out its scroll padding, which marks what a sticky header or footer
 * covers, as the browser's own `scrollIntoView` does.
 */
export const getVisibleBounds = (scrollParent: HTMLElement) => {
  let top: number
  let bottom: number
  // The document's scrolling element measures its whole scrolled height, not
  // the part of it on screen.
  if (scrollParent === document.scrollingElement) {
    top = 0
    bottom = window.innerHeight
  } else {
    top = scrollParent.getBoundingClientRect().top + scrollParent.clientTop
    bottom = top + scrollParent.clientHeight
  }
  const { scrollPaddingTop, scrollPaddingBottom } =
    getComputedStyle(scrollParent)
  const height = bottom - top
  return {
    top: top + toScrollPaddingPx(scrollPaddingTop, height),
    bottom: bottom - toScrollPaddingPx(scrollPaddingBottom, height),
  }
}

/** Whether `el`, or an ancestor, is `position: fixed`, which keeps it still as the page scrolls. */
const isOnFixedLayer = (el: HTMLElement) => {
  // A fixed element inside a transformed or filtered ancestor scrolls with
  // the page all the same, which this doesn't catch; dialogs portal to the
  // body, out of any such ancestor.
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (getComputedStyle(node).position === 'fixed') return true
  }
  return false
}

/** Where to put an element scrolled into view, named as `Element.scrollIntoView`'s `block` names them. */
export type ScrollBlock = Extract<
  ScrollLogicalPosition,
  'start' | 'center' | 'nearest'
>

/**
 * The `scrollTop` that puts `el` where `block` asks, within `scrollParent` --
 * by default, its nearest scrollable ancestor.
 *
 * `start` aligns its top edge. `center` centers it, or aligns its top edge
 * when it's too tall to fit. `nearest` shows all of it with the least
 * movement: unchanged when it's already fully visible, its bottom edge
 * aligned when it's cut off below, and its top edge aligned when it's cut off
 * above or too tall to fit. An element on a fixed layer, which the page's
 * scroll doesn't move, leaves the page where it is, as the browser's own
 * `scrollIntoView` does.
 */
export const getTargetScrollTop = (
  el: HTMLElement,
  block: ScrollBlock,
  scrollParent: HTMLElement = findScrollableAncestor(el)
) => {
  if (scrollParent === document.scrollingElement && isOnFixedLayer(el)) {
    return scrollParent.scrollTop
  }
  const rect = el.getBoundingClientRect()
  const visible = getVisibleBounds(scrollParent)
  const tooTall = rect.bottom - rect.top > visible.bottom - visible.top
  if (block === 'center' && !tooTall) {
    const offCenter =
      (rect.top + rect.bottom) / 2 - (visible.top + visible.bottom) / 2
    return scrollParent.scrollTop + offCenter
  }
  if (block === 'start' || rect.top < visible.top || tooTall) {
    return scrollParent.scrollTop + (rect.top - visible.top)
  }
  if (rect.bottom > visible.bottom) {
    return scrollParent.scrollTop + (rect.bottom - visible.bottom)
  }
  return scrollParent.scrollTop
}

/**
 * How much of the screen is free above and below `el`, in px.
 *
 * Measured against the visual viewport where there is one, so the part an
 * open on-screen keyboard covers doesn't count as free.
 */
export const getRoomAround = (el: Element) => {
  const { top, bottom } = el.getBoundingClientRect()
  const viewport = window.visualViewport
  // The visual viewport sits `offsetTop` down the layout viewport, which is
  // what `getBoundingClientRect` measures against.
  const visibleTop = viewport?.offsetTop ?? 0
  const visibleBottom = visibleTop + (viewport?.height ?? window.innerHeight)
  return { above: top - visibleTop, below: visibleBottom - bottom }
}

/** How tall `el`'s content is, inside its padding and border. */
export const getContentHeight = (el: HTMLElement) => {
  const { paddingTop, paddingBottom } = getComputedStyle(el)
  // A DOM that doesn't lay out may leave it empty, which is no padding.
  const padding =
    (Number.parseFloat(paddingTop) || 0) +
    (Number.parseFloat(paddingBottom) || 0)
  return el.clientHeight - padding
}

/**
 * Whether all of `el` is on screen: inside the window, and inside the visible
 * part of its scroll container, neither counting what their scroll padding
 * marks off.
 *
 * The page's scroll padding counts only for an element that scrolls with the
 * page, as the browser's own does: one on a fixed layer, like a dialog, sits
 * over the header that padding keeps clear of.
 */
export const isInView = (el: HTMLElement) => {
  const { top, right, bottom, left } = el.getBoundingClientRect()
  const scrollParent = findScrollableAncestor(el)
  const page = isOnFixedLayer(el)
    ? { top: 0, bottom: window.innerHeight }
    : getVisibleBounds(
        (document.scrollingElement as HTMLElement | null) ??
          document.documentElement
      )
  // With no scroll container of its own, a fixed element's is the page, which
  // doesn't move it.
  const container =
    scrollParent === document.scrollingElement
      ? page
      : getVisibleBounds(scrollParent)
  return (
    top >= Math.max(container.top, page.top) &&
    bottom <= Math.min(container.bottom, page.bottom) &&
    left >= 0 &&
    right <= window.innerWidth
  )
}

/**
 * Calls `callback` once the scroll that focusing `element` brings has
 * finished, and returns a function that calls it off.
 *
 * The browser scrolls a focused element into view, in its scroll container and
 * the page, over many frames where `scroll-behavior` is smooth. One already in
 * view waits a frame, for the scroll event of any instant scroll that brought
 * it there; one out of view waits for `scrollend` from everything moving it,
 * or a second at most. A scroll elsewhere on the page, like a sticky bar
 * scrolling its own links along, ends without calling back.
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
  // fire on the document, and any container's around it.
  const scrolling = new Set<EventTarget>()
  /** Whether a scroll of `target` moves the element. */
  const movesElement = (target: EventTarget | null) =>
    target === document || (target instanceof Node && target.contains(element))
  const trackScroll = ({ target }: Event) => {
    if (target && movesElement(target)) scrolling.add(target)
  }
  const endScroll = ({ target }: Event) => {
    if (!(target && movesElement(target))) return
    scrolling.delete(target)
    // Nested scrolls end apart, so the element only stops once the last does.
    if (scrolling.size === 0) finish()
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
    window.removeEventListener('scroll', trackScroll, { capture: true })
    window.removeEventListener('scrollend', endScroll, { capture: true })
  }
  return cancel
}
