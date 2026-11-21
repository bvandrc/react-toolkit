import { fireEvent, render, screen } from '@testing-library/react'

import {
  blurFocusedTextInput,
  clickOnActivationKey,
  clientPointOf,
  isComposing,
  isPrimaryPress,
  isTextEntry,
  nativeActivationKeys,
} from '../input'

/** Builds an element from `html`, the way a trigger would render. */
const buildElement = (html: string) => {
  const template = document.createElement('template')
  template.innerHTML = html
  const element = template.content.firstElementChild
  if (!element) throw new Error(`No element in ${html}`)
  return element
}

describe('clickOnActivationKey', () => {
  const onClick = vi.fn()

  it('clicks its element on Enter or Space, and nothing else', () => {
    render(
      // biome-ignore lint/a11y/useSemanticElements: stands in for a non-button control
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={clickOnActivationKey}>
        Option
      </div>
    )
    const option = screen.getByRole('button')

    for (const key of ['Enter', ' ', 'a', 'Tab'])
      fireEvent.keyDown(option, { key })

    expect(onClick).toHaveBeenCalledTimes(2)
  })
})

describe('blurFocusedTextInput', () => {
  it('blurs a focused text field and says so', () => {
    render(<input aria-label="Name" />)
    const input = screen.getByRole('textbox')
    input.focus()

    expect(blurFocusedTextInput()).toBe(true)
    expect(document.activeElement).not.toBe(input)
  })

  it('moves focus to `focusTo` rather than dropping it on the page', () => {
    render(
      <div role="dialog" aria-label="Edit" tabIndex={-1}>
        <input aria-label="Name" />
      </div>
    )
    screen.getByRole('textbox').focus()

    expect(blurFocusedTextInput(screen.getByRole('dialog'))).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('still leaves the field when `focusTo` cannot take focus', () => {
    render(<input aria-label="Name" />)
    const input = screen.getByRole('textbox')
    input.focus()
    // happy-dom lets anything on the page take focus, so one off the page
    // stands in for an element that can't.
    const UNFOCUSABLE = document.createElement('div')

    expect(blurFocusedTextInput(UNFOCUSABLE)).toBe(true)
    expect(document.activeElement).not.toBe(input)
  })

  it('leaves a non-input focused', () => {
    render(<button type="button">Save</button>)
    const button = screen.getByRole('button')
    button.focus()

    expect(blurFocusedTextInput()).toBe(false)
    expect(document.activeElement).toBe(button)
  })
})

describe('nativeActivationKeys', () => {
  it('lists the keys the browser clicks each element on', () => {
    for (const [html, keys] of [
      ['<button></button>', ['Enter', ' ']],
      ['<summary></summary>', ['Enter', ' ']],
      ['<input type="button">', ['Enter', ' ']],
      ['<input type="checkbox">', [' ']],
      ['<a href="/">x</a>', ['Enter']],
      // No href: not a link, so nothing clicks it.
      ['<a>x</a>', []],
      ['<input type="text">', []],
      ['<span tabindex="0"></span>', []],
    ] as const) {
      expect(nativeActivationKeys(buildElement(html)), html).toEqual(keys)
    }
  })
})

describe('isComposing', () => {
  it('is true while an IME composes, including the keydown Safari commits on', () => {
    for (const [init, reason] of [
      [{ isComposing: true }, 'composing'],
      [{ isComposing: false, keyCode: 229 }, 'Safari: keyCode 229'],
    ] as const) {
      expect(isComposing(new KeyboardEvent('keydown', init)), reason).toBe(true)
    }
  })

  it('is false for an ordinary key', () => {
    expect(isComposing(new KeyboardEvent('keydown', { key: 'Enter' }))).toBe(
      false
    )
  })
})

describe('isPrimaryPress', () => {
  it('is true for the main button or first finger alone', () => {
    for (const [press, expected, reason] of [
      [{ isPrimary: true, button: 0 }, true, 'the main button or first finger'],
      [
        { isPrimary: true, button: 2 },
        false,
        'right-click, for the context menu',
      ],
      [{ isPrimary: true, button: 1 }, false, 'middle-click'],
      [
        { isPrimary: false, button: 0 },
        false,
        'a second finger, as in a pinch',
      ],
    ] as const) {
      expect(isPrimaryPress(press), reason).toBe(expected)
    }
  })
})

describe('isTextEntry', () => {
  it('is true only for elements that take typed text', () => {
    for (const [html, expected] of [
      ['<input type="text">', true],
      ['<input>', true],
      ['<textarea></textarea>', true],
      ['<div contenteditable="true"></div>', true],
      // Inputs that take no typed text, and click on their own keys instead.
      ['<input type="checkbox">', false],
      ['<input type="button">', false],
      ['<span></span>', false],
    ] as const) {
      const element = buildElement(html)
      // Attached, since contenteditable only counts in the document.
      document.body.append(element)
      expect(isTextEntry(element), html).toBe(expected)
    }
  })
})

describe('clientPointOf', () => {
  type PointEvent = Pick<MouseEvent | Touch, 'clientX' | 'clientY'>
  const MOUSE_EVENT = { clientX: 50, clientY: 100 } satisfies PointEvent
  const FINGER = { clientX: 50, clientY: 100 } satisfies PointEvent
  const SECOND_FINGER = {
    clientX: 300,
    clientY: 400,
  } satisfies PointEvent

  it('reads a mouse event straight off the event', () => {
    expect(clientPointOf(MOUSE_EVENT)).toEqual({ x: 50, y: 100 })
  })

  it('reads a touch event off its first finger', () => {
    expect(clientPointOf({ touches: [FINGER, SECOND_FINGER] })).toEqual({
      x: 50,
      y: 100,
    })
  })

  it('is null for a touch event with no finger still down, as on the last touchend', () => {
    expect(clientPointOf({ touches: [] })).toBeNull()
  })
})
