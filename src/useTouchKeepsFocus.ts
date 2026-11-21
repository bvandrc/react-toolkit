/**
 * @fileoverview Hook that leaves focus where it was while a menu or popover
 * opened by touch is up, so a text field's on-screen keyboard stays open.
 */

import { useRef } from 'react'

/**
 * Props for a menu or popover's trigger and content that keep focus off the
 * popover when it was opened by touch, so the focused text field keeps its
 * on-screen keyboard through the open and every tap on an item.
 *
 * Spread `triggerProps` onto the trigger and `contentProps` onto the content;
 * `onOpenAutoFocus` is the name Radix's menus and popovers take. One opened by
 * mouse or keyboard takes focus as usual, so its items stay reachable with the
 * arrow keys.
 *
 * @example
 * ```tsx
 * const { triggerProps, contentProps } = useTouchKeepsFocus()
 *
 * return (
 *   <Popover.Root>
 *     <Popover.Trigger {...triggerProps}>Insert</Popover.Trigger>
 *     <Popover.Content {...contentProps}>{snippets}</Popover.Content>
 *   </Popover.Root>
 * )
 * ```
 */
export const useTouchKeepsFocus = () => {
  const wasOpenedByTouch = useRef(false)

  return {
    triggerProps: {
      onPointerDown: (e: React.PointerEvent) => {
        wasOpenedByTouch.current = e.pointerType !== 'mouse'
      },
      onKeyDown: () => {
        wasOpenedByTouch.current = false
      },
    },
    contentProps: {
      onOpenAutoFocus: (e: Pick<Event, 'preventDefault'>) => {
        if (wasOpenedByTouch.current) e.preventDefault()
      },
      // Tapping an item would otherwise focus it, blurring the text field
      // before the item's action can hand focus back.
      onMouseDown: (e: React.MouseEvent) => {
        if (wasOpenedByTouch.current) e.preventDefault()
      },
    },
  }
}
