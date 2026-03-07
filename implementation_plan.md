# Implement Lazy Loading for Top-Level Routes

The 17.8-second load time before `main.tsx` is evaluated is caused by Vite having to resolve, transform, and serve the entire dependency tree of all statically imported routes before the browser can even start rendering the app.

In `App.tsx`, the following routes are currently statically imported:
- `LandingPage`
- `VendorLookup`
- `AdminLogin`
- `AdminForgotPassword`
- `AdminResetPassword`

This means that when a user visits `/admin/login`, their browser must still download the code for `LandingPage`, `VendorLookup`, and the password reset flows before `main.tsx` finishes evaluating.

## Proposed Changes

### apps/web/src/App.tsx
- [MODIFY] [App.tsx](file:///d:/loyalty-pwa/apps/web/src/App.tsx)
  - Remove synchronous imports for `AdminLogin`, `AdminForgotPassword`, `AdminResetPassword`, `LandingPage`, and `VendorLookup`.
  - Replace them with `lazyWithTiming` dynamically imported components.
  - This ensures only the requested route is loaded over the network when the app first boots.

## Verification Plan

### Automated Tests
- Since this is a React Frontend routing optimization, no existing backend tests will break.
- We will verify that TypeScript compilation still passes (`npm run typecheck` or similar inside `apps/web` if available).

### Manual Verification
- Start the Vite dev server.
- Open the Network and Performance tabs in the browser.
- Navigate to `http://localhost:5173/admin/login`.
- Verify that `main.tsx evaluated` logs much faster (typically < 1-2 seconds) instead of 17.8s.
- Navigate to the landing page (`/`) to ensure it still works correctly and is lazy-loaded.
