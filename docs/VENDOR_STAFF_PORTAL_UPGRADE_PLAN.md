# Vendor Staff Portal Upgrade Plan

**Goal**: Make the vendor staff portal look good, work functionally, match vendor/member styling, and implement all PRD functionality for staff to provide stamps and redeem rewards. The scan process must be slick, smooth, and the scan option must not be small or hard to navigate.

**Date**: 2026-02-08  
**Status**: Implemented (Milestone 9). See TASK.md and WALKTHROUGH.md.

---

## 1. Current State Summary

### What exists
- **Staff login** at `/v/:slug/staff`: Username + PIN; uses `AuthShell`; redirects to `/staff` (global route).
- **StaffDashboard** at `/staff`: Uses `html5-qrcode` scanner (250×250 qrbox, 500px container), calls `/tx/stamp` and `/tx/redeem` (missing `/api/v1` prefix), shows minimal UI (generic "Staff Dashboard", small scanner, basic result area).
- **API**: Staff login `POST /api/v1/v/:vendorSlug/auth/staff/login` (username, pin). Stamp `POST /api/v1/tx/stamp` (body: `{ token }`), Redeem `POST /api/v1/tx/redeem` (body: `{ token }`). Stamp response: `{ success, new_count }` only (no `stamps_required` or `is_full`).
- **Vendor styling**: `VendorLayout` sets CSS variables from `/api/v1/v/:slug/public`; `MemberCard` uses vendor branding (mesh gradient, glass panel, logo). Staff portal is **not** under vendor routes, so it does **not** get vendor styling.

### Gaps vs PRD (EPIC D — Staff stamping and redemption)
- **FR-D1** Staff login: Implemented (PIN + username; PRD says PIN-only but multi-staff needs identifier; current approach is acceptable).
- **FR-D2** Stamp: Backend validations in place; frontend uses wrong API path and lacks clear post-stamp UX (e.g. stamps X/Y, is_full).
- **FR-D3** Redeem: Backend in place; frontend needs explicit "Redeem" flow (scan → redeem or stamp→CARD_FULL→redeem) with clear UI.
- **FR-D4** Cooldown: Backend enforced.
- **FR-D5** Fraud throttles: Backend; verify rate limits exist.
- **Required screens**: PIN login ✓; Stamp (scan + confirm) — needs better scan UX and confirm; Redeem (scan + confirm) — needs prominent option.

### Specific issues
1. **Wrong API base path**: StaffDashboard calls `api.post('/tx/stamp', ...)` and `api.post('/tx/redeem', ...)`. All other app calls use `/api/v1/...`. Correct paths: `/api/v1/tx/stamp`, `/api/v1/tx/redeem`.
2. **Staff leaves vendor context after login**: Redirect to `/staff` loses `VendorLayout`; no vendor branding on staff dashboard.
3. **Stamp response incomplete**: Frontend expects `stamps_required`, `is_full`; API only returns `new_count`.
4. **Scanner too small**: 250×250 qrbox in 500px div; PRD requires scan option that is not "small and hard to navigate".
5. **No explicit Redeem intent**: Staff can only redeem after stamp returns CARD_FULL. PRD lists "Stamp (scan + confirm)" and "Redeem (scan + confirm)" as two screens — staff should be able to choose "Redeem" then scan.
6. **Generic styling**: No vendor logo, colours, or member-screen consistency.

---

## 2. Plan Overview

| # | Area | Action |
|---|------|--------|
| 1 | Routing & vendor context | Keep staff under `/v/:slug`; add post-login route `/v/:slug/staff/scan`; redirect to it after login so `VendorLayout` wraps staff UI and applies branding. |
| 2 | API paths (frontend) | Change StaffDashboard (or new StaffScan) to call `/api/v1/tx/stamp` and `/api/v1/tx/redeem`. |
| 3 | API stamp response | Extend stamp response to include `stamps_required`, `is_full` (and optionally `card_id`) so UI can show "X / Y stamps" and Redeem CTA without extra logic. |
| 4 | Vendor styling | Render staff scan UI inside VendorLayout; reuse same CSS variables, header style (logo/wordmark), and visual language as MemberCard/AuthShell (glass panel, primary/accent colours). |
| 5 | Scan UX | Large, prominent scanner: full-width or large min dimensions (e.g. min 320px, up to 80vw), clear "Scan customer's QR code" heading; single clear flow: scan → result → next. |
| 6 | Stamp + Redeem flows | Two clear entry points: (A) "Add stamp" — scan → stamp (or show "Card full — Redeem?" + Redeem button); (B) "Redeem reward" — scan → redeem (or show "Not enough stamps"). Success states: "Stamped! X/Y" and "Redeemed! New card ready." with prominent "Scan next". |
| 7 | Error handling | Friendly messages for TOKEN_REPLAYED, expired, CARD_FULL (with Redeem CTA), CARD_NOT_ELIGIBLE, RATE_LIMITED, etc., with "Try again" / "Scan next". |
| 8 | Documentation | Update WALKTHROUGH.md (staff portal steps), TASK.md (new milestone), API.md if response shape changes. |

