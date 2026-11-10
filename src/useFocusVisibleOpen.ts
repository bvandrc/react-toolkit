/**
 * @fileoverview Hook that opens something, like a tooltip, on the focus the
 * browser would ring, and closes it on blur.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
 */
export const useFocusVisibleOpen = () => {
  const [open, setOpenState] = useState(false)
  // Calls off an open still waiting on its focus scroll.
  const cancelRef = useRef<() => void>(undefined)
  const setOpen = useCallback((next: boolean) => {
    cancelRef.current?.()
    setOpenState(next)
  }, [])
  useEffect(() => () => cancelRef.current?.(), [])
  const focusProps = useMemo(
    () => ({
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        const element = event.currentTarget
        cancelRef.current?.()
        cancelRef.current = onFocusScrollEnd(element, () =>
          setOpenState(element.matches(':focus-visible'))
        )
      },
      onBlur: () => setOpen(false),
    }),
    [setOpen]
  )
  return { open, setOpen, focusProps }
}
