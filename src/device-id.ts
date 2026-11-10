/**
 * @fileoverview A stable per-install identifier, for telling one user's
 * devices apart.
 */

const readStoredId = (storageKey: string): string | undefined => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '')
    return typeof stored === 'string' && stored ? stored : undefined
  } catch {
    return undefined
  }
}

/**
 * A device id kept under `storageKey`: generated on its first read, then
 * stable for this browser profile.
 *
 * Its key should not be scoped to a user or session, so the id survives
 * logout, account deletion, and the like.
 */
export const createDeviceId = ({
  storageKey,
}: {
  /**
   * The localStorage key the id persists under, as a JSON string. Minting it
   * holds the Web Lock `<storageKey>-lock`.
   */
  storageKey: string
}) => {
  let cachedDeviceId: string | undefined

  const storeId = (deviceId: string) =>
    localStorage.setItem(storageKey, JSON.stringify(deviceId))

  const readOrMintDeviceId = (): string => {
    const stored = readStoredId(storageKey)
    if (stored) return stored
    const minted = crypto.randomUUID()
    storeId(minted)
    return minted
  }

  return {
    /**
     * The id, minting and storing one if there is none yet.
     *
     * Safe to call from several tabs (or a tab and an installed PWA window)
     * opening at once: all of them resolve to the same id.
     */
    getDeviceId: async (): Promise<string> => {
      if (cachedDeviceId) return cachedDeviceId

      // A Web Lock rather than a plain read-then-write: two tabs opening at
      // once can both read an empty key before either writes, mint their own,
      // and report as two devices. The lock is per-origin and held across
      // processes, so only one caller mints while the rest wait and read what
      // it wrote. Without the API the race is back, but it's no worse than
      // having no lock at all.
      cachedDeviceId = navigator.locks
        ? await navigator.locks.request(
            `${storageKey}-lock`,
            readOrMintDeviceId
          )
        : readOrMintDeviceId()

      return cachedDeviceId
    },

    /**
     * Re-persists an id captured *before* a wholesale `localStorage.clear()`,
     * so the same device keeps its id rather than minting a new one.
     */
    setDeviceId: (deviceId: string) => {
      // Set rather than read after the clear: a read falls through to an empty
      // store and mints a new id whenever the cache is cold.
      cachedDeviceId = deviceId
      storeId(deviceId)
    },
  }
}
