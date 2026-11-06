/**
 * @fileoverview Helpers for where elements sit on screen, and where scrolling
 * them puts them.
 */

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

/** The visible top and bottom of `scrollParent`, in viewport coordinates. */
export const getVisibleBounds = (scrollParent: HTMLElement) => {
  // The document's scrolling element measures its whole scrolled height, not
  // the part of it on screen.
  if (scrollParent === document.scrollingElement) {
    return { top: 0, bottom: window.innerHeight }
  }
  const top = scrollParent.getBoundingClientRect().top + scrollParent.clientTop
  return { top, bottom: top + scrollParent.clientHeight }
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
 * above or too tall to fit.
 */
export const getTargetScrollTop = (
  el: HTMLElement,
  block: ScrollBlock,
  scrollParent: HTMLElement = findScrollableAncestor(el)
) => {
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
