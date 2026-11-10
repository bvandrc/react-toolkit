import { renderHook } from '@testing-library/react'

import { createRequiredContext } from '../required-context'

const [TestContext, useTestContext] = createRequiredContext<{ count: number }>(
  'TestProvider'
)

describe('createRequiredContext', () => {
  it('reads the value its provider gives', () => {
    const VALUE = { count: 3 }

    const { result } = renderHook(useTestContext, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <TestContext.Provider value={VALUE}>{children}</TestContext.Provider>
      ),
    })

    expect(result.current).toBe(VALUE)
  })

  it('throws, naming the provider, when read outside it', () => {
    // React logs the thrown render error on top of rethrowing it; mocked to
    // nothing so the expected throw doesn't print as a failure.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(useTestContext)).toThrow(
      'Must be used within a TestProvider'
    )
  })
})
