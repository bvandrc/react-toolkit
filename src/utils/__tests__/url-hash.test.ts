import { parseUrlHash } from '../url-hash'

/** `parseUrlHash`'s target, with its parameters as a plain object to compare. */
const parse = (hash: string) => {
  const target = parseUrlHash(hash)
  return target && { ...target, params: Object.fromEntries(target.params) }
}

describe('parseUrlHash', () => {
  it('splits the id from the parameters after its `?`', () => {
    expect(parse('#pricing?plan=pro&period=year')).toEqual({
      id: 'pricing',
      params: { plan: 'pro', period: 'year' },
    })
  })

  it('decodes the id, and gives one with no `?` no parameters', () => {
    expect(parse('#caf%C3%A9')).toEqual({ id: 'café', params: {} })
  })

  it("names nothing for no `#`, no id before its `?`, or an id that won't decode", () => {
    const HASHES = ['', '#', '#?plan=pro', '#100%']
    for (const hash of HASHES) {
      expect(parse(hash), hash).toBeUndefined()
    }
  })
})
