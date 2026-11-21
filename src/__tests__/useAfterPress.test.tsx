import { fireEvent, renderHook } from '@testing-library/react'

import { useAfterPress } from '../useAfterPress'

/** Longer than a press with no click is ever held for. */
const PAST_NO_CLICK_TIMEOUT_MS = 1000

describe('useAfterPress', () => {
  const onRun = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
  })

  /** Puts a pointer down on the page, as the start of a press. */
  const pressDown = () => fireEvent.pointerDown(document.body)

  it('runs straight away when no press is under way', () => {
    const { result } = renderHook(() => useAfterPress())

    result.current.run(onRun)

    expect(onRun).toHaveBeenCalledOnce()
  })

  it('waits past the release for the click a press ends in', () => {
    // A tap's order: the click only comes once the finger has lifted.
    const { result } = renderHook(() => useAfterPress())
    pressDown()

    result.current.run(onRun)
    fireEvent.pointerUp(document.body)
    expect(onRun, 'released').not.toHaveBeenCalled()

    fireEvent.click(document.body)
    expect(onRun, 'clicking').not.toHaveBeenCalled()
    // The task after the click, well short of a press that never clicks.
    vi.advanceTimersByTime(0)
    expect(onRun, 'clicked').toHaveBeenCalledOnce()
  })

  it('runs as soon as the press is cancelled, as when a touch turns into a scroll', () => {
    const { result } = renderHook(() => useAfterPress())
    pressDown()

    result.current.run(onRun)
    fireEvent.pointerCancel(document.body)

    expect(onRun).toHaveBeenCalledOnce()
  })

  it('runs a while after a release that never clicks', () => {
    const { result } = renderHook(() => useAfterPress())
    pressDown()

    result.current.run(onRun)
    fireEvent.pointerUp(document.body)
    vi.advanceTimersByTime(PAST_NO_CLICK_TIMEOUT_MS)

    expect(onRun).toHaveBeenCalledOnce()
  })

  it('runs only the latest of several calls made during one press', () => {
    const onEarlierRun = vi.fn()
    const { result } = renderHook(() => useAfterPress())
    pressDown()

    result.current.run(onEarlierRun)
    result.current.run(onRun)
    fireEvent.pointerCancel(document.body)

    expect(onEarlierRun).not.toHaveBeenCalled()
    expect(onRun).toHaveBeenCalledOnce()
  })

  it('drops a waiting call on cancel and on unmount', () => {
    const { result, unmount } = renderHook(() => useAfterPress())

    pressDown()
    result.current.run(onRun)
    result.current.cancel()
    fireEvent.pointerCancel(document.body)
    expect(onRun, 'cancelled').not.toHaveBeenCalled()

    pressDown()
    result.current.run(onRun)
    unmount()
    fireEvent.pointerCancel(document.body)
    expect(onRun, 'unmounted').not.toHaveBeenCalled()
  })

  it('keeps its functions across renders', () => {
    // A consumer may list them as effect or callback dependencies.
    const { result, rerender } = renderHook(() => useAfterPress())
    const afterPress = result.current

    rerender()

    expect(result.current).toBe(afterPress)
  })
})
