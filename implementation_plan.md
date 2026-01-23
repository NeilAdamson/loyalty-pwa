# Vendor Branding Implementation Plan

## Goal
Implement first-class vendor branding where specific colors, logos, and styles are loaded dynamically per vendor slug and applied to the PWA (Login, Card, etc.).

## 1. Data Model (Schema)
Update `VendorBranding` model in `schema.prisma`.

### New Fields
- `accent_color` (String, default: #hex)
- `background_color` (String?, optional)
- `card_style` (String, default: 'SOLID') // 'SOLID', 'GRADIENT', 'GLASS'
- `card_bg_image_url` (String?, optional)
- `wordmark_url` (String?, optional)

## 2. API Updates
### `GET /api/v1/v/:slug/public`
- Ensure it returns the full `branding` object including the new fields.
- Currently it returns `active_program` and basic vendor info. We need to explicitly include `branding`.

## 3. Frontend (PWA) Implementation
### `VendorLayout.tsx`
- Expand the CSS variable injection to include:
    - `--vendor-accent`
    - `--vendor-background`
    - `--vendor-card-style`
- Ensure no-flicker loading (skeleton or blocking load).

### `MemberAuth.tsx` & `StaffAuth.tsx`
- Ensure buttons and inputs use the new CSS variables (`var(--primary)`, `var(--accent)`).

### `MemberCard.tsx`
- Update the card design to:
    - Show `logo_url` and `trading_name`.
    - Adapt style based on `card_style` (Solid vs Gradient).
    - Use `accent_color` for highlights.

## 4. Admin Portal (Future / Stub)
- For now, we only implement the Schema and Consumption.
- Admin UI for editing will be Phase 2 (or minimal update if time permits).

## Plan
1.  [ ] **DB**: Update `schema.prisma` and run migration.
2.  [ ] **API**: Update `vendor.routes.ts` to include branding in public endpoint.
3.  [ ] **FE**: Update `VendorLayout.tsx` to apply new themes.
4.  [ ] **FE**: Refactor `MemberCard` to use branding data.
