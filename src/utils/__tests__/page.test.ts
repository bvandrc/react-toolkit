import { onAppLeave } from '../page'

/** Fires `visibilitychange` with the document reporting `state`. */
const changeVisibility = (state: DocumentVisibilityState) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('onAppLeave', () => {
  const callback = vi.fn()

  it('calls back when the app is hidden', () => {
    const unsubscribe = onAppLeave(callback)
    changeVisibility('hidden')
    unsubscribe()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('calls back when the page hides', () => {
    const unsubscribe = onAppLeave(callback)
    window.dispatchEvent(new Event('pagehide'))
    unsubscribe()
    expect(callback).toHaveBeenCalledOnce()
  })

  it('ignores the app becoming visible', () => {
    const unsubscribe = onAppLeave(callback)
    changeVisibility('visible')
    unsubscribe()
    expect(callback).not.toHaveBeenCalled()
  })

  it('stops calling back once unsubscribed', () => {
    onAppLeave(callback)()
    changeVisibility('hidden')
    window.dispatchEvent(new Event('pagehide'))
    expect(callback).not.toHaveBeenCalled()
  })
})
