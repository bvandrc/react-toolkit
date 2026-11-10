import { createDeviceId } from '../device-id'

const STORAGE_KEY = 'test-device-id'

/** What a page load gets: a cold cache over whatever the store holds. */
const createDeviceIdStore = () => createDeviceId({ storageKey: STORAGE_KEY })

const getStoredId = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')

describe('createDeviceId', () => {
  describe('getDeviceId', () => {
    it('mints an id on the first read and stores it', async () => {
      const deviceId = await createDeviceIdStore().getDeviceId()

      expect(deviceId).toEqual(expect.any(String))
      expect(getStoredId()).toBe(deviceId)
    })

    it('survives a reload, reading the stored id rather than minting another', async () => {
      const first = await createDeviceIdStore().getDeviceId()

      expect(await createDeviceIdStore().getDeviceId()).toBe(first)
    })

    it('mints over a stored value it cannot read', async () => {
      // Unparseable, an empty id, and JSON that isn't a string.
      for (const STORED of ['not json', '""', '42']) {
        localStorage.setItem(STORAGE_KEY, STORED)

        const deviceId = await createDeviceIdStore().getDeviceId()

        // A non-empty string, which none of the stored values parse to.
        expect(deviceId, STORED).toMatch(/\S/)
        expect(getStoredId(), STORED).toBe(deviceId)
      }
    })

    it('mints under the Web Lock where the browser has one', async () => {
      const request = vi.fn((_name: string, callback: () => string) =>
        Promise.resolve(callback())
      )
      vi.stubGlobal('navigator', { ...navigator, locks: { request } })

      const deviceId = await createDeviceIdStore().getDeviceId()

      expect(request).toHaveBeenCalledWith(
        `${STORAGE_KEY}-lock`,
        expect.any(Function)
      )
      expect(getStoredId()).toBe(deviceId)
    })
  })

  describe('setDeviceId', () => {
    it('re-persists an id captured before the store was cleared', async () => {
      const { getDeviceId, setDeviceId } = createDeviceIdStore()
      const original = await getDeviceId()

      localStorage.clear()
      setDeviceId(original)

      expect(await getDeviceId()).toBe(original)
      expect(getStoredId()).toBe(original)
    })
  })
})
