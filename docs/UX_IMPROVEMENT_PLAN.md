# UX Improvement Plan — CertMasterAI
**Date:** 2026-08-12

---

## Priority 1 — Blocking Issues (Implement Now)

### UX-001: Theme Toggle (Critical)
See THEME_FIX_REPORT.md. Broken theme toggle is the most visible UX failure.

### UX-002: Certification Card Click Area
Cards are wrapped in `<Link>` but cursor doesn't change. Users can't tell they're clickable.
Fix: Add `cursor-pointer` + hover lift effect (`hover:-translate-y-0.5 hover:shadow-md transition-all`).

### UX-003: Exam Loading State
"Generating Questions" spinner is a full-page block. No progress indication of which step is running.
Current badges are static. Users think the app is frozen after 3 seconds.
Fix: Animate the pipeline step badges sequentially with fade-in timing.

### UX-004: Missing Auth Flow
No login/register. All users hit the app as anonymous. No progress persistence.
Fix: See AUTHENTICATION_PLAN.md. Guest mode + basic email auth.

---

## Priority 2 — Significant Improvements

### UX-005: Exam Navigator Feedback
Current: Color only shows question state.
Improvement: Add tooltip on hover showing question type + difficulty. Shows "Q3 — Hard · MultipleChoice · Marked".

### UX-006: Timer Urgency Communication
Current: Timer color changes at 30/15/5 min. Text says "TIME RUNNING OUT" at 5 min.
Improvement: Add subtle pulsing animation at 5 min. Play a browser notification sound (user opt-in).

### UX-007: Question Navigation Keyboard Feedback
Current: ArrowLeft/Right work but no visual feedback that keypress registered.
Improvement: Flash a subtle border pulse on the content area when navigating via keyboard.

### UX-008: Empty States
Current: If question generation fails, shows plain error text.
Improvement: Illustrated empty states with clear CTA. "No questions generated — try a different difficulty or domain."

### UX-009: Exam Setup Page Clarity
Current: Mode selector (Study/Practice/Exam Sim) has text descriptions but no visual differentiation.
Improvement: Add color-coded mode cards. Study=green, Practice=amber, Exam Sim=blue.

### UX-010: Result Screen Share/Export
Current: No way to share or save results.
Improvement: Add "Download PDF" button and share link (guest-shareable score card).

---

## Priority 3 — Enhancements

### UX-011: Landing Page Social Proof
Missing testimonials and statistics sections. Add:
- "500+ questions generated" counter
- "4 Microsoft certifications" coverage
- Testimonial from a learner

### UX-012: Breadcrumb Navigation
No breadcrumbs on deep pages. User in `/exam/AI-102` has no visible path back.
Add breadcrumb: Home > Exams > AI-102 > Exam Session

### UX-013: Question Bookmarking
Study mode has "Bookmark Question" in requirements but not implemented.
Add bookmark store (localStorage-persisted) + bookmark review page.

### UX-014: Mobile Exam Experience
Exam player at mobile width: Navigator panel takes 64px/256px which leaves very little space for question.
Fix: Navigator becomes a bottom sheet on mobile. Swipe up to see all questions.

### UX-015: Onboarding Flow
First-time user has no guidance. Add a 3-step onboarding tooltip tour:
1. "Choose your exam"
2. "Practice or simulate"  
3. "Review your gaps"

---

## Accessibility Checklist (WCAG 2.1 AA)

| Item | Status | Fix |
|------|--------|-----|
| Color contrast — primary text | ✓ Pass (dark mode) | Check light mode |
| Color contrast — muted text | ⚠ Check | `text-muted-foreground` may be low in light mode |
| Focus rings on all interactive | ✗ Missing on some | Add `focus-visible:ring-2` universally |
| Screen reader labels on icon buttons | ✗ Missing | Add `aria-label` to all icon-only buttons |
| Keyboard navigation — exam player | ✓ Arrow keys work | |
| Alt text on images | N/A | No images yet |
| Form labels | ✗ Missing on exam setup selects | Add `<label>` associations |
| ARIA roles on custom components | ⚠ Partial | Drag-and-drop needs `role="listbox"` |