---

## 3. Detailed Implementation Plan

### 3.1 Routing and vendor context

- **Current**: `/v/:slug/staff` → `StaffAuth`; on success → `navigate('/staff')` → `StaffDashboard` (global, no VendorLayout).
- **New**:
  - `/v/:slug/staff` → `StaffAuth` (unchanged).
  - Add route under `VendorLayout`: `/v/:slug/staff/scan` → protected staff-only component (e.g. `StaffScan` or renamed `StaffDashboard`).
  - After successful staff login: `navigate(\`/v/${slug}/staff/scan\`)` instead of `navigate('/staff')`.
  - Keep global `/staff` as a redirect or remove it: e.g. `/staff` → redirect to `/v/:slug/staff` (requires storing last vendor slug in localStorage or dropping global /staff). **Recommended**: Remove direct access to `/staff`; staff always enter via `/v/:slug/staff` and after login land on `/v/:slug/staff/scan`. If someone bookmarks `/staff`, redirect to landing or show "Go to your vendor's staff page".
- **Protected route**: Only render `/v/:slug/staff/scan` when user has STAFF or ADMIN role and (optionally) `user.vendorId` matches vendor for `slug`. Resolving slug to vendor_id requires either passing slug into the protected check or fetching vendor once; JWT already has vendor_id, so we can allow access when role is STAFF/ADMIN and optionally validate slug ↔ vendor_id for consistency.

### 3.2 API path fixes (frontend)

- In the staff scan page (StaffDashboard or StaffScan), replace:
  - `api.post('/tx/stamp', { token })` → `api.post('/api/v1/tx/stamp', { token })`
  - `api.post('/tx/redeem', { token })` → `api.post('/api/v1/tx/redeem', { token })`

### 3.3 API stamp response (backend)

- In `apps/api/src/modules/transaction/routes.ts`, stamp handler:
  - Transaction service already returns the updated card with `program` (e.g. `result.stamps_count`, `result.program.stamps_required`).
  - Return: `{ success: true, new_count: result.stamps_count, stamps_required: result.program.stamps_required, is_full: result.stamps_count >= result.program.stamps_required }`.
  - Optionally include `card_id` for consistency; not required for current UI.

### 3.4 Vendor styling for staff portal

- Ensure `/v/:slug/staff/scan` is a child of the same `VendorLayout` that wraps `/v/:slug/login` and member flows. VendorLayout already sets `--vendor-background`, `--primary`, `--secondary`, `--vendor-accent`, etc., and applies `minHeight: 100vh` and `background: var(--vendor-background)`.
- Staff scan page:
  - Use same header pattern as MemberCard: vendor logo (from `vendorData.branding.logo_url`), wordmark or `trading_name`, and a Sign out / Logout button. Get `vendorData` from `useOutletContext()` (VendorLayout passes `{ vendor: vendorData }`) or re-fetch `/api/v1/v/:slug/public` if needed.
  - Use same background and card treatment: e.g. mesh gradient or `var(--vendor-background)`, and glass-style panel for the scanner and result areas (reuse or mirror MemberCard/AuthShell styles).
  - Typography and buttons: use `var(--primary)`, `var(--vendor-accent)` for CTAs so it matches the member screen for that vendor.

### 3.5 Scan UX (slick and smooth; not small)

- **Scanner container**: Use a large, prominent area — e.g. full width with max-width (e.g. 400–500px), min height (e.g. 320px or 50vh), and the `html5-qrcode` viewfinder (qrbox) sized proportionally (e.g. 280×280 or 80% of container width, max 320px). Avoid a tiny 250×250 in a corner.
- **Hierarchy**: One primary action: "Scan customer's QR code" (or "Hold QR code in frame"). After scan: immediately show result (stamp success, card full, or error) in a clear panel below or replacing the scanner temporarily.
- **Flow**: Scan → decode token → call stamp (or redeem if in "Redeem" mode) → show result → "Scan next" resets scanner and clears result so staff can scan another customer without reloading.

