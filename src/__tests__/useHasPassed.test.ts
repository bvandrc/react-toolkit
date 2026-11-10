import { act, renderHook } from '@testing-library/react'

import { useHasPassed } from '../useHasPassed'

const NOW = new Date('2026-10-01T12:00:00Z')
const MINUTE_MS = 60_000
// A fixed 24h span: a calendar day keeps the local time of day, so across a
// DST change it lands an hour off what the timers advance.
const DAY_MS = 24 * 60 * MINUTE_MS

/** `NOW`, `ms` later (or earlier, for a negative `ms`). */
const fromNow = (ms: number) => new Date(NOW.getTime() + ms)

describe('useHasPassed', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW }))

  /** Renders the hook over `date`, and returns a call that re-renders it over another. */
  const renderHasPassed = (date: Date | null | undefined) => {
    let current = date
    const rendered = renderHook(() => useHasPassed(current))
    const changeDate = (next: Date | null | undefined) => {
      current = next
      rendered.rerender()
    }
    return { ...rendered, changeDate }
  }

  it('is false with no date', () => {
    expect(renderHasPassed(null).result.current).toBe(false)
    expect(renderHasPassed(undefined).result.current).toBe(false)
  })

  it('is true for a date already past, and stays put', () => {
    const onRender = vi.fn()
    const { result } = renderHook(() => {
      onRender()
      return useHasPassed(fromNow(-MINUTE_MS))
    })
    expect(result.current).toBe(true)
    onRender.mockClear()

    // A timer set for a date already past fires at once, and in a browser the
    // clock has moved by the render that follows, so it would set another.
    for (let tick = 1; tick <= 3; tick++) {
      act(() => {
        vi.setSystemTime(Date.now() + 5)
        vi.advanceTimersByTime(0)
      })
    }
    expect(onRender).not.toHaveBeenCalled()
  })

  it('turns true at the moment the date passes, and not before', () => {
    const { result } = renderHasPassed(fromNow(30 * MINUTE_MS))

    act(() => vi.advanceTimersByTime(30 * 60_000 - 1))
    expect(result.current).toBe(false)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })

  it('waits out a date further off than one timer can reach, without firing early', () => {
    // Past `setTimeout`'s ~24.8-day ceiling, where a single timer fires at
    // once -- and, set again from the next render, keeps firing.
    const onRender = vi.fn()
    const { result } = renderHook(() => {
      onRender()
      return useHasPassed(fromNow(40 * DAY_MS))
    })
    onRender.mockClear()

    // A day per `act`, so the hook re-renders and sets its next timer between
    // steps, as a browser would: one long advance renders once, at the end,
    // and would miss a timer that keeps firing.
    for (let day = 1; day < 40; day++) {
      act(() => vi.advanceTimersByTime(DAY_MS))
    }
    expect(result.current).toBe(false)
    // The one step that ends at ~24.8 days.
    expect(onRender).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(DAY_MS))
    expect(result.current).toBe(true)
  })

  it('follows a date moved back into the future', () => {
    const { result, changeDate } = renderHasPassed(fromNow(-MINUTE_MS))
    expect(result.current).toBe(true)

    changeDate(fromNow(5 * MINUTE_MS))
    expect(result.current).toBe(false)

    act(() => vi.advanceTimersByTime(5 * 60_000))
    expect(result.current).toBe(true)
  })
})
