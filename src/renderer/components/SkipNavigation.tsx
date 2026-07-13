/**
 * Skip Navigation Component
 * 
 * Allows keyboard users to skip directly to main content,
 * bypassing navigation menus. WCAG 2.1 Level A requirement.
 */

export default function SkipNavigation() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      {/* ARIA live region for screen reader announcements */}
      <div
        id="aria-live-region"
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </>
  );
}

