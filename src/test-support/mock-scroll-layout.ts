/**
 * @fileoverview Test helper that lays an element out inside its scroll
 * container, which happy-dom, doing no layout, measures as all zeros.
 */

import { isPlainObject } from 'es-toolkit'
import { vi } from 'vitest'

/** Where the element sits in its scroll container, in px. */
export interface MockScrollLayoutState {
  /** How far down the container's content the element starts */
  top: number
  /** The element's own height */
  height: number
  /** How much of the container shows at once */
  visibleHeight: number
}

/**
 * Lays `el` out `layout.top` down `scrollParent`'s content, with the container
 * at the top of the viewport, so code that works out where to scroll it, like
 * `useScrollIntoView`, has something to measure.
 *
 * `layout` is read on every measure, so a case can change it to move or
 * resize the element, and setting `scrollParent.scrollTop` moves the element
 * as a real scroll would. Returns `scrollTo`, a spy on the container's own: a
 * smooth scroll is recorded but never runs, so a case sets `scrollTop` to
 * wherever it should have got to, and any other goes through.
 */
export const mockScrollLayout = (
  scrollParent: HTMLElement,
  el: Element,
  layout: MockScrollLayoutState
) => {
  vi.spyOn(scrollParent, 'clientHeight', 'get').mockImplementation(
    () => layout.visibleHeight
  )
  vi.spyOn(scrollParent, 'getBoundingClientRect').mockImplementation(() =>
    DOMRect.fromRect({ height: layout.visibleHeight })
  )
  vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() =>
    DOMRect.fromRect({
      y: layout.top - scrollParent.scrollTop,
      height: layout.height,
    })
  )
  const scrollTo = vi
    .spyOn(scrollParent, 'scrollTo')
    .mockImplementation(function (this: Element, ...args: unknown[]) {
      // happy-dom has no smooth scroll to run.
      const [options] = args
      if (isPlainObject(options) && options.behavior === 'smooth') return
      // Off the prototype rather than a saved copy of the container's own,
      // which a second call here would already have replaced with this spy.
      Reflect.apply(Element.prototype.scrollTo, this, args)
    })
  return { scrollTo }
}
