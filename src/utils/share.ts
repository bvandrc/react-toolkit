/**
 * @fileoverview Sharing out of the app: the system share sheet, and `mailto:`
 * links.
 */

/** How a `shareFiles` call ended. */
export type ShareFilesResult = 'shared' | 'cancelled' | 'unavailable'

/**
 * Hands files to the system share sheet.
 *
 * Resolves to:
 * - `'shared'` -- the user sent the files somewhere from the sheet.
 * - `'cancelled'` -- the user closed the sheet, which is their answer rather
 *   than a reason to fall back.
 * - `'unavailable'` -- the browser can't share these files, or refused to (e.g.
 *   the user activation that started it has expired), so the caller should
 *   fall back to something else.
 */
export const shareFiles = async (
  data: ShareData & { files: File[] }
): Promise<ShareFilesResult> => {
  if (!navigator.canShare?.(data)) return 'unavailable'
  try {
    await navigator.share(data)
    return 'shared'
  } catch (err) {
    return err instanceof DOMException && err.name === 'AbortError'
      ? 'cancelled'
      : 'unavailable'
  }
}

/**
 * A `mailto:` link, with its subject and body filled in where given.
 *
 * Spaces are encoded as `%20`, not `+`, which mail clients show literally.
 */
export const buildMailtoHref = ({
  to,
  ...fields
}: {
  to: string
  subject?: string
  body?: string
}) => {
  const params = new URLSearchParams(
    Object.entries(fields).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  )
  const query = params
    .toString()
    // `URLSearchParams` writes spaces as `+`, which mail clients show literally.
    .replaceAll('+', '%20')
  return `mailto:${to}${query ? `?${query}` : ''}`
}
