import { act, render, renderHook } from '@testing-library/react'

// biome-ignore lint/suspicious/noDeprecatedImports: covers the deprecated hook until it's removed.
import { useEasedScrollIntoView } from '../useEasedScrollIntoView'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useEasedScrollIntoView', () => {
  it('scrolls smoothly', () => {
    const { getByTestId } = render(
      <div data-testid="scroll-parent" style={{ overflowY: 'auto' }}>
        <div data-testid="el" />
      </div>
    )
    const scrollParent = getByTestId('scroll-parent')
    // happy-dom does no real layout, so this puts `el` 100px below the top
    // of a scroll container it's otherwise all at the top of.
    vi.spyOn(getByTestId('el'), 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 150,
    } as DOMRect)
    const scrollTo = vi
      .spyOn(scrollParent, 'scrollTo')
      .mockImplementation(() => {
        // happy-dom has no smooth scroll to run, so this only records the request.
      })
    const { result } = renderHook(() => useEasedScrollIntoView())

    act(() => result.current.scrollIntoView(getByTestId('el'), 'start'))

    // Everything else about the scroll is `useScrollIntoView`'s own
    // behavior to cover -- this only checks the old name animates it.
    expect(scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'smooth' })
  })
})
