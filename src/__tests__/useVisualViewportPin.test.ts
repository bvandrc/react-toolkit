import { useRef, useState } from 'react'
import { act, renderHook } from '@testing-library/react'

import { mockVisualViewport } from '@/test-support'
import { useVisualViewportPin } from '../useVisualViewportPin'

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {
    // happy-dom does not implement native scrolling.
  })
})

/** Toggling `enabled` from the test drives the hook's own `enabled` param. */
const renderPin = () =>
  renderHook(() => {
    const ref = useRef<HTMLDivElement | null>(null)
    const [enabled, setEnabled] = useState(false)
    const setRef = useVisualViewportPin(ref, enabled)
    return { ref, setRef, setEnabled }
  })

/** Renders the pin enabled, with a fresh element attached. */
const renderPinnedEl = () => {
  const { result } = renderPin()
  act(() => result.current.setEnabled(true))
  const el = document.createElement('div')
  act(() => result.current.setRef(el))
  return { result, el }
}

describe('useVisualViewportPin', () => {
  it('pins the element to the visual viewport on attach', () => {
    mockVisualViewport({ offsetTop: 48, height: 800 })

    const { el } = renderPinnedEl()

    expect(el.style).toMatchObject({
      transform: 'translateY(48px)',
      height: '800px',
    })
  })

  it('repositions on a visual-viewport scroll, e.g. under pinch zoom', () => {
    const viewport = mockVisualViewport({ offsetTop: 48, height: 800 })
    const { el } = renderPinnedEl()

    viewport.change({ offsetTop: 72 }, 'scroll')

    expect(el.style.transform).toBe('translateY(72px)')
  })

  it('shrinks to the visual viewport height when the keyboard opens', () => {
    const viewport = mockVisualViewport({ height: 900 })
    const { el } = renderPinnedEl()

    // Keyboard opens: the visual viewport shrinks, the layout viewport does not.
    viewport.change({ height: 500 }, 'resize')

    expect(el.style.height).toBe('500px')
  })

  it('does nothing while disabled', () => {
    const viewport = mockVisualViewport({ offsetTop: 48, height: 800 })
    const { result } = renderPin()
    const el = document.createElement('div')
    act(() => result.current.setRef(el))

    viewport.change({ offsetTop: 72 }, 'scroll')

    expect(el.style).toMatchObject({ transform: '', height: '' })
  })

  it('clears the outgoing node when detached while still enabled', () => {
    mockVisualViewport({ offsetTop: 48, height: 800 })
    const { result, el } = renderPinnedEl()

    // The node detaches (e.g. React nulling the ref ahead of an unmount)
    // before `enabled` itself flips, so the effect cleanup alone wouldn't
    // still have this node to reset.
    act(() => result.current.setRef(null))

    expect(el.style).toMatchObject({ transform: '', height: '' })
  })

  it('clears its positioning once disabled again', () => {
    mockVisualViewport({ offsetTop: 48, height: 800 })
    const { result, el } = renderPinnedEl()

    act(() => result.current.setEnabled(false))

    expect(el.style).toMatchObject({ transform: '', height: '' })
  })
})
