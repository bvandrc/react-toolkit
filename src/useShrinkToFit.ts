/**
 * @fileoverview Hook that steps a line's text down through a set of sizes
 * until the line stops wrapping, measuring again as its width changes.
 */

import { useState } from 'react'
import { useIsomorphicLayoutEffect } from 'usehooks-ts'

import { getContentHeight } from './utils'

type Fit = { step: number; isSettled: boolean }

const UNMEASURED: Fit = { step: 0, isSettled: false }

/**
 * How many steps down from its largest size a line's text takes: the fewest
 * that keep the line on one line, or none where no step does.
 *
 * `lineRef` is the line, `textRef` the text whose height one line is, which
 * must not wrap itself (`white-space: nowrap`, or a flex item that doesn't
 * shrink), and `stepCount` how many sizes the text has, largest first. It
 * measures before the browser paints, so no size flashes, and again whenever
 * the line's width or `stepCount` changes, or a font loads.
 */
export const useShrinkToFit = (
  lineRef: React.RefObject<HTMLElement | null>,
  textRef: React.RefObject<HTMLElement | null>,
  stepCount: number
) => {
  const [fit, setFit] = useState<Fit>(UNMEASURED)
  // A new set of sizes is measured again from the largest, before the render
  // with it commits, so the step never runs past the last size.
  const [measuredStepCount, setMeasuredStepCount] = useState(stepCount)
  if (stepCount !== measuredStepCount) {
    setMeasuredStepCount(stepCount)
    setFit(UNMEASURED)
  }
  useIsomorphicLayoutEffect(() => {
    const line = lineRef.current
    const text = textRef.current
    if (fit.isSettled || !line || !text) {
      return
    }
    // Wrapped, where the line's content runs taller than its text's own line.
    if (getContentHeight(line) <= text.offsetHeight) {
      setFit({ step: fit.step, isSettled: true })
    } else if (fit.step < stepCount - 1) {
      setFit({ step: fit.step + 1, isSettled: false })
    } else {
      // Where even the smallest size wraps, shrinking saves nothing.
      setFit({ step: 0, isSettled: true })
    }
  }, [fit, lineRef, textRef, stepCount])
  useIsomorphicLayoutEffect(() => {
    const line = lineRef.current
    if (!line) {
      return
    }
    let width = line.offsetWidth
    const observer = new ResizeObserver(() => {
      // Only its width changes what fits; its height changes as it measures.
      const newWidth = line.offsetWidth
      if (newWidth === width) {
        return
      }
      // Narrower, no larger size fits that didn't before, so it steps on from
      // where it is; wider, it starts again from the largest.
      const isNarrower = newWidth < width
      width = newWidth
      setFit(({ step }) =>
        isNarrower ? { step, isSettled: false } : UNMEASURED
      )
    })
    observer.observe(line)
    // A font that loads late changes how wide the text runs, whenever it
    // starts loading. Not every DOM has `document.fonts`.
    const fonts = document.fonts as FontFaceSet | undefined
    const remeasure = () => setFit(UNMEASURED)
    fonts?.addEventListener('loadingdone', remeasure)
    return () => {
      observer.disconnect()
      fonts?.removeEventListener('loadingdone', remeasure)
    }
  }, [lineRef])
  return fit.step
}
