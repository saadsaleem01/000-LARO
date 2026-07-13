# Accessibility Review (Phase 049)

Date: 2026-07-06 · Branch `Phase-Imp`

## What is implemented

The renderer ships accessibility utilities in `server/accessibility.ts` (a shared
util, despite the path): keyboard-activation handling, unique-id generation,
screen-reader announcements, a focus trap, visible-to-screen-reader checks,
accessible-label resolution, a `KeyboardShortcuts` manager, and a WCAG contrast
checker.

## Automated coverage (Phase 049)

`tests/a11y/accessibility.test.ts` unit-tests the pure helpers:
- `hasGoodContrast` — WCAG ratio thresholds (normal 4.5:1, large 3:1).
- `generateId` — unique, prefixed ids for label/for associations.

DOM-dependent helpers (focus trap, screen-reader announce, focus restoration)
require a jsdom environment + component rendering; those are covered when the
component test harness lands (jsdom + @testing-library/react — Phase 041 follow-up).

## Manual review checklist (for the desktop UI)

| Area | Guidance | Status |
|---|---|---|
| Keyboard navigation | All interactive controls reachable via Tab; Enter/Space activate | Utilities present; per-screen audit pending |
| Focus management | Modals trap focus and restore on close (`createFocusTrap`) | Helper implemented |
| Labels | Inputs have associated labels (`generateId` + `getAccessibleLabel`) | Helpers implemented |
| Colour contrast | Text meets 4.5:1 (dark theme) — verify tokens with `hasGoodContrast` | Checker available |
| Screen readers | Live-region announcements for async results (`announceToScreenReader`) | Helper implemented |
| Motion | Respect `prefers-reduced-motion` | Pending audit |

## Gaps / follow-ups

- Component-level a11y tests (roles, ARIA, focus order) need jsdom — deferred.
- A full axe-core audit of each screen is recommended before a production claim.
- The single legal-advice disclaimer (Phase 013) should be surfaced with an
  appropriate ARIA role where shown.