### 3.6 Stamp and Redeem flows (PRD-aligned)

- **Two entry points** (two "screens" in the sense of two actions):
  1. **Add stamp** (default): Scanner is shown; on scan → POST stamp. If success: show "Stamped! X / Y" and "Scan next". If CARD_FULL: show "Card is full — ready to redeem" and a large "Redeem reward" button; on redeem success → "Redeemed! New card created." then "Scan next".
  2. **Redeem reward**: Staff can tap "Redeem reward" first (e.g. tab or button), then scan. On scan → POST redeem. If success: "Redeemed! New card created." If CARD_NOT_ELIGIBLE: "Card doesn't have enough stamps yet." Then "Scan next" or "Add stamp" to go back.
- **Implementation**: Two modes (e.g. `mode: 'stamp' | 'redeem'`). Default `stamp`. Toggle or second button "Redeem reward" sets `mode = 'redeem'` and next scan calls redeem instead of stamp. After any success or after showing Redeem CTA, "Scan next" resets to scanner and clears last token/result.

### 3.7 Error handling and edge cases

- **TOKEN_REPLAYED**: "This code was already used. Ask the customer to show the updated screen."
- **Token expired / invalid**: "Code expired or invalid. Ask the customer to refresh their card screen and try again."
- **CARD_FULL**: Show "Card is full!" and Redeem CTA (already planned).
- **CARD_NOT_ELIGIBLE** (redeem when not full): "This card doesn't have enough stamps yet."
- **RATE_LIMITED / cooldown**: "Please wait a few seconds before stamping again."
- **STAFF_DISABLED / VENDOR_SUSPENDED**: Redirect to login or show message per existing API behaviour.
- Always offer "Scan next" or "Try again" so staff can continue without reloading.

### 3.8 Documentation updates

- **WALKTHROUGH.md**: Add section for Staff portal: open `/v/:slug/staff`, login with username/PIN, land on scan screen; scan customer QR → stamp; when full → redeem; "Scan next" for next customer.
- **TASK.md**: Add milestone (e.g. "Milestone 9: Vendor Staff Portal Upgrade") with tasks: routing under vendor, API path fix, stamp response extension, vendor styling, scan UX, stamp/redeem flows, errors, docs.
- **API.md**: If stamp response shape is extended, document `stamps_required` and `is_full` in the Stamp Card response.

---

## 4. File-Level Checklist

| File | Change |
|------|--------|
| `apps/web/src/App.tsx` | Add route `/v/:slug/staff/scan` under VendorLayout (protected staff); remove or redirect global `/staff` if desired. |
| `apps/web/src/pages/StaffAuth.tsx` | After login, `navigate(\`/v/${slug}/staff/scan\`)` instead of `navigate('/staff')`. |
| `apps/web/src/pages/StaffDashboard.tsx` (or new `StaffScan.tsx`) | Move under vendor route; use `useParams('slug')` and `useOutletContext()` for vendor; fix API calls to `/api/v1/tx/stamp` and `/api/v1/tx/redeem`; add stamp/redeem mode toggle; enlarge scanner; apply vendor header and styling; handle all errors and success states; "Scan next" resets state. |
| `apps/api/src/modules/transaction/routes.ts` | Stamp handler: return `stamps_required` and `is_full` in response. |
| `docs/WALKTHROUGH.md` | Add staff portal walkthrough. |
| `docs/TASK.md` | Add Milestone 9 (or next) and sub-tasks. |
| `docs/API.md` | Document extended stamp response fields. |

---

## 5. Optional / Future

- **Manual token entry**: For broken cameras or accessibility, optional "Enter code" that accepts the rotating token string (paste from member screen). Not in initial scope.
- **Accessibility**: ARIA labels for scanner and buttons; focus management after scan.
- **Rate limits**: Confirm backend enforces FR-D5 (e.g. stamp 60/hour per staff, redeem 20/hour per staff) and document in API.md.

---

## 6. Summary

- **Routing**: Staff stays under `/v/:slug`; post-login page `/v/:slug/staff/scan` inside VendorLayout for branding.
- **API**: Fix frontend paths to `/api/v1/tx/*`; extend stamp response with `stamps_required` and `is_full`.
- **UI**: Vendor-styled header and layout; large, prominent scanner; two clear flows (Add stamp / Redeem reward) with success and error messaging and "Scan next" to keep the flow smooth and functional for staff.

This plan aligns the vendor staff portal with the PRD, matches vendor and member styling, and makes the scan process prominent and easy to use.
