/**
 * @fileoverview Hook that zooms and pans something along one axis with the
 * wheel, a trackpad, a mouse's drag, or two fingers.
 */

import { useRef } from 'react'
import { useGesture } from '@use-gesture/react'

// How far a wheel zooms per unit of its `deltaY`: about a fifth per notch.
const WHEEL_ZOOM_RATE = 0.002

/** How much a wheel's turn scales a span: under 1, zooming in, for a negative `deltaY`, and over 1, zooming out, for a positive one. */
const getWheelZoomFactor = (deltaY: number) =>
  Math.exp(deltaY * WHEEL_ZOOM_RATE)

export type ZoomPanGestures = {
  /** The value under a pointer at `clientX`, which a zoom is anchored at */
  getValueAt: (clientX: number) => number
  /** How much of the value one pixel across the target covers */
  valuePerPx: number
  /** Called for a wheel turned, or a pinch, with the value under it and how much to scale the span by; without it, the page scrolls and zooms as usual */
  onZoom?: (anchor: number, factor: number) => void
  /** Called for a mouse's drag, with how far to move the span, in the value's units; and, while there's an `onZoom`, for a sideways scroll, or a pinch's fingers moved together */
  onPan?: (delta: number) => void
}

/**
 * Zooms and pans whatever `target` shows along one axis: a wheel or a pinch
 * zooms around the point under it, and a mouse's drag, a sideways scroll, or
 * two fingers moved together pans.
 *
 * Takes the wheel and the pinch from the page, which would otherwise scroll or
 * zoom it, while there's an `onZoom` to call. A finger's drag is left alone,
 * for the target's own pointer handlers. Returns a ref that's true while it
 * takes a pinch, a trackpad's or two fingers', so those handlers can ignore
 * the moves. Give the target `touch-action: none`, or a touchscreen pinches
 * and scrolls the page as well, which no handler can stop.
 */
export const useZoomPanGestures = (
  target: React.RefObject<Element | null>,
  { getValueAt, valuePerPx, onZoom, onPan }: ZoomPanGestures
) => {
  const pinchingRef = useRef(false)
  useGesture(
    {
      onWheel: ({ event, delta: [dx, dy] }) => {
        // A trackpad's pinch arrives as a wheel with ctrl held, for onPinch.
        if (!onZoom || event.ctrlKey) {
          return
        }
        // Zooms or pans rather than scrolling the page beneath.
        event.preventDefault()
        // A sideways scroll, like a trackpad's, pans.
        if (Math.abs(dx) > Math.abs(dy)) {
          onPan?.(dx * valuePerPx)
        } else {
          onZoom(getValueAt(event.clientX), getWheelZoomFactor(dy))
        }
      },
      // A trackpad's pinch, in any browser, as well as two fingers'.
      onPinch: ({ event, origin: [x], offset: [scale], last, memo }) => {
        event.preventDefault()
        pinchingRef.current = !last
        // The scale and point between the fingers at the event before, which
        // the pinch's first event has none of.
        const previous: { scale: number; x: number } | undefined = memo
        if (previous && onZoom) {
          onZoom(getValueAt(x), previous.scale / scale)
          // Moving both fingers together pans, the way a drag does.
          onPan?.((previous.x - x) * valuePerPx)
        }
        return { scale, x }
      },
      // A mouse's drag pans; a finger's is left to the target's own handlers.
      onDrag: ({ event, delta: [dx], pinching }) => {
        // Read off the event rather than `instanceof PointerEvent`, which a
        // DOM without the global throws on, and which misses the mouse events
        // the gesture falls back to where pointer events aren't supported.
        const isMouse =
          'pointerType' in event
            ? event.pointerType === 'mouse'
            : event.type.startsWith('mouse')
        if (!pinching && isMouse) {
          onPan?.(-dx * valuePerPx)
        }
      },
    },
    {
      target,
      // Not passive, so it can stop the page from scrolling and zooming.
      eventOptions: { passive: false },
      // Off without an `onZoom`, so the page zooms as usual: the gesture takes
      // a pinch from the page whatever its handler does with it.
      pinch: { enabled: onZoom !== undefined },
    }
  )
  return pinchingRef
}
