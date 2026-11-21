/**
 * @fileoverview Hook that returns focus to whatever opened a dialog, for one
 * opened from a plain button rather than its library's own trigger.
 */

import { useRef, useState } from 'react'

/**
 * Remembers what had focus when `open` turns true, and hands back
 * `returnFocus`, which focuses it again.
 *
 * Call `returnFocus` as the dialog closes, passing the close event to have its
 * default cancelled whenever focus moves -- a Radix dialog's
 * `onCloseAutoFocus` takes it as is. It does nothing when the opener has since
 * unmounted, and reports whether it moved focus.
 *
 * @example
 * ```tsx
 * const { returnFocus } = useFocusReturn(open)
 *
 * return (
 *   <Dialog.Root open={open} onOpenChange={setOpen}>
 *     <Dialog.Content onCloseAutoFocus={returnFocus}>{children}</Dialog.Content>
 *   </Dialog.Root>
 * )
 * ```
 */
export const useFocusReturn = (open: boolean) => {
  const openerRef = useRef<Element | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    // Read while rendering the open, before anything in the dialog autofocuses
    // and takes focus from the opener.
    if (open) openerRef.current = document.activeElement
  }

  return {
    returnFocus: (event?: Pick<Event, 'preventDefault'>) => {
      const opener = openerRef.current
      if (!(opener instanceof HTMLElement && opener.isConnected)) return false
      event?.preventDefault()
      opener.focus()
      return true
    },
  }
}
