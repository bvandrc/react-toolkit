import { act, renderHook } from '@testing-library/react'

import { createLazyLoad } from '../lazy-load'

// What the load resolves to, standing in for a module.
const VALUE = { name: 'charts' }

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

  it('gives a component the value another loaded since it mounted, without loading again', async () => {
    const load = mockLoad()
    const useLazyLoad = createLazyLoad(load)
    const first = renderLazyLoad(useLazyLoad).result
    const second = renderLazyLoad(useLazyLoad).result

    await prefetch(first)
    expect(second.current.value).toBeUndefined()
    await prefetch(second)
    expect(second.current.value).toBe(VALUE)
    expect(load).toHaveBeenCalledOnce()
  })

  it('loads nothing while disabled', async () => {
    const load = mockLoad()
    const { result } = renderLazyLoad(createLazyLoad(load), false)

    await prefetch(result)
    expect(load).not.toHaveBeenCalled()
    expect(result.current.value).toBeUndefined()
  })

  it('reports a failed load, and tries again on the next prefetch', async () => {
    const load = vi
      .fn<() => Promise<typeof VALUE>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(VALUE)
    const { result } = renderLazyLoad(createLazyLoad(load))

    await prefetch(result)
    expect(result.current).toMatchObject({ value: undefined, isFailed: true })
    await prefetch(result)
    expect(result.current).toMatchObject({ value: VALUE, isFailed: false })
    expect(load).toHaveBeenCalledTimes(2)
  })
})
