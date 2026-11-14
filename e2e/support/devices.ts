/**
 * Tags for tests that belong to one device project only. `playwright.config.ts` leaves a
 * tagged test out of the other project (`grepInvert`), so it is never scheduled there.
 * Use these instead of `test.skip(isMobile, ...)`: a runtime skip still schedules the test
 * and shows up in the Allure report as a skipped test with an error message.
 */
export const DEVICE_TAGS = {
  /** Keyboard-only journeys and other checks that run once, on `chromium-desktop`. */
  desktopOnly: "@desktop-only",
  /** Touch gestures, which need the phone descriptor of `chromium-mobile`. */
  phoneOnly: "@phone-only",
} as const;
