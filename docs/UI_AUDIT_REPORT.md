# UI Audit Report — CertMasterAI
**Date:** 2026-08-12  **Auditor:** Claude Code  **Version:** 1.0.0

---

## CRITICAL ISSUES

### UI-001 — Theme Toggle Completely Broken
**Severity:** Critical  
**Screens:** All  
**Root Cause:**  
`Navbar.tsx` reads `theme` from Zustand `useAppStore` and calls `toggleTheme()` which only mutates Zustand state.  
`ThemeProvider` (next-themes) manages the actual `.dark` class on `<html>` via its own internal state.  
These two systems are **completely disconnected** — toggling Zustand never calls `next-themes`'s `setTheme()`.  
Additionally, light mode CSS overrides in `globals.css` use a `@media (prefers-color-scheme: light)` guard,  
meaning class-based switching never triggers the light palette.  
**Fix:** Remove `theme` from Zustand. Use `useTheme()` from `next-themes` directly in `Navbar`. Rewrite light CSS as `.light` class selector.

---

### UI-002 — Certification Cards Missing cursor:pointer
**Severity:** High  
**Screen:** Landing page `/`, Exams page `/exams`  
**Observed (Image #5):** Cards are wrapped in `<Link>` but no visible `cursor-pointer` class on Card body.  
Children don't inherit pointer cursor from the Link in all browsers when using Tailwind.  
**Fix:** Add `cursor-pointer` to every interactive card component.

---

### UI-003 — Supported Certifications Grid — Visual Misalignment
**Severity:** High  
**Screen:** Landing page `/` — "Supported Certifications" section  
**Observed:** 4 cards in a `grid-cols-4` layout. At medium breakpoints the last card is partially cut off.  
No hover elevation. Badge pills lack consistent padding vs the card's border radius.  
Cards are visually flat with no depth separation from the muted background.  
**Fix:** Adjust grid to `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. Add `shadow-sm` on hover. Fix badge padding.

---

### UI-004 — Navbar Theme Icon Always Shows Sun (Dark Mode)
**Severity:** High  
**Screen:** All pages — Navbar  
**Observed:** Because Zustand `theme` is never synced with next-themes, the icon always reads from Zustand's initial `"dark"` value and shows Sun regardless of actual page theme.  
**Fix:** Same as UI-001 — use `useTheme()` from next-themes.

---

## HIGH SEVERITY ISSUES

### UI-005 — No cursor:pointer on Question Options
**Severity:** High  
**Screen:** Exam player `/exam/[examCode]`  
**Location:** `QuestionRenderer.tsx` — option `<button>` elements  
**Fix:** Add `cursor-pointer` to all option buttons. Already have `button` tag but Tailwind reset removes default pointer.

### UI-006 — Question Navigator Buttons Missing Pointer Cursor
**Severity:** High  
**Screen:** Exam player — left navigator panel  
**Location:** `QuestionNavigator.tsx` line ~63  
**Fix:** Add `cursor-pointer` to navigator button elements.

### UI-007 — Admin Action Buttons Missing Hover Cursor
**Severity:** Medium  
**Screen:** Admin dashboard `/admin`  
**Location:** `admin/page.tsx` — ThumbsUp/ThumbsDown/Edit ghost buttons  
**Fix:** Add `cursor-pointer` to ghost icon buttons.

### UI-008 — Disabled Buttons Show No cursor:not-allowed
**Severity:** Medium  
**Screen:** Exam player footer — Previous/Next when at boundaries  
**Location:** `exam/[examCode]/page.tsx` footer  
**Fix:** Tailwind `disabled:cursor-not-allowed` is set in `button.tsx` base variant — verify it applies through `variant="outline"`.

### UI-009 — Recharts Tooltips Not Theme-Aware
**Severity:** Medium  
**Screen:** Dashboard, Admin analytics charts  
**Observed:** Tooltip `contentStyle` uses hardcoded `hsl(var(--card))` string which doesn't resolve in inline style — shows browser default white tooltip in dark mode.  
**Fix:** Use CSS custom properties properly or pass resolved color values.

### UI-010 — Missing Focus Rings on Keyboard Navigation
**Severity:** Medium  
**Screen:** All interactive elements  
**Fix:** Ensure `focus-visible:ring-2 focus-visible:ring-ring` on all interactive elements for accessibility.

---

## MEDIUM SEVERITY ISSUES

### UI-011 — Landing Page "How It Works" Steps — No Responsive Stack
**Severity:** Medium  
**Screen:** Landing page `/`  
**Observed:** 4-column step grid has no visual connector lines. Steps look disconnected at mobile.  
**Fix:** Add connector lines between steps on desktop. Stack vertically on mobile with left-border timeline.

### UI-012 — Navbar Has No Mobile Hamburger Menu
**Severity:** Medium  
**Screen:** All pages — Navbar (< md breakpoint)  
**Observed:** `hidden md:flex` hides nav links on mobile, no hamburger menu provided.  
**Fix:** Add mobile drawer/sheet navigation.

### UI-013 — Result Screen Charts Use Wrong Color on Light Mode
**Severity:** Medium  
**Screen:** Result screen  
**Observed:** RadarChart and AreaChart use hardcoded dark colors (`#334155` grid, `#94a3b8` axis text).  
**Fix:** Use CSS variables for chart colors.

### UI-014 — Admin Question Cards Border-Left Color Hardcoded
**Severity:** Low  
**Screen:** Admin `/admin` — Questions tab  
**Observed:** `border-l-4 border-l-green-500` inline — fine for dark but needs light-mode check.

### UI-015 — Case Study Viewer Tab Panel Overflows on Small Screens
**Severity:** Low  
**Screen:** Exam player — Case Study questions  
**Fix:** Add `overflow-x-auto` to TabsList in CaseStudyViewer.

---

## MISSING CERTIFICATIONS (UI-016)
**Severity:** High  
**Screen:** Landing page, Exams catalog  
**Observed:** AB-100 and AI-103 are not in `EXAM_BLUEPRINTS`. Platform currently shows only 4 exams.  
`EXAM_BLUEPRINTS` is hardcoded in `types/exam.ts` — not configuration-driven.  
**Fix:** Move blueprints to `lib/examConfig.ts` (config-driven, JSON-loadable). Add AB-100 and AI-103 blueprints.

---

## BRANDING ISSUES (UI-017)
**Severity:** High  
**Screen:** All  
**Observed:** No Perficient logo present. Brand is generic "CertMaster AI" with Azure blue.  
Perficient brand color is `#075056` (deep teal). Current primary is `#0078d4` (Azure blue).  
Both brands need to coexist — Perficient as the organization, CertMasterAI as the product.  
**Fix:** Co-brand: "CertMasterAI — powered by Perficient" in footer/navbar. Apply Perficient teal as accent.
