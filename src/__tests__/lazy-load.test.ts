import { act, renderHook } from '@testing-library/react'

import { createLazyLoad } from '../lazy-load'

// What the load resolves to, standing in for a module.
const VALUE = { name: 'charts' }

// What a failed load rejects with.
const ERROR = new Error('offline')

/** Mocks a load that resolves to `VALUE`. */
const mockLoad = () => vi.fn(() => Promise.resolve(VALUE))

/** Renders the hook `createLazyLoad` made, `enabled` or not. */
const renderLazyLoad = (
  useLazyLoad: ReturnType<typeof createLazyLoad<typeof VALUE>>,
  enabled?: boolean
) => renderHook(() => useLazyLoad(enabled))

/** Prefetches through each of `hooks`, then lets the loads settle. */
const prefetch = async (
  ...hooks: ReturnType<typeof renderLazyLoad>['result'][]
) => {
  await act(() => {
    for (const hook of hooks) hook.current.prefetch()
    // Returned so `act` waits for the loads to settle, and their state to land.
    return Promise.resolve()
  })
}

describe('createLazyLoad', () => {
  it('loads on prefetch, and not before', async () => {
    const load = mockLoad()
    const { result } = renderLazyLoad(createLazyLoad(load))
    expect(load).not.toHaveBeenCalled()
    expect(result.current.value).toBeUndefined()

    await prefetch(result)
    expect(result.current).toMatchObject({ value: VALUE, isFailed: false })
  })

  it('loads once for components prefetching at once, and starts later ones with the value', async () => {
    const load = mockLoad()
    const useLazyLoad = createLazyLoad(load)
    const first = renderLazyLoad(useLazyLoad).result
    const second = renderLazyLoad(useLazyLoad).result

    await prefetch(first, second)
    expect(first.current.value).toBe(VALUE)
    expect(second.current.value).toBe(VALUE)
    const later = renderLazyLoad(useLazyLoad).result
    expect(later.current.value).toBe(VALUE)
    expect(load).toHaveBeenCalledOnce()
  })

  it('gives every mounted component the value as soon as one loads it', async () => {
    const useLazyLoad = createLazyLoad(mockLoad())
    const first = renderLazyLoad(useLazyLoad).result
    const second = renderLazyLoad(useLazyLoad).result

    await prefetch(first)
    expect(second.current.value).toBe(VALUE)
  })

  it('loads nothing while disabled', async () => {
    const load = mockLoad()
    const { result } = renderLazyLoad(createLazyLoad(load), false)

    await prefetch(result)
    expect(load).not.toHaveBeenCalled()
    expect(result.current.value).toBeUndefined()
  })

  it('reports a failed load, with its error, to every mounted component, and tries again on the next prefetch', async () => {
    const load = vi
      .fn<() => Promise<typeof VALUE>>()
      .mockRejectedValueOnce(ERROR)
      .mockResolvedValueOnce(VALUE)
    const useLazyLoad = createLazyLoad(load)
    const first = renderLazyLoad(useLazyLoad).result
    const second = renderLazyLoad(useLazyLoad).result

    await prefetch(first)
    for (const hook of [first, second]) {
      expect(hook.current).toMatchObject({
        value: undefined,
        isFailed: true,
        error: ERROR,
      })
    }
    act(() => second.current.prefetch())
    // Trying again, so no longer failed while it does.
    expect(first.current).toMatchObject({ isFailed: false, error: undefined })
    await act(() => Promise.resolve())
    expect(first.current).toMatchObject({ value: VALUE, isFailed: false })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('reports a load that throws before it returns a promise as failed, rather than throwing', async () => {
    const useLazyLoad = createLazyLoad<typeof VALUE>(() => {
      throw ERROR
    })
    const { result } = renderLazyLoad(useLazyLoad)

    await prefetch(result)
    expect(result.current).toMatchObject({ isFailed: true, error: ERROR })
  })

  it('keeps `prefetch` across renders', () => {
    // A consumer may list it as an effect or callback dependency.
    const { result, rerender } = renderLazyLoad(createLazyLoad(mockLoad()))
    const { prefetch: firstPrefetch } = result.current

    rerender()
    expect(result.current.prefetch).toBe(firstPrefetch)
  })
})
