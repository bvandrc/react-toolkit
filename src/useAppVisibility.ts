/**
 * @fileoverview Fires `onVisible`/`onHidden` on document visibilitychange.
 */

import { useRef } from 'react'
import { useEventListener } from 'usehooks-ts'

interface UseAppVisibilityOptions {
  onVisible?: () => void
  onHidden?: () => void
}

/**
 * Calls `onVisible` or `onHidden` as the document's visibility changes.
 *
 * A thin, device-agnostic wrapper: whether a change means the app was opened
 * or closed (a desktop tab switch, say, against a phone backgrounding it) is
 * the caller's to decide.
 */
export const useAppVisibility = ({
  onVisible,
  onHidden,
}: UseAppVisibilityOptions) => {
  const documentRef = useRef<Document>(document)
  useEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible') {
        onVisible?.()
      } else {
        onHidden?.()
      }
    },
    documentRef
  )
}
