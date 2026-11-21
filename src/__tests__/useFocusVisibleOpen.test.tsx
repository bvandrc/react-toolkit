import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createPortal } from 'react-dom'

import { useFocusVisibleOpen } from '../useFocusVisibleOpen'

const T_IDS = {
  TRIGGER: 'trigger',
  CLOSE: 'close',
  OPEN: 'open',
  PORTALED_1: 'portaled-1',
  PORTALED_2: 'portaled-2',
} as const

/** A trigger showing whether the hook says it's open, and a button that closes it. */
const OpenOnFocusTrigger = () => {
  const { open, setOpen, focusProps } = useFocusVisibleOpen()
  return (
    <>
      <button type="button" {...focusProps} data-testid={T_IDS.TRIGGER}>
        {open ? 'open' : 'closed'}
      </button>
      <button
        type="button"
        // Closes without taking focus, the way Escape closes a tooltip.
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setOpen(false)}
        data-testid={T_IDS.CLOSE}
      />
    </>
  )
}

/**
 * A trigger whose React children include buttons portaled out of it, as a
 * tooltip's content is, and a button outside it that opens it.
 */
const OpenWithPortalTrigger = () => {
  const { open, setOpen, focusProps } = useFocusVisibleOpen()
  return (
    <>
      <div {...focusProps} data-testid={T_IDS.TRIGGER}>
        {open ? 'open' : 'closed'}
        {createPortal(
          <>
            <button type="button" data-testid={T_IDS.PORTALED_1} />
            <button type="button" data-testid={T_IDS.PORTALED_2} />
          </>,
          document.body
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={T_IDS.OPEN}
      />
    </>
  )
}

/** Lays every element out below the fold, so a focus scroll has to bring it into view. */
const mockBelowTheFold = () =>
  vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 2000, width: 100, height: 20 })
    )

/** Ends the page's scroll, which bubbles up to the window, as a browser's does, and waits out the two frames after it, when the open lands. */
const endScroll = () =>
  act(async () => {
    document.dispatchEvent(new Event('scrollend', { bubbles: true }))
    await new Promise((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTimeout(resolve))
      )
    )
  })

/** What the trigger says: open or closed. */
const getTriggerState = () => screen.getByTestId(T_IDS.TRIGGER).textContent

describe('useFocusVisibleOpen', () => {
  // The test DOM matches :focus-visible on any focus, a click's too, so only a
  // real browser can check that a click opens nothing.
  it('opens on keyboard focus, and closes on blur', async () => {
    const user = userEvent.setup()
    render(<OpenOnFocusTrigger />)

    await user.tab()
    await waitFor(() => expect(getTriggerState()).toBe('open'))
    await user.tab()
    expect(getTriggerState()).toBe('closed')
  })

  it('opens once the scroll to a trigger below the fold ends', async () => {
    const user = userEvent.setup()
    mockBelowTheFold()
    render(<OpenOnFocusTrigger />)

    await user.tab()
    expect(getTriggerState()).toBe('closed')
    await endScroll()
    expect(getTriggerState()).toBe('open')
  })

  it('stays closed when blurred or closed before the scroll ends', async () => {
    const user = userEvent.setup()
    mockBelowTheFold()
    render(<OpenOnFocusTrigger />)

    // Tabbed past before the scroll to it ended.
    await user.tab()
    await user.tab()
    await endScroll()
    expect(getTriggerState(), 'blurred').toBe('closed')

    // Closed, as Escape would, while still focused.
    await user.tab({ shift: true })
    await user.click(screen.getByTestId(T_IDS.CLOSE))
    await endScroll()
    expect(getTriggerState(), 'closed').toBe('closed')
  })

  it('ignores the focus and blur React bubbles up from a portal inside the trigger, like a button in the tooltip it opens', async () => {
    const user = userEvent.setup()
    render(<OpenWithPortalTrigger />)
    await user.click(screen.getByTestId(T_IDS.OPEN))

    await user.click(screen.getByTestId(T_IDS.PORTALED_1))
    await user.click(screen.getByTestId(T_IDS.PORTALED_2))
    await endScroll()
    expect(getTriggerState()).toBe('open')
  })
})
