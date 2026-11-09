/**
 * @fileoverview Hook that opens something, like a tooltip, on the focus the
 * browser would ring, and closes it on blur.
 */

import { useState } from 'react'

import { afterFocusScroll } from './utils'

/**
 * Whether something an element opens, like a tooltip, is open, which focus
 * the browser would ring opens and blur closes, with the handlers that do so,
 * to spread onto the element.
 *
 * A click's focus opens nothing, the same as Radix's own triggers. It opens
 * once the scroll that focus brings is done, since Radix closes a tooltip
 * whose trigger scrolls.
 */
export const useFocusVisibleOpen = () => {
  const [open, setOpen] = useState(false)
  const focusProps = {
    onFocus: (event: React.FocusEvent<Element>) => {
      const element = event.currentTarget
      afterFocusScroll(element, () =>
        setOpen(element.matches(':focus-visible'))
      )
    },
    onBlur: () => setOpen(false),
  }
  return { open, setOpen, focusProps }
}
