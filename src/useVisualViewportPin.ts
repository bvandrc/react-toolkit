/**
 * @fileoverview Pins a `fixed`, full-viewport element to the mobile *visual*
 * viewport, which the layout viewport -- and anything `fixed`-positioned
 * against it -- doesn't track.
 */

import { useCallback, useEffect } from 'react'
import { useEventListener } from 'usehooks-ts'

import { useVisualViewportListener } from './useVisualViewportListener'

/** Undoes what pinning set on `el`. */
const unpin = (el: HTMLElement) => {
  el.style.transform = ''
  el.style.height = ''
}

/**
 * Give the returned callback ref to a `fixed inset-0` element. While
 * `enabled`, it keeps that element matched to `window.visualViewport`:
 *
 * - resets any page scroll iOS injects to keep a moved caret above the
 *   keyboard, since a `fixed` element has nothing legitimate to scroll for;
 * - counter-translates the element by `visualViewport.offsetTop`, the drift
 *   between the visual and layout viewports (e.g. under pinch zoom);
 * - caps the element's height to `visualViewport.height`, so its own
 *   overflow can still reach content the keyboard would otherwise cover --
 *   the layout viewport, and this element with it, doesn't shrink when the
 *   keyboard opens, only the visual one does.
 *
 * @example
 * ```tsx
 * // `sheetRef` is kept pointing at the sheet; attach the returned ref, not it.
 * const sheetRef = useRef<HTMLElement | null>(null)
 * const pinRef = useVisualViewportPin(sheetRef, open)
 *
 * return (
 *   <div ref={pinRef} className="fixed inset-0 overflow-y-auto">
 *     {children}
 *   </div>
 * )
 * ```
 */
export const useVisualViewportPin = (
  ref: React.MutableRefObject<HTMLElement | null>,
  enabled: boolean
) => {
  const reposition = useCallback(() => {
    if (!enabled) return
    window.scrollTo(0, 0)
    const viewport = window.visualViewport
    const el = ref.current
    if (!el) return
    el.style.transform = viewport?.offsetTop
      ? `translateY(${viewport.offsetTop}px)`
      : ''
    el.style.height = viewport ? `${viewport.height}px` : ''
  }, [enabled, ref])

  // A portal (Radix's included) may attach the element after this hook's own
  // effect below has run -- correct its position when the node actually
  // arrives, not only on a later scroll or resize. Detaching (`node` is
  // `null`) can likewise happen before the effect's own cleanup runs -- e.g.
  // React nulling the ref ahead of an unmount triggered by the same
  // `enabled` change -- so the outgoing node's positioning is cleared here
  // too, rather than relying on `ref.current` still pointing at it there.
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node && ref.current) unpin(ref.current)
      ref.current = node
      if (node) reposition()
    },
    [ref, reposition]
  )

  // Subscribed whether or not `enabled`, since `reposition` already does
  // nothing while it isn't.
  useVisualViewportListener('resize', reposition)
  useVisualViewportListener('scroll', reposition)
  useEventListener('scroll', reposition, undefined, { passive: true })

  useEffect(() => {
    if (!enabled) return
    reposition()
    return () => {
      if (ref.current) unpin(ref.current)
    }
  }, [enabled, reposition, ref])

  return setRef
}
