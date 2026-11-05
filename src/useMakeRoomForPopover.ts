/**
 * @fileoverview Hook that makes room for a popover (a menu, say) taller than
 * the room above and below its trigger, by scrolling the trigger's
 * surroundings to the top of their scroll area as it opens.
 */

import { useCallback } from 'react'

import { useScrollIntoView } from './useScrollIntoView'
import { findScrollableAncestor, getRoomAround } from './utils'

export interface MakeRoomForPopoverOptions {
  /** What moves to the top of its scroll area; the trigger itself by default. */
  scrollTarget?: React.RefObject<HTMLElement | null>
  /** Height the popover takes beyond its content: its gap from the trigger, its borders. */
  extraHeightPx?: number
}

/**
 * Returns a ref for the popover that, when it mounts too tall to fit above or
 * below `triggerRef`, scrolls `scrollTarget` to the top of its scroll area.
 *
 * A popover that already fits leaves everything where it is. Measures once
 * each time the popover mounts, so one that unmounts while closed (as
 * `@radix-ui`'s do) checks on every open. Never scrolls the page itself: a
 * target whose scroll area is the page has no room to give.
 */
export const useMakeRoomForPopover = (
  triggerRef: React.RefObject<HTMLElement | null>,
  { scrollTarget, extraHeightPx = 0 }: MakeRoomForPopoverOptions = {}
) => {
  const { scrollIntoView } = useScrollIntoView()

  return useCallback(
    (popover: HTMLElement | null) => {
      const trigger = triggerRef.current
      const target = scrollTarget?.current ?? trigger
      if (!popover || !trigger || !target) return
      if (findScrollableAncestor(target) === document.scrollingElement) return
      const { above, below } = getRoomAround(trigger)
      // Its full height, whatever max height the popover is capped to so far.
      const needed = popover.scrollHeight + extraHeightPx
      if (needed > Math.max(above, below)) {
        scrollIntoView(target, 'start')
      }
    },
    [triggerRef, scrollTarget, extraHeightPx, scrollIntoView]
  )
}
