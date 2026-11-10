import { act, render, renderHook } from '@testing-library/react'

import { mockScrollLayout } from '@/test-support'
// biome-ignore lint/suspicious/noDeprecatedImports: covers the deprecated hook until it's removed.
import { useEasedScrollIntoView } from '../useEasedScrollIntoView'

describe('useEasedScrollIntoView', () => {
  it('scrolls smoothly', () => {
    const { getByTestId } = render(
      <div data-testid="scroll-parent" style={{ overflowY: 'auto' }}>
        <div data-testid="el" />
      </div>
    )
    const { scrollTo } = mockScrollLayout(
      getByTestId('scroll-parent'),
      getByTestId('el'),
      { top: 100, height: 50, visibleHeight: 200 }
    )
    const { result } = renderHook(() => useEasedScrollIntoView())

    act(() => result.current.scrollIntoView(getByTestId('el'), 'start'))

    // Everything else about the scroll is `useScrollIntoView`'s own
    // behavior to cover -- this only checks the old name animates it.
    expect(scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' })
  })
})
