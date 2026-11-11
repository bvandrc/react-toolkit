import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useTooltipFocusOpen } from '../useTooltipFocusOpen'

const T_IDS = {
  TRIGGER: 'trigger',
  HOVER: 'hover',
  CLOSE: 'close',
  DROP: 'drop',
} as const

/**
 * A tooltip trigger showing whether the tooltip is open, opening on focus
 * as a Radix trigger does, with buttons that stand in for hover, a close, and
 * a press taking over from focus.
 *
 * Holds its own open state unless given one.
 */
const TooltipTrigger = ({
  open,
  setOpen,
}: {
  open?: boolean
  setOpen?: (next: boolean) => void
}) => {
  const { rootProps, focusProps, dropFocusOpen } = useTooltipFocusOpen(
    open,
    setOpen
  )
  // None of these take focus, so pressing one leaves the trigger focused.
  const keepFocus = (event: React.PointerEvent) => event.preventDefault()
  return (
    <>
      <button
        type="button"
        {...focusProps}
        // A Radix trigger runs the handler it's given first, and opens on
        // focus itself unless that handler prevented the event.
        onFocus={(event) => {
          focusProps.onFocus(event)
          if (!event.defaultPrevented) rootProps.onOpenChange(true)
        }}
        data-testid={T_IDS.TRIGGER}>
        {rootProps.open ? 'open' : 'closed'}
      </button>
      <button
        type="button"
        onPointerDown={keepFocus}
        onClick={() => rootProps.onOpenChange(true)}
        data-testid={T_IDS.HOVER}
      />
      <button
        type="button"
        onPointerDown={keepFocus}
        onClick={() => rootProps.onOpenChange(false)}
        data-testid={T_IDS.CLOSE}
      />
      <button
        type="button"
        onPointerDown={keepFocus}
        onClick={dropFocusOpen}
        data-testid={T_IDS.DROP}
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

/** Ends the page's scroll, which bubbles up to the window, as a browser's does, and waits out the frame after it, when the open lands. */
const endScroll = () =>
  act(async () => {
    document.dispatchEvent(new Event('scrollend', { bubbles: true }))
    await new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve))
    )
  })

/** What the trigger says: open or closed. */
const getTriggerState = () => screen.getByTestId(T_IDS.TRIGGER).textContent

describe('useTooltipFocusOpen', () => {
  it("opens on keyboard focus once the scroll to a trigger below the fold ends, in place of the trigger's own open", async () => {
    const user = userEvent.setup()
    mockBelowTheFold()
    render(<TooltipTrigger />)

    await user.tab()
    // A trigger left to open on focus would be open already, and then shut by
    // the scroll.
    expect(getTriggerState()).toBe('closed')
    await endScroll()
    expect(getTriggerState()).toBe('open')
  })

  it('closes a focus open along with the rest through onOpenChange', async () => {
    const user = userEvent.setup()
    render(<TooltipTrigger />)

    await user.tab()
    await waitFor(() => expect(getTriggerState()).toBe('open'))
    await user.click(screen.getByTestId(T_IDS.HOVER))
    await user.click(screen.getByTestId(T_IDS.CLOSE))

    expect(getTriggerState()).toBe('closed')
  })

  it('lets go of a focus open on dropFocusOpen, while the trigger keeps focus', async () => {
    const user = userEvent.setup()
    render(<TooltipTrigger />)

    await user.tab()
    await waitFor(() => expect(getTriggerState()).toBe('open'))
    await user.click(screen.getByTestId(T_IDS.DROP))

    expect(getTriggerState()).toBe('closed')
    expect(screen.getByTestId(T_IDS.TRIGGER)).toHaveFocus()
  })

  it('shows the open state it is given, and closes through its setter, where given one', async () => {
    const user = userEvent.setup()
    const setOpen = vi.fn()
    render(<TooltipTrigger open setOpen={setOpen} />)

    expect(getTriggerState()).toBe('open')
    await user.click(screen.getByTestId(T_IDS.CLOSE))

    expect(setOpen).toHaveBeenCalledExactlyOnceWith(false)
    // Left to the owner of the state, which here keeps it open.
    expect(getTriggerState()).toBe('open')
  })
})
