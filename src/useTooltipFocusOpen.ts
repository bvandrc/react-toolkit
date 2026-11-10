/**
 * @fileoverview Hook that opens a Radix tooltip on keyboard focus once the
 * scroll that focus brings is done, in place of Radix's own focus handling.
 */

import { useCallback, useMemo } from 'react'

import { useFocusVisibleOpen } from './useFocusVisibleOpen'
import { useMaybeControlled } from './useMaybeControlled'

/**
 * A tooltip's `open` and `onOpenChange`, with keyboard focus opening it too,
 * and the focus handlers that do so.
 *
 * Radix opens a tooltip as its trigger takes focus, then closes it on the
 * scroll that focus brings, so one whose trigger was out of view never shows;
 * this opens it the way `useFocusVisibleOpen` does instead. The two arguments
 * are every other way the tooltip opens, like `usePressToggle`'s state and its
 * setter; leave both out and the hook holds that state itself, which is enough
 * for a tooltip only hover and focus open.
 *
 * - Spread `rootProps` on the tooltip's root, and close it through
 *   `rootProps.onOpenChange(false)`, which closes a focus open too.
 * - Spread `focusProps` on its trigger. They cancel the focus event, which a
 *   Radix trigger takes as leaving the open to them.
 * - `dropFocusOpen` lets go of a focus open, for something that takes over
 *   from it, like `usePressToggle` on a press.
 *
 * `rootProps.onOpenChange`, `focusProps`, and `dropFocusOpen` keep their
 * identity while `onControlledOpenChange` does, and always where it's left out.
 */
export const useTooltipFocusOpen = (
  controlledOpen?: boolean,
  onControlledOpenChange?: (next: boolean) => void
) => {
  const [open, setOpen] = useMaybeControlled(
    controlledOpen,
    onControlledOpenChange,
    false
  )
  const {
    open: isFocusOpen,
    setOpen: setIsFocusOpen,
    focusProps,
  } = useFocusVisibleOpen()

  const dropFocusOpen = useCallback(
    () => setIsFocusOpen(false),
    [setIsFocusOpen]
  )
  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      dropFocusOpen()
    },
    [setOpen, dropFocusOpen]
  )

  return {
    rootProps: useMemo(
      () => ({ open: open || isFocusOpen, onOpenChange }),
      [open, isFocusOpen, onOpenChange]
    ),
    focusProps: useMemo(
      () => ({
        onFocus: (event: React.FocusEvent<HTMLElement>) => {
          focusProps.onFocus(event)
          // Radix's trigger runs the handler it's given before its own, and
          // skips its own open for an event already prevented.
          event.preventDefault()
        },
        onBlur: focusProps.onBlur,
      }),
      [focusProps]
    ),
    dropFocusOpen,
  }
}
