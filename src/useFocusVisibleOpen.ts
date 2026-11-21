/**
 * @fileoverview Hook that opens something, like a tooltip, on the focus the
 * browser would ring, and closes it on blur.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useUnmount } from 'usehooks-ts'

import { onFocusScrollEnd } from './utils'

/**
 * Whether something an element opens, like a tooltip, is open, which focus
 * the browser would ring opens and blur closes, with the handlers that do so,
 * to spread onto the element.
 *
 * A click's focus opens nothing, the same as Radix's own triggers. It opens
 * once the scroll that focus brings is done, since Radix closes a tooltip
 * whose trigger scrolls; a blur, a `setOpen`, or unmounting before then calls
 * it off. `setOpen` and `focusProps` keep their identity across renders.
 *
 * @example
 * ```tsx
 * const { open, focusProps } = useFocusVisibleOpen()
 * const hintId = useId()
 *
 * // The hint stays rendered while closed, hidden, so the button keeps its
 * // description.
 * return (
 *   <>
 *     <button type="button" {...focusProps} aria-describedby={hintId}>
 *       Save
 *     </button>
 *     <div role="tooltip" id={hintId} hidden={!open}>
 *       Ctrl+S
 *     </div>
 *   </>
 * )
 * ```
 */
/**
 * Whether a focus event is the element's own, or one of what's inside it,
 * rather than one React bubbles up from a portal it renders, like a button in
 * the tooltip it opens.
 */
const isOwnFocusEvent = (event: React.FocusEvent<HTMLElement>) =>
  event.target instanceof Node && event.currentTarget.contains(event.target)

export const useFocusVisibleOpen = () => {
  const [open, setOpenState] = useState(false)
  // Calls off an open still waiting on its focus scroll.
  const cancelRef = useRef<() => void>(undefined)
  const setOpen = useCallback((next: boolean) => {
    cancelRef.current?.()
    setOpenState(next)
  }, [])
  useUnmount(() => cancelRef.current?.())
  const focusProps = useMemo(
    () => ({
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        const element = event.currentTarget
        if (!isOwnFocusEvent(event)) {
          return
        }
        cancelRef.current?.()
        cancelRef.current = onFocusScrollEnd(element, () =>
          setOpenState(element.matches(':focus-visible'))
        )
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (isOwnFocusEvent(event)) {
          setOpen(false)
        }
      },
    }),
    [setOpen]
  )
  return { open, setOpen, focusProps }
}
