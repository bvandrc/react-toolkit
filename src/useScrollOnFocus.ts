/**
 * @fileoverview Hook that scrolls a focused element within its scroll
 * container -- to the top, or just far enough to show all of it -- and keeps
 * it there while it stays focused and changes size (an editor's toolbar
 * expanding, say). On touch devices, it also recovers the scroll position the
 * on-screen keyboard leaves behind once it closes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  type ScrollIntoViewBehavior,
  useScrollIntoView,
} from './useScrollIntoView'
import { useTimer } from './useTimer'
import { useVisualViewportListener } from './useVisualViewportListener'
import {
  findScrollableAncestor,
  getVisibleBounds,
  isTouchDevice,
  type ScrollBlock,
} from './utils'

/** How long to let the keyboard's dismissal animation settle before resyncing. */
const KEYBOARD_CLOSE_MS = 350

/** How far `el`'s top sits below the visible top of its scroll container. */
const getOffsetInScrollParent = (el: HTMLElement) =>
  el.getBoundingClientRect().top -
  getVisibleBounds(findScrollableAncestor(el)).top

/**
 * Focus and blur handlers to spread onto the element to keep where `block` puts it.
 *
 * Scrolls there as `scrollBehavior` asks, `'instant'` by default.
 */
export const useScrollOnFocus = (
  block: ScrollBlock,
  scrollBehavior: ScrollIntoViewBehavior = 'instant'
) => {
  const [focusedEl, setFocusedEl] = useState<HTMLElement | null>(null)
  // Where the element sat after this hook last scrolled it, which is where
  // the keyboard-dismissal recovery puts it back.
  const settledOffsetRef = useRef(0)
  const resyncTimer = useTimer()
  const { scrollIntoView, cancel } = useScrollIntoView(scrollBehavior)

  const keepInView = useCallback(
    (el: HTMLElement) => {
      scrollIntoView(el, block, {
        // Only once it lands: a smooth scroll is still on its way when this
        // call returns.
        onScrollEnd: () => {
          settledOffsetRef.current = getOffsetInScrollParent(el)
        },
      })
    },
    [scrollIntoView, block]
  )

  const restoreSettledOffset = useCallback((el: HTMLElement) => {
    const scrollParent = findScrollableAncestor(el)
    scrollParent.scrollTop +=
      getOffsetInScrollParent(el) - settledOffsetRef.current
  }, [])

  // The keyboard shrinks the viewport only after focus, which can cut off a
  // field that was fully visible when it was first focused, or extend the
  // scroll range past what a scroll to the top had available then. Only the
  // visual viewport shrinks for it on iOS -- the window keeps its size.
  useVisualViewportListener('resize', () => {
    if (focusedEl) keepInView(focusedEl)
  })

  // Growing after focus (a toolbar expanding, more lines typed) can push the
  // field's bottom out of view.
  useEffect(() => {
    if (!focusedEl) return
    const observer = new ResizeObserver(() => keepInView(focusedEl))
    observer.observe(focusedEl)
    return () => observer.disconnect()
  }, [focusedEl, keepInView])

  return {
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      resyncTimer.clear()
      const el = event.currentTarget
      setFocusedEl(el)
      keepInView(el)
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      setFocusedEl(null)
      cancel()
      // The rest is recovering from the on-screen keyboard specifically,
      // which comes with a touch screen whatever its width.
      if (!isTouchDevice()) return
      // Focus landing on another control means the keyboard is staying up, so
      // there is no dismissal to recover from -- and re-scrolling would yank
      // the form out from under whatever the user just moved to.
      if (event.relatedTarget) return
      // iOS scrolls this container itself to keep the caret clear of the
      // keyboard, then on dismissal leaves it *rendered* scrolled while its
      // `scrollTop` reads where it started. Taps and popovers go by the latter,
      // so until something scrolls the container again they land on whatever
      // the unscrolled layout had under them -- a field or two up the form.
      // Scrolling it ourselves once the keyboard is gone puts the two back in
      // agreement, and moves nothing where they never diverged. Once now, so a
      // tap during the dismissal animation already lands right, and once after
      // it, since iOS can scroll the container again on the way down.
      const el = event.currentTarget
      restoreSettledOffset(el)
      resyncTimer.start(() => restoreSettledOffset(el), KEYBOARD_CLOSE_MS)
    },
  }
}
