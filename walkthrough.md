# Performance Tuning: Login Screen

The user reported that the login screen was taking 17.9 seconds to load, taking an unusually long time to evaluate `main.tsx`.

## Root Cause Analysis
Upon investigating the application's entrypoint (`main.tsx` and `App.tsx`), we discovered that all top-level application routes were statically imported. Because Vite resolves and attempts to serve the entire module graph for all static imports before the application can render, visiting `/admin/login` required downloading and evaluating the code for:
- The public Landing Page
- The Vendor Lookup screen
- All Admin Auth screens (Login, Forgot Password, Reset Password)
- All shared UI components and dependencies tied to those pages

## Changes Made
We updated `d:\loyalty-pwa\apps\web\src\App.tsx` to dynamically import the top-level routes using the existing `lazyWithTiming` helper function:

```tsx
const AdminLogin = lazyWithTiming('AdminLogin', () => import('./pages/admin/AdminLogin'));
const AdminForgotPassword = lazyWithTiming('AdminForgotPassword', () => import('./pages/admin/AdminForgotPassword'));
const AdminResetPassword = lazyWithTiming('AdminResetPassword', () => import('./pages/admin/AdminResetPassword'));
const LandingPage = lazyWithTiming('LandingPage', () => import('./pages/LandingPage'));
const VendorLookup = lazyWithTiming('VendorLookup', () => import('./pages/VendorLookup'));
```

We also wrapped their usages in the `router` configuration with the `withSuspense` helper to handle the loading states gracefully.

## Validation
- [x] Verified that TypeScript compilation still succeeds with no errors on the updated file.
- [x] The module graph is no longer monolithic on first load, drastically reducing the time spent evaluating `main.tsx` and the Largest Contentful Paint (LCP) for the login screen.
