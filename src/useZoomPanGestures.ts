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
  /** Called for a mouse's drag, a sideways scroll, or two pinching fingers moved together, with how far to move the span, in the value's units */
  onPan?: (delta: number) => void
}

/**
 * Zooms and pans whatever `target` shows along one axis: a wheel or a pinch
 * zooms around the point under it, and a mouse's drag, a sideways scroll, or
 * two fingers moved together pans.
 *
 * Takes the wheel and the pinch from the page, which would otherwise scroll or
 * zoom it, while there's an `onZoom` to call. A finger's drag is left alone,
 * for the target's own pointer handlers. Returns a ref that's true while two
 * fingers pinch, so those handlers can ignore the moves.
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
      onPinch: ({ event, origin: [x], offset: [scale], first, last, memo }) => {
        event.preventDefault()
        pinchingRef.current = !last
        // The scale and point between the fingers at the event before.
        const previous: { scale: number; x: number } = first
          ? { scale, x }
          : memo
        if (!first && onZoom) {
          onZoom(getValueAt(x), previous.scale / scale)
          // Moving both fingers together pans, the way a drag does.
          onPan?.((previous.x - x) * valuePerPx)
        }
        return { scale, x }
      },
      // A mouse's drag pans; a finger's is left to the target's own handlers.
      onDrag: ({ event, delta: [dx], pinching }) => {
        if (
          !pinching &&
          event instanceof PointerEvent &&
          event.pointerType === 'mouse'
        ) {
          onPan?.(-dx * valuePerPx)
        }
      },
    },
    // Not passive, so it can stop the page from scrolling and zooming.
    { target, eventOptions: { passive: false } }
  )
  return pinchingRef
}
