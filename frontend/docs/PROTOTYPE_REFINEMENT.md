# ILILLII prototype refinement — phase 08

## Scope

This is the existing React/Figma Make design prototype, not a newly connected application. No backend, live order, message submission, payment verification, staff authentication, persistent settings, or real QR generation is introduced.

## Foundation and reusable patterns

- `src/shared-ui.tsx`: existing vector logo and outline icons, named native-dialog component, reusable dialog lifecycle and scroll/focus restoration.
- `src/ui-patterns.tsx`: quantity control, explicit payment/order status badge, recovery state panel, and pagination.
- `src/refinements.css`: semantic spacing/control/radius tokens; shared hover/pressed/focus/disabled/loading behavior; readable prices, payment instructions and errors; reduced-motion support.
- `src/language.tsx`: one session-only preference shared across Home, Menu, Contact, checkout, footer, payment and staff previews.
- `/design-system`: component examples, journey links, and owner-confirmation checklist.

## Targeted audit fixes

1. Replaced page-local language preferences with shared context; corrected the homepage's language option IDs.
2. Moved reusable logo/icon/dialog code out of the homepage, removing the circular presentation dependency.
3. Labeled dialogs accessibly and consolidated native modal focus and background-scroll handling.
4. Preserved dine-in details when the customer edits the cart and returns.
5. Closed checkout/payment overlays when navigating to another public page.
6. Consolidated phone validation; punctuation-only and malformed numbers are rejected.
7. Linked checkout errors to the relevant fields and scrolled error summaries into view.
8. Separated payment and preparation timelines; mode-specific ready/delivery states no longer leak into other order types.
9. Added explicit menu loading/unavailable states and recovery without clearing the cart.
10. Added shared pagination and empty-search treatment to managed menus, and pagination to the full orders list.
11. Increased narrow-screen control sizes and the legibility of important prices, notes, instructions and statuses.
12. Reduced duplicated welcome/demo controls above the mobile menu and omitted its optional editorial photo on narrow layouts.
13. Removed the unreachable old homepage menu dialog.
14. Served Google fonts and inspected editorial photography locally after browser inspection found broken remote resources.
15. Added a compact, transparent total near the top of mobile/tablet checkout, rather than making customers scroll past the whole form.
16. Adapted mobile order tables into readable order cards with reachable detail actions, and collapsed non-operational prototype controls.
17. Reused the canonical payment-status type in staff views; cash-at-table demo orders begin as `Unpaid`.
18. Kept known order references and immutable payment-preview amounts together when opening payment records.

## Validation commands

- `pnpm build`
- `pnpm exec tsc --noEmit`
- `node scripts/verify-prototype-models.mjs`

Browser verification uses Chromium against the already-running preview, with test tooling installed only in `/tmp` rather than changing application dependencies.

## Browser verification results

All 11 end-to-end groups passed:

1. Homepage to menu, quantity increase/decrease, removal and empty cart.
2. Cross-page language preference and retained cart.
3. QR dine-in, invalid optional phone, retained name after editing, confirmation and tracking.
4. Pickup required details, pending confirmation and reference/private-code lookup.
5. Delivery address validation, unrecognized area, availability illustration and unconfirmed fee.
6. Telebirr pending/failure and CBE local verification/receipt illustrations.
7. Menu unavailable/loading-state entry and no-search-results recovery.
8. Staff order acceptance without changing payment status.
9. Menu draft editing and pagination.
10. Authorized bank-review illustration and restricted-role access denial.
11. Narrow dashboard navigation and map-error recovery.

The responsive matrix passed 72 screen/viewport checks at **360, 390, 768 and 1440 px**, with no page/dialog horizontal overflow, no broken visible images, and successful local Ethiopic font loading. Inspected screenshots include mobile checkout, payment instructions, menu, mobile dashboard, tablet delivery, desktop homepage and the component guide.

An additional 33 admin-section/viewport checks passed across **360, 768 and 1440 px**, including all sidebar sections. Table-edit and staff-invite illustrations also passed.

These are browser-based checks of the Make app, not proof of a live order, payment, authorization, delivery or messaging service.

## Remaining owner confirmations

- Original menu spellings, category labels, prices, item availability, item-specific photos, descriptions and allergen information.
- Verified phone, exact street address, Google Maps place link, opening hours, and official social links.
- Delivery zones, fees, any minimum order, pickup/delivery availability, and payment-before-preparation policy.
- Intended CBE merchant account and approved Telebirr/CBE integrations.
- Afaan Oromo and Amharic translations reviewed by fluent local speakers.
- Staff roles, table registry, order cancellation/refund rules, and any preparation targets or estimates.

## Prototype limits

- State survives in-app navigation where practical, but remains session-only; a browser reload resets demo records.
- A demo-table fixture is not a verified hotel table.
- Manual status and payment-success examples remain explicitly simulated.
- Coverage cannot be confirmed without owner-provided policies. An unknown delivery fee is never treated as zero or silently added to a payable total.
- Public guest lookup is a local reference/private-code illustration, not production authentication.
