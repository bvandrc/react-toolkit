import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useFocusVisibleOpen } from '../useFocusVisibleOpen'

/** A button showing whether the hook says it's open. */
const OpenOnFocusButton = () => {
  const { open, focusProps } = useFocusVisibleOpen()
  return (
    <button type="button" {...focusProps}>
      {open ? 'open' : 'closed'}
    </button>
  )
}

describe('useFocusVisibleOpen', () => {
  // The test DOM matches :focus-visible on any focus, a click's too, so
  // playwright/e2e/repo-link.spec.ts checks that a click opens nothing.
  it('opens on keyboard focus, and closes on blur', async () => {
    const user = userEvent.setup()
    render(<OpenOnFocusButton />)
    const button = screen.getByRole('button')

    await user.tab()
    await waitFor(() => expect(button.textContent).toBe('open'))
    await user.tab()
    expect(button.textContent).toBe('closed')
  })
})
