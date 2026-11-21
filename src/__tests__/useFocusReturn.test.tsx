import { render, renderHook, screen } from '@testing-library/react'

import { useFocusReturn } from '../useFocusReturn'

const T_IDS = {
  OPENER_BTN: 'opener',
  INSIDE_BTN: 'inside',
} as const

describe('useFocusReturn', () => {
  /**
   * Opens with focus on the opener, then moves it inside as a dialog's
   * autofocus would, and closes again.
   */
  const renderClosedAfterOpening = () => {
    const page = render(
      <>
        <button type="button" data-testid={T_IDS.OPENER_BTN} />
        <button type="button" data-testid={T_IDS.INSIDE_BTN} />
      </>
    )
    screen.getByTestId(T_IDS.OPENER_BTN).focus()
    const hook = renderHook(({ open }) => useFocusReturn(open), {
      initialProps: { open: false },
    })
    hook.rerender({ open: true })
    screen.getByTestId(T_IDS.INSIDE_BTN).focus()
    hook.rerender({ open: false })
    return { page, hook }
  }

  /** A close event the hook can cancel, as a dialog's would be. */
  const buildCloseEvent = () => new Event('focus', { cancelable: true })

  it("focuses the opener again, cancelling the close event's default", () => {
    const { hook } = renderClosedAfterOpening()
    const EVENT = buildCloseEvent()

    const didReturn = hook.result.current.returnFocus(EVENT)

    expect(didReturn).toBe(true)
    expect(EVENT.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(screen.getByTestId(T_IDS.OPENER_BTN))
  })

  it('finds the opener of a dialog that first renders already open', () => {
    render(
      <>
        <button type="button" data-testid={T_IDS.OPENER_BTN} />
        <button type="button" data-testid={T_IDS.INSIDE_BTN} />
      </>
    )
    const opener = screen.getByTestId(T_IDS.OPENER_BTN)
    opener.focus()
    // Mounted open, as a dialog that only renders once it opens would be.
    const hook = renderHook(({ open }) => useFocusReturn(open), {
      initialProps: { open: true },
    })
    screen.getByTestId(T_IDS.INSIDE_BTN).focus()
    hook.rerender({ open: false })

    expect(hook.result.current.returnFocus()).toBe(true)
    expect(document.activeElement).toBe(opener)
  })

  it('leaves the close event alone once the opener has unmounted', () => {
    const { page, hook } = renderClosedAfterOpening()
    page.unmount()
    const EVENT = buildCloseEvent()

    expect(hook.result.current.returnFocus(EVENT)).toBe(false)
    expect(EVENT.defaultPrevented).toBe(false)
  })
})
