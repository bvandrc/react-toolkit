/**
 * @fileoverview Press-and-hold gesture: fires `onHold` once a pointer has been
 * held on an element without moving, and reports whether a press is
 * currently building so the caller can show it. Mouse and touch both, since a
 * hold is the same gesture either way.
 */

import { useRef, useState } from 'react'
import type { RequireAtLeastOne } from 'type-fest'

import { useTimer } from './useTimer'
import { clientPointOf, type Point } from './utils'

type PressEvent = React.MouseEvent | React.TouchEvent

/** How far a press may move before it stops being one. */
type MoveThreshold = number | RequireAtLeastOne<Point>

/** Whether the press has moved further than `moveThreshold` allows. */
const hasMovedPast = (moved: Point, moveThreshold: MoveThreshold): boolean => {
  if (typeof moveThreshold === 'number')
    return Math.hypot(moved.x, moved.y) > moveThreshold

  // An axis the caller left out is one it has no threshold for, so no movement
  // along it ever spends one.
  const { x = Number.POSITIVE_INFINITY, y = Number.POSITIVE_INFINITY } =
    moveThreshold
  return moved.x > x || moved.y > y
}

interface UsePressHoldOptions {
  /** Run once the press has been held for `holdDuration`. */
  onHold: () => void
  /**
   * Milliseconds the press must be held.
   * @default 800
   */
  holdDuration?: number
  /**
   * Pointer movement, in px, that cancels the press as a scroll or a swipe.
   *
   * A number is the distance moved in any direction. Naming either axis
   * gives that one its own threshold, measured on its own, and leaves the other
   * unbounded -- `{ y: 10 }` for an element that only scrolls up and down.
   * @default 10
   */
  moveThreshold?: MoveThreshold
  /**
   * Selector for descendants whose own presses never start a hold.
   *
   * A press that lands on one of these, or inside one, belongs to that control
   * (e.g. `'button'` for a card that holds buttons of its own).
   */
  ignoreSelector?: string
}

type PressHoldHandlers = Required<
  Pick<
    React.DOMAttributes<HTMLElement>,
    | 'onMouseDown'
    | 'onMouseUp'
    | 'onMouseLeave'
    | 'onMouseMove'
    | 'onTouchStart'
    | 'onTouchMove'
    | 'onTouchEnd'
    | 'onTouchCancel'
  >
>

interface UsePressHold {
  /** Whether a press is being held right now, having neither fired nor cancelled. */
  isHolding: boolean
  /** Spread onto the element the gesture is held on. */
  handlers: PressHoldHandlers
}

/**
 * Detects a press held on an element, for a long-press action.
 *
 * The press cancels the moment it stops being one: movement past `moveThreshold`
 * (the gesture was a scroll or a swipe), the pointer lifting or leaving, the OS
 * taking the touch over, or the component unmounting. So `onHold` only ever
 * runs for a press that was still down, still where it started, for the whole
 * duration.
 *
 * @example
 * ```tsx
 * const { isHolding, handlers } = usePressHold({
 *   onHold: () => startSelecting(card.id),
 *   // The card's own buttons keep their presses.
 *   ignoreSelector: 'button',
 * })
 *
 * return (
 *   <li {...handlers} data-holding={isHolding}>
 *     {card.title}
 *   </li>
 * )
 * ```
 */
export const usePressHold = ({
  onHold,
  holdDuration = 800,
  moveThreshold = 10,
  ignoreSelector,
}: UsePressHoldOptions): UsePressHold => {
  const [isHolding, setIsHolding] = useState(false)
  const holdTimer = useTimer()
  const originRef = useRef<Point | null>(null)

  /** Forgets the press, whether it became a hold or never got there. */
  const endPress = () => {
    originRef.current = null
    setIsHolding(false)
  }

  const cancel = () => {
    holdTimer.clear()
    endPress()
  }

  const start = (e: PressEvent) => {
    if (ignoreSelector && (e.target as HTMLElement).closest(ignoreSelector))
      return

    const origin = clientPointOf(e)
    if (!origin) return

    originRef.current = origin
    setIsHolding(true)
    holdTimer.start(() => {
      endPress()
      onHold()
    }, holdDuration)
  }

  const trackMove = (e: PressEvent) => {
    const origin = originRef.current
    const point = clientPointOf(e)
    // No origin means no press is down, so there is nothing to cancel.
    if (!origin || !point) return

    const moved = {
      x: Math.abs(point.x - origin.x),
      y: Math.abs(point.y - origin.y),
    }
    if (hasMovedPast(moved, moveThreshold)) cancel()
  }

  return {
    isHolding,
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onMouseMove: trackMove,
      onTouchStart: start,
      onTouchMove: trackMove,
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    },
  }
}
