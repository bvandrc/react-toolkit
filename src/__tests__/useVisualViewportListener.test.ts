import { renderHook } from '@testing-library/react'

import { mockVisualViewport } from '@/test-support'
import { useVisualViewportListener } from '../useVisualViewportListener'

describe('useVisualViewportListener', () => {
  const handler = vi.fn()

  it('calls the handler for the event it listens to, and no other', () => {
    const viewport = mockVisualViewport()
    renderHook(() => useVisualViewportListener('resize', handler))

    viewport.change({ height: 500 }, 'resize')
    viewport.change({ offsetTop: 20 }, 'scroll')

    expect(handler).toHaveBeenCalledOnce()
  })

  it('calls the latest handler after a re-render', () => {
    const viewport = mockVisualViewport()
    const first = vi.fn()
    const { rerender } = renderHook(
      ({ onResize }) => useVisualViewportListener('resize', onResize),
      { initialProps: { onResize: first } }
    )

    rerender({ onResize: handler })
    viewport.change({ height: 500 }, 'resize')

    expect(first).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('stops listening on unmount', () => {
    const viewport = mockVisualViewport()
    const { unmount } = renderHook(() =>
      useVisualViewportListener('resize', handler)
    )

    unmount()
    viewport.change({ height: 500 }, 'resize')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does nothing in a browser without a visual viewport', () => {
    vi.stubGlobal('visualViewport', undefined)

    expect(() =>
      renderHook(() => useVisualViewportListener('resize', handler))
    ).not.toThrow()
  })
})
