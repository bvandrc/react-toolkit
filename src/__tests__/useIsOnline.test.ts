import { act, renderHook } from '@testing-library/react'

import { useIsOnline } from '../useIsOnline'

/** Has the browser report `isOnline` from here on. */
const mockOnLine = (isOnline: boolean) =>
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline)

describe('useIsOnline', () => {
  it('starts from what the browser reports', () => {
    for (const isOnline of [true, false]) {
      mockOnLine(isOnline)
      const { result } = renderHook(() => useIsOnline())
      expect(result.current, String(isOnline)).toBe(isOnline)
    }
  })

  it('follows the browser going offline and back', () => {
    mockOnLine(true)
    const { result } = renderHook(() => useIsOnline())

    act(() => window.dispatchEvent(new Event('offline')))
    expect(result.current).toBe(false)

    act(() => window.dispatchEvent(new Event('online')))
    expect(result.current).toBe(true)
  })

  it('reports each change to onChange', () => {
    mockOnLine(true)
    const onChange = vi.fn()
    renderHook(() => useIsOnline({ onChange }))

    act(() => window.dispatchEvent(new Event('offline')))
    act(() => window.dispatchEvent(new Event('online')))

    expect(onChange.mock.calls).toEqual([[false], [true]])
  })
})
