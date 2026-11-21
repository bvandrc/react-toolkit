/**
 * @fileoverview Helpers for the input events the DOM fires, and the elements
 * that take them.
 */

import type { Point } from './layout'

/** The keys that activate a button. */
const ACTIVATION_KEYS = ['Enter', ' '] as const

/** Whether `key` is one that activates a button: Enter or Space. */
export const isActivationKey = (key: string) =>
  (ACTIVATION_KEYS as readonly string[]).includes(key)

/** The input types a key clicks natively, and which keys. */
const INPUT_ELEMENT_ACTIVATION_KEYS = {
  button: ACTIVATION_KEYS,
  submit: ACTIVATION_KEYS,
  reset: ACTIVATION_KEYS,
  image: ACTIVATION_KEYS,
  checkbox: [' '],
  radio: [' '],
} as const satisfies Partial<
  Record<React.HTMLInputTypeAttribute, readonly string[]>
>

/**
 * The keys the browser clicks `element` on by itself.
 *
 * Enter and Space for a button, a summary, and a button-like input; Space for
 * a checkbox or radio; Enter for a link; none for anything else.
 */
export const nativeActivationKeys = (element: Element): readonly string[] => {
  if (
    element instanceof HTMLButtonElement ||
    (element instanceof HTMLElement && element.tagName === 'SUMMARY')
  )
    return ACTIVATION_KEYS
  if (element instanceof HTMLAnchorElement)
    return element.hasAttribute('href') ? ['Enter'] : []
  if (element instanceof HTMLInputElement)
    return (
      (INPUT_ELEMENT_ACTIVATION_KEYS as Record<string, readonly string[]>)[
        element.type
      ] ?? []
    )
  return []
}

/** A keydown handler that clicks its element on Enter or Space, as a button does. */
export const clickOnActivationKey = (
  event: React.KeyboardEvent<HTMLElement>
) => {
  if (!isActivationKey(event.key)) return
  // Space would otherwise scroll the page.
  event.preventDefault()
  event.currentTarget.click()
}

/** Input types that take no typed text. */
const NON_TEXT_INPUT_TYPES: ReadonlySet<React.HTMLInputTypeAttribute> = new Set(
  [
    'button',
    'submit',
    'reset',
    'image',
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'hidden',
  ]
)

/** Whether `element` takes typed text: an input, a textarea, or contenteditable. */
export const isTextEntry = (element: Element | null): element is HTMLElement =>
  (element instanceof HTMLInputElement &&
    !NON_TEXT_INPUT_TYPES.has(element.type)) ||
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLElement && element.isContentEditable)

/**
 * Blurs the focused text input, textarea, or contenteditable element, if any.
 *
 * Returns whether it blurred one, so a caller can let that be all a key does.
 * A bare blur leaves focus on `<body>`, so pass `focusTo` to land it there
 * instead -- the dialog the field sits in, say, so focus doesn't leave it.
 */
export const blurFocusedTextInput = (focusTo?: HTMLElement | null): boolean => {
  const active = document.activeElement
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  ) {
    // Blurred before `focusTo` is focused, rather than left to that focus to
    // move: one that can't take focus would leave the field focused.
    active.blur()
    focusTo?.focus()
    return true
  }
  return false
}

/**
 * Whether `event` belongs to an IME composition, such as the Enter that
 * commits a candidate -- a key the field should leave to the IME.
 *
 * Catches Safari's committing keydown too, which `event.isComposing` alone
 * reports as not composing.
 */
export const isComposing = (event: KeyboardEvent) =>
  // Safari can report the committing keydown as not composing, but always
  // gives it keyCode 229.
  event.isComposing || event.keyCode === 229

/**
 * Whether a pointer event is the primary pointer's main button: the first
 * finger down, or a left click.
 */
export const isPrimaryPress = (
  event: Pick<PointerEvent, 'isPrimary' | 'button'>
) => event.isPrimary && event.button === 0

type PositionedEvent =
  | Pick<MouseEvent, 'clientX' | 'clientY'>
  | { touches: ArrayLike<Pick<Touch, 'clientX' | 'clientY'>> }

/**
 * Where a mouse or touch event's pointer is, relative to the viewport.
 *
 * For a touch, that is the first finger still down, so `null` on a `touchend`
 * that lifted the last one. Takes React's events and the DOM's alike.
 */
export const clientPointOf = (event: PositionedEvent): Point | null => {
  // A touch event carries its points in `touches`; a mouse event is the point.
  const point = 'touches' in event ? event.touches[0] : event
  return point ? { x: point.clientX, y: point.clientY } : null
}
