# Self-Service Signup Audit

Date: 2026-06-30

## Scope

Reviewed the vendor self-service signup and immediate post-signup setup path in the Docker dev stack:

- Public business entry at `/`
- Vendor portal entry at `/vendor/login`
- Owner login at `/vendor/admin/login`
- Vendor registration form at `/vendor/register`
- Vendor setup wizard at `/v/demo-cafe/admin/onboarding`

Evidence limit: SMTP appears to be configured with real values in `.env`, so the registration form was not submitted. The email-code and password/slug steps were reviewed from source and route behavior, but not captured as live browser states.

## Screenshots

1. `01-landing-entry.png` — public landing entry
2. `02-vendor-portal-entry.png` — vendor/staff portal entry
3. `03-owner-admin-login.png` — owner/admin email login
4. `04-registration-details.png` — registration details form
5. `05-registration-filled-not-submitted.png` — registration details filled, not submitted
6. `06-vendor-dashboard-after-login.png` — owner dashboard after demo login
7. `07-onboarding-business.png` — setup wizard business step
8. `08-onboarding-program.png` — setup wizard program step
9. `09-onboarding-branding.png` — setup wizard branding step
10. `10-onboarding-staff.png` — setup wizard staff step
11. `11-onboarding-launch.png` — setup wizard launch step
12. `12-registration-mobile.png` — mobile registration first step

## Step Notes

1. Public landing entry: Healthy for manual sales, weak for self-service. The primary business CTA opens email contact instead of registration.
2. Vendor portal entry: Clear distinction between staff and owner login, but the dominant action is staff login. New vendor registration is a small secondary text link.
3. Owner/admin login: Coherent. It clearly says owners/managers use email and password, and offers account creation.
4. Registration details: Short and visually easy. It asks for sensible data and does not feel heavy. Missing context: code expiry, email troubleshooting, and what happens next.
5. Email code/password/slug steps: Coherent in code, but underexplained. The user only learns about the store slug at the final password step.
6. Setup wizard: Good high-level structure. The six steps match the business setup model.
7. Business step: Useful fields, but starts abruptly and repeats information already collected during registration.
8. Program step: Simple but assumes the owner knows what reward terms and economics should be.
9. Branding step: Easy color controls, but no live card preview in the wizard.
10. Staff step: Important and mostly understandable. It explains username/PIN, but does not show the staff login URL or make staff creation feel required for launch.
11. Launch step: Too thin for a launch moment. It summarizes URL, reward, and staff count, but gives no QR, copyable customer link, staff bookmark link, or mail-help fallback.
12. Mobile registration: Usable at 390px wide, but first/last name stay side-by-side and feel tight.

## UX Findings

1. The biggest coherence issue is the entry path. The landing page still presents "Get PunchCard For Your Business" as an email CTA, while self-service lives behind secondary login/register links.
2. "Vendor", "Vendor Portal", "Vendor Admin", "Store Slug", "owner/admin", and "staff portal" are all used. Each is defensible, but together they create avoidable vocabulary load.
3. The registration form itself is not too complex. The complexity appears after registration: the vendor is asked to configure business, program, branding, staff, billing, and launch without much help text.
4. The wizard is directionally right, but launch readiness is not explicit. A vendor can reach launch without being walked through staff login, customer QR, or support contact.
5. Support access is good on the marketing page but absent inside the registration form and setup wizard.

## Accessibility Risks

1. Shared `AdminInput` renders labels without `htmlFor` or wrapped input association, so accessible names are weak or missing for screen readers and browser autofill.
2. The registration progress indicator is visual only and hidden from assistive tech; users do not get "step 1 of 3" or the current step name.
3. The dark form UI uses several low-contrast muted labels, links, and helper texts. This needs contrast measurement before claiming WCAG conformance.
4. The onboarding step buttons are compact and dense on desktop; mobile behavior was only lightly checked.

## Recommendations

1. Decide the primary signup model on the landing page: if self-service is real, make "Start free trial" or "Create vendor account" the primary CTA and keep "Email us" as secondary help.
2. Rename the paths in user-facing copy around roles: use "Business owner login", "Staff login", and "Store ID" consistently.
3. Turn registration into a true three-step wizard with explicit labels: Business details, Verify email, Create password and Store ID.
4. Add a persistent "Need help? Email info@punchcard.co.za" link to registration and setup screens.
5. Strengthen the setup wizard launch step with copyable customer QR/link, staff login URL, first staff checklist, and a mail support link.
6. Fix form accessibility centrally in `AdminInput` by generating/stitching `id` and `htmlFor`, and expose step progress text.
