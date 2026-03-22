# Nord Review — QA Bug Report

**Tested by:** Claude (QA Session)
**Date:** 2026-03-21
**Environment:** localhost:3000, Dark mode, Chrome 146, macOS
**App version:** Pre-commit (development build)

---

## Critical Bugs

### BUG-001: Developer slugs broken for names with diacritics

**Severity:** Critical
**Page:** `/developers/*`
**Description:** Developers with accented characters in their names have broken slugs. The `slugify` library was added to fix this, but the seed data was created BEFORE the fix, so existing developers have corrupted slugs.

**Affected developers:**
| Name | Current Slug | Expected Slug |
|------|-------------|---------------|
| João Gonçalves | `joo-gonalves` | `joao-goncalves` |
| Gonzalo Fernández | `gonzalo-fernndez` | `gonzalo-fernandez` |
| Miia Leppänen | `miia-leppnen` | `miia-leppanen` |
| Vilhelm Leppälä | `vilhelm-leppl` | `vilhelm-leppala` |

**Impact:** Clicking developer names in rotation lists navigates to broken URLs showing "Developer not found". Only developers with ASCII-only names (Anja, Cuong, Marko, Pekka, Sergio) have working profile pages.

**Fix:** Update the seed plugin to use the `makeSlug()` function when creating developers, or add a migration that regenerates all slugs.

### BUG-002: Schedule override checkboxes don't work

**Severity:** Critical
**Page:** `/teams/[id]/settings`
**Description:** The "Custom interval", "Custom day", and "Custom timezone" checkboxes in the Rotation Schedule section do not enable/disable the associated input fields. Clicking the checkbox visually toggles it, but the `useGlobalInterval`/`useGlobalDay`/`useGlobalTimezone` refs don't update, keeping inputs permanently disabled.

**Steps to reproduce:**

1. Go to any team's Settings page
2. Click "Custom interval" checkbox
3. Observe: the number input below remains disabled

**Root cause:** The `@click` handler on the checkbox toggles the ref, but reka-ui's Checkbox also toggles its internal state, causing a double-toggle that cancels out.

---

## High Priority Bugs

### BUG-003: Missing page title on `/teams/[id]/teams`

**Severity:** High
**Page:** `/teams/pvc-finance-core/teams` (Squads rotation tab)
**Description:** Browser tab shows generic "Nord Review" instead of a descriptive title. This page is the Squads rotation view but was missed when adding `useHead()` calls to all pages.

### BUG-004: Hydration mismatches on every page

**Severity:** High
**Page:** All pages
**Description:** Every page logs `"Hydration completed but contains mismatches."` in the console. The primary cause is the avatar color computation — the server renders light theme colors but the client may be in dark mode, causing style attribute mismatches.

**Additional hydration sources:**

- `useFetch` without `await` on `index.vue` (fixed during session) — verify it's deployed
- `useColorMode()` returns different values on server vs client
- `Intl.DateTimeFormat` timezone formatting differs between server and client

### BUG-005: Login form — EmailInput hidden field may confuse password managers

**Severity:** High
**Page:** `/login`
**Description:** The EmailInput component uses a hidden `<input type="email">` for browser autocomplete, plus a visible username input and domain selector. Some password managers may not detect this correctly, leading to autocomplete failures.

---

## Medium Priority Bugs

### BUG-006: Squads page — "3 reviewers" label is ambiguous

**Severity:** Medium
**Page:** `/teams/pvc-finance-core/squads`
**Description:** The Bug Sheriff squad card displays "3 reviewers" alongside 7 member names. The "3 reviewers" refers to reviewers assigned per rotation, but displaying it next to the full member list creates confusion. Users may think only 3 of the 7 members are shown.

**Suggestion:** Change label to "3 reviewers per rotation" or "7 members · 3 per rotation".

### BUG-007: Developers table — Miia Leppänen shows "-" for Slack ID

**Severity:** Medium
**Page:** `/developers`
**Description:** The Slack ID column shows a dash "-" instead of being empty/blank when a developer has no Slack ID configured. All other empty fields in the app show nothing, creating an inconsistency.

### BUG-008: No loading states on page navigation

**Severity:** Medium
**Page:** All pages
**Description:** When navigating between pages, there is no loading indicator. Pages that use `await useFetch()` block rendering until data loads, showing a blank page. Pages without `await` show content that pops in after data loads. Neither provides a consistent loading experience.

**Suggestion:** Add Nuxt's `<NuxtLoadingIndicator>` to the layout for a top progress bar.

### BUG-009: "Show history" button on developer profile does nothing

