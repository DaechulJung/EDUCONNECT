import type { Browser } from '@e2e-dev/web'

// Screen widths the E2E suite runs at (docs/prd.md 4.2: parent conditions assume a phone width,
// organization conditions a desktop width). The target in e2e.config.ts starts every attempt at
// PARENT; a test that signs in as academy or school staff calls asOrg first, and asParent again
// before it goes back to a parent screen in the same attempt.
export const PARENT = { width: 390, height: 844 }
export const ORG = { width: 1280, height: 800 }
// Parent screens on a PC browser: the parent frame stays 480px wide inside it (layout regression).
export const PARENT_PC = { width: 1440, height: 900 }

export const asParent = (browser: Browser) => browser.setViewport(PARENT)
export const asOrg = (browser: Browser) => browser.setViewport(ORG)
