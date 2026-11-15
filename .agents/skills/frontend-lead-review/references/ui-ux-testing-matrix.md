# Frontend Lead UI, UX, Architecture & Testing Matrix

Use this deep inspection reference when running a `frontend-lead-review`. Report only defects verified in code, command output, or browser observation with exact `file:line` and reproduction steps.

## 1. UI Craft & Design System Audit
- **Palette & Tokens**: Verify strict alignment with project identity (`#0b0b0b` dark, `#ffffff`/`#f6f5f2` light, `#ed3541` accent for Hallopedia). Flag stray Tailwind colors (`blue-*`, `indigo-*`, `purple-*`, generic SaaS gradients) and unconfigured utility classes (e.g. `duration-250` when Tailwind config omits it).
- **Copy & Production Readiness**: Flag leaked developer/debug text (`DUMMY`, `TODO`, `SIMULASI`, lorem ipsum, `console.log`) visible in UI templates.
- **Visual Contrast & Readability**: Flag low-contrast combinations (e.g. `#555` on `#0b0b0b`, `#888` on `#f6f5f2` at `9px-10px`), clipped headlines, overlapping elements, or unstyled scroll overflow.
- **Responsive Geometry & Touch Targets**: Check mobile/tablet breakpoints (`375px`, `768px`, `1440px`) for grid column squeezing (`min-w-0`), modal/drawer scroll clipping, fixed/sticky nav overlap, and comfortable clickable sizes (`>= 44px` target height on mobile controls).
- **Asset & CSS Hygiene**: Flag heavy unoptimized media (`preload="auto"` on multi-MB video), unreferenced images bloating `public/`, and dead CSS rules.

## 2. UX Flow & Business-Logic Integrity
- **End-to-End Task Flow**: Trace the primary user path from entry -> filter/compare -> configure -> next action (checkout/consultation). Flag **dead controls** (buttons without handlers/routes) and **dead-end panels** (drawers/modals that configure an order with no CTA out).
- **Filter & Control Semantics**: Check whether filter pills belong to their group label (e.g. distribution mode vs geographic region) and whether toggling options preserves valid domain constraints (e.g. `COLLAB_POST` minimum 2 accounts).
- **Price & State Consistency**: Cross-check displayed card/summary prices against calculator/drawer functions across every item in static or fetched data. Any discrepancy between overview price and configurator total is a **Critical** bug.
- **Boundary & Empty States**: Verify loading, error, empty-filter, and max-limit states offer clear recovery actions rather than blank grids or confusing disabled styling.

## 3. Frontend Architecture, Reactivity & Motion
- **Nuxt 4 & Module Boundaries**: Check `app/pages/`, `app/layouts/`, `app/components/`, auto-imports, and single-root templates for page transitions. Flag monolithic `>400` line components mixing state machines, calculators, and markup where Deep Modules / composables belong.
- **Discriminated Unions**: Flag boolean-soup modal/async flags instead of explicit union states.
- **GSAP & Lenis Lifecycle**:
  - `prefers-reduced-motion` check before registering entrance/scroll animations.
  - `gsap.context(..., root)` + `revert()` on `onBeforeUnmount`.
  - Reactive DOM mutations (`v-if` filter toggles, accordion expansions): verify `ScrollTrigger.refresh()` runs after DOM updates and newly mounted cards never stay stuck at `opacity: 0` or remain clickable while invisible (`opacity: 0` without `visibility: hidden` / `autoAlpha: 0`).
  - Scroll-locking modals must stop/restart Lenis reliably even on `Esc` or route navigation.

## 4. Accessibility (A11y) & Semantics
- **Document Landmarks & Headings**: One `<h1>` per page, sequential `<h2>`->`<h3>` hierarchy, `<main>`, `<header>`, `<nav>`, `<footer>`, `app.head` (`lang`, `title`, `description`).
- **Interactive Controls**: Every `<button>` / `<a>` needs visible `:focus-visible` outlines, semantic attributes (`aria-expanded`, `aria-controls`, `aria-pressed`), real `disabled` or `aria-disabled` behavior (never `cursor-not-allowed` alone), and `aria-live="polite"` on dynamic status/error notices.
- **Dialog / Drawer Accessibility**: Move focus inside on open, trap `Tab`/`Shift+Tab`, close on `Esc`, and restore focus to the trigger button on close.

## 5. Verification & Testing Execution Guide
1. **Static & Build Verification** (Run directly; never extrapolate):
   - Typecheck: `npx nuxi typecheck`
   - Production bundle: `npm run build`
   - Lint / format if configured in `package.json` (`npm run lint`).
2. **Automated Test Execution & Gap Analysis**:
   - Run existing unit/component/E2E suites (`npx vitest run`, `npx playwright test`, `npm test`) if configured.
   - If pure business helpers exist (price calculators, filters, validators) with **no test runner/tests installed**, explicitly flag the coverage gap and name exact unit/E2E test cases required before release.
3. **Live Browser UI/UX Walkthrough** (via `browser` subagent or Chrome DevTools MCP when dev server is available):
   - Verify desktop (`1440x900`) and mobile (`375x812`) layout with zero horizontal overflow (`scrollWidth <= innerWidth`).
   - Test primary interactions end-to-end (nav menu, every filter combination including empty states, opening/closing drawers with mouse and keyboard `Tab`/`Esc`, image/logo loading `naturalWidth > 0`, console & network 4xx/5xx error check).
   - If the dev server or browser tool cannot be run in the current step, state explicitly `LIVE BROWSER CHECK: NOT RUN` and withhold `APPROVED`.

