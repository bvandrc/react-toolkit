import { mockVisualViewport } from '../mock-visual-viewport'

describe('mockVisualViewport', () => {
  it('starts as the whole window, with no keyboard open', () => {
    vi.stubGlobal('innerHeight', 600)

    mockVisualViewport()

    expect(window.visualViewport).toMatchObject({ offsetTop: 0, height: 600 })
  })

  it('takes what the case sets over the defaults', () => {
    mockVisualViewport({ offsetTop: 20, height: 300 })

    expect(window.visualViewport).toMatchObject({ offsetTop: 20, height: 300 })
  })

  it('updates on `change`, and fires the event named', () => {
    const viewport = mockVisualViewport({ height: 800 })
    const onResize = vi.fn()
    window.visualViewport?.addEventListener('resize', onResize)

    viewport.change({ height: 500 }, 'resize')

    expect(window.visualViewport).toMatchObject({ height: 500 })
    expect(onResize).toHaveBeenCalledOnce()
  })
})