**Severity:** Medium
**Page:** `/developers/[slug]`
**Description:** The "Show history" tab/button in the developer profile page's tab bar (All / Assigned reviewers / Reviewing / Show history) appears clickable but does not show additional rotation history. It may be an unfinished feature.

### BUG-010: Email template previews may appear blank

**Severity:** Medium
**Page:** `/docs/emails`
**Description:** The email preview iframe area renders the template correctly at the top, but on some viewport heights the content may appear blank because the iframe starts below the fold. The iframe has a fixed `h-[600px]` height which may not match the template content.

---

## Low Priority / Cosmetic Issues

### BUG-011: Team card link is both card-level and has individual action links

**Severity:** Low
**Page:** `/` (Home/Teams)
**Description:** The entire team card is a `<NuxtLink>` to the team's rotation page, but it also contains nested `<NuxtLink>` elements for Rotations, Members, and Settings. Clicking the card background navigates to the default tab, while the nested links go to specific tabs. The nested links use `@click.stop` to prevent bubbling, but on touch devices, accidental navigation to the wrong target is likely.

### BUG-012: No 404 page

**Severity:** Low
**Page:** Any invalid URL
**Description:** Navigating to an invalid URL (e.g., `/nonexistent`) shows the default Nuxt error page or a blank page. A custom 404 page matching the app's design would improve UX.

### BUG-013: "Developer not found" page has no back button or navigation hint

**Severity:** Low
**Page:** `/developers/[invalid-slug]`
**Description:** When a developer slug doesn't resolve, the page shows only "Developer not found" as plain text centered on an empty page. No back button, no link to the developers list, no helpful context.

### BUG-014: User dropdown "João Goncalves" — missing cedilla

**Severity:** Low
**Page:** All pages (header)
**Description:** The user name in the dropdown shows "João Goncalves" instead of "João Gonçalves". The cedilla on the 'ç' is missing. This is likely because the seed data or session stores the name without the diacritic, or the session user name is derived differently than the developer name.

### BUG-015: Theme toggle icon has no transition

**Severity:** Low
**Page:** All pages (header)
**Description:** Clicking the Sun/Moon theme toggle icon swaps instantly with no animation. A subtle rotation or fade transition would feel more polished.

### BUG-016: Webhook secret and API key reveal boxes have slightly different styling

**Severity:** Low
**Pages:** `/settings` (webhook secret) vs `/api-keys` (revealed key)
**Description:** Both show a green-bordered box with a "Copy" button when a secret/key is created, but the settings page uses `border-green-500/30 bg-green-500/5` while the api-keys page uses the same classes. Minor: the text styling differs slightly — settings says "Webhook created. Copy the signing secret now" while api-keys says "Key created. Copy it now". The messaging style should be consistent.

---

## Visual Inconsistencies

### VIS-001: StatusBadge used inconsistently

Some pages use the `<StatusBadge>` component (users page, members page) while similar badge patterns in other pages still use inline styling. The developer profile "Junior"/"Experienced" badge was recently converted but the rotation list and other places may still have inline badge styling.

### VIS-002: Table styles not uniform

The Users, Developers, and Members pages all use raw `<table>` elements with manual Tailwind classes. The Settings page uses `<UITable>` (shadcn component) for the team schedules table. This creates subtle differences in spacing, header styling, and row hover effects.

### VIS-003: Card borders inconsistent in dark mode

The team card on the home page has `border-muted-foreground/20` on hover in dark mode, but other bordered elements (rotation card, squad card) use `border-primary/30` or plain `border`. The hover treatment should be consistent across all interactive cards.

---

## Testing Gaps / Not Tested

- **Email delivery:** Resend integration not tested (requires sending actual emails)
- **Webhook delivery:** No webhook endpoint to receive test payloads
- **API key authentication:** `/api/public/rotations` endpoint not tested via browser
- **Rotation execution:** The "Run Rotation" page was not executed (would modify data)
- **Mobile responsiveness:** Not tested via browser resizing in this session (covered in earlier responsive audit)
- **Concurrent users:** Multi-user scenarios not tested
- **Rate limiting:** No rate limiting in place for API endpoints

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 2      |
| High      | 3      |
| Medium    | 5      |
| Low       | 6      |
| Visual    | 3      |
| **Total** | **19** |

**Top 3 priorities:**

1. Fix developer slugs in seed data (BUG-001) — breaks core navigation
2. Fix schedule override checkboxes (BUG-002) — breaks admin feature
3. Fix hydration mismatches (BUG-004) — affects all pages, degrades performance
