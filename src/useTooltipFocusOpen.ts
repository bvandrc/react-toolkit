/**
 * @fileoverview Hook that opens a Radix tooltip on keyboard focus once the
 * scroll that focus brings is done, in place of Radix's own focus handling.
 */

import { useCallback, useMemo, useRef } from 'react'

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
 * - Spread `focusProps` on its trigger. The open Radix asks for as that
 *   focus lands is ignored, and the event is left uncancelled, so the
 *   trigger's other focus handlers still run, like a Radix radio's
 *   select-on-arrow-key.
 * - `dropFocusOpen` lets go of a focus open, for something that takes over
 *   from it, like `usePressToggle` on a press.
 *
 * `rootProps.onOpenChange`, `focusProps`, and `dropFocusOpen` keep their
 * identity while `onControlledOpenChange` does, and always where it's left out.
 *
 * @example
 * ```tsx
 * // A tooltip only hover and focus open, so the hook holds its state. Like
 * // any Radix tooltip, it needs a `Tooltip.Provider` above it.
 * const { rootProps, focusProps } = useTooltipFocusOpen()
 *
 * return (
 *   <Tooltip.Root {...rootProps}>
 *     <Tooltip.Trigger {...focusProps}>Save</Tooltip.Trigger>
 *     <Tooltip.Content>Ctrl+S</Tooltip.Content>
 *   </Tooltip.Root>
 * )
 * ```
 *
 * @example
 * ```tsx
 * // A tooltip a tap, click, or Enter toggles as well.
 * // `cancelClick` stops the trigger's own click from closing what the toggle
 * // just opened, and `dropFocusOpen` lets a press close one focus opened.
 * const { isActive, setIsActive, triggerProps } = usePressToggle({
 *   cancelClick: true,
 * })
 * const { rootProps, focusProps, dropFocusOpen } = useTooltipFocusOpen(
 *   isActive,
 *   setIsActive
 * )
 *
 * return (
 *   <Tooltip.Root {...rootProps}>
 *     <Tooltip.Trigger
 *       aria-label="More info"
 *       {...triggerProps}
 *       {...focusProps}
 *       onClick={(event) => {
 *         triggerProps.onClick(event)
 *         dropFocusOpen()
 *       }}>
 *       ⓘ
 *     </Tooltip.Trigger>
 *     <Tooltip.Content>{hint}</Tooltip.Content>
 *   </Tooltip.Root>
 * )
 * ```
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

  // Set for the length of a focus event, when an open is Radix's own.
  const isFocusingRef = useRef(false)

  const dropFocusOpen = useCallback(
    () => setIsFocusOpen(false),
    [setIsFocusOpen]
  )
  const onOpenChange = useCallback(
    (next: boolean) => {
      if (next && isFocusingRef.current) return
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
          // Radix's trigger runs the handler it's given before its own open,
          // in the same call. Cancelling the event would stop that open too,
          // but also every other handler the trigger composes the same way.
          isFocusingRef.current = true
          queueMicrotask(() => {
            isFocusingRef.current = false
          })
        },
        onBlur: focusProps.onBlur,
      }),
      [focusProps]
    ),
    dropFocusOpen,
  }
}
