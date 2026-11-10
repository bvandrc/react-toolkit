/**
 * @fileoverview Layout stubs for this repo's own tests of scrolling code, since
 * happy-dom does no layout. Unlike `src/test-support`, not published.
 */

/** How much of a mocked scroll container shows at once, unless a case says otherwise. */
export const VISIBLE_HEIGHT = 200

/** Where `mockScrollLayout` puts the element inside its scroll container. */
export interface ScrollLayout {
  /** How far the element sits below the scroll container's content top. */
  top: number
  height: number
  /** @default VISIBLE_HEIGHT */
  visibleHeight?: number
}

/**
 * Stubs layout so every element but `scrollParent` sits as `layout` says inside
 * it, moving up as it scrolls.
 *
 * `layout` is read live, so a case can resize the element, or the visible part
 * of its container, by changing it.
 */
export const mockScrollLayout = (
  scrollParent: HTMLElement,
  layout: ScrollLayout
) => {
  vi.spyOn(scrollParent, 'clientHeight', 'get').mockImplementation(
    () => layout.visibleHeight ?? VISIBLE_HEIGHT
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      if (this === scrollParent) return { top: 0 } as DOMRect
      const top = layout.top - scrollParent.scrollTop
      return { top, bottom: top + layout.height } as DOMRect
    }
  )
}
