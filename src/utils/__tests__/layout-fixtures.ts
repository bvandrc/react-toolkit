/**
 * @fileoverview Elements laid out where a case needs them, for the tests of
 * the layout and focus scroll helpers.
 */

/** The window's height the cases stub, which an element's `top` lands inside or past. */
export const VIEWPORT_HEIGHT = 768

/** Creates an element laid out 20px tall at `top`, and `left` across, inside `parent`. */
export const createElementAt = (
  top: number,
  parent: ParentNode = document.body,
  left = 0
) => {
  const element = document.createElement('a')
  parent.append(element)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: left, y: top, width: 100, height: 20 })
  )
  return element
}

/** Creates a scroll container 100px tall, 200px down the viewport. */
export const createScrollContainer = () => {
  const container = document.createElement('div')
  container.style.overflowY = 'auto'
  document.body.append(container)
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 200, width: 100, height: 100 })
  )
  vi.spyOn(container, 'clientHeight', 'get').mockReturnValue(100)
  return container
}
