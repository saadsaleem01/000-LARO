# Responsive & Browser Compatibility (Phase 050)

Date: 2026-07-06 · Branch `Phase-Imp`

## Target runtime

LARO ships as an **Electron desktop app**, so the renderer runs in a **single,
known Chromium** (bundled with Electron 29 — Chromium ~122). This removes the
usual cross-browser matrix: there is one engine to support, not many. The web
build (if hosted) would additionally target current evergreen browsers.

## Responsive approach

- **Tailwind CSS** provides the responsive system; layouts use its breakpoints
  (`sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`) and flex/grid utilities.
- Radix UI primitives (shadcn-style) supply accessible, responsive components
  (dialog, popover, dropdown, tabs, scroll-area).
- The desktop window is resizable; primary views should reflow from a narrow
  (~800px) to a wide (>1440px) window.

## Compatibility posture

| Concern | Status |
|---|---|
| Rendering engine | Single Electron Chromium — no legacy-browser support burden |
| Responsive utilities | Tailwind breakpoints + flex/grid in use across components |
| Minimum window | App is resizable; target ≥ 1024px wide for the dashboard |
| Hosted web build | Would target evergreen Chromium/Firefox/Safari (not the primary delivery) |

## What is verified vs pending

- **Verified:** Tailwind is configured and used; the app targets one Chromium.
- **Pending (manual):** a per-screen reflow pass at 800 / 1024 / 1440 px widths,
  and verification that tables and wide content scroll within their own
  containers rather than the page. This is a manual QA step (no automated visual
  regression yet — a candidate for Phase 051/052 tooling).

## Honest note

For a single-Chromium desktop app, "browser compatibility" is largely **N/A**;
the meaningful work here is **responsive reflow within the desktop window**,
which uses Tailwind and remains a manual QA item until visual-regression tooling
is added.
