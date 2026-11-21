/**
 * @fileoverview What kind of device the page is running on.
 */

/** The media query `isTouchDevice` matches: a primary pointer as imprecise as a finger. */
export const TOUCH_QUERY = '(pointer: coarse)'

/**
 * Whether the primary pointer is as imprecise as a finger, per `TOUCH_QUERY`.
 *
 * A touchscreen laptop whose primary pointer is its trackpad reports false.
 * False outside a browser.
 */
export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia(TOUCH_QUERY).matches

export type DeviceType = 'ios' | 'android' | 'desktop'

/**
 * Which platform the page is running on, from `navigator.userAgent`.
 *
 * An iPad requesting desktop sites, as iPadOS Safari does by default, sends a
 * Mac user agent, so it reads as `desktop`; check `isTouchDevice` for touch.
 */
export const detectDevice = (): DeviceType => {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}
