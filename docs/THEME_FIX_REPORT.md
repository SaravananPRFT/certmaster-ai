# Theme Fix Report — CertMasterAI
**Date:** 2026-08-12

---

## Root Cause Analysis

### Problem 1: Dual Theme State (Critical Bug)

The app has **two separate theme systems that never talk to each other:**

| System | Location | What it controls |
|--------|----------|-----------------|
| `next-themes` | `ThemeProvider` → adds `.dark` class to `<html>` | Actual CSS class that drives CSS variable switching |
| Zustand `useAppStore.theme` | `store.ts` | Local state only — used to render Sun/Moon icon in Navbar |

`Navbar.tsx` calls `toggleTheme()` → updates Zustand `theme: "dark" → "light"` → **nothing else happens**.  
`next-themes`'s `setTheme()` is never called. The HTML class never changes. Page stays dark.

### Problem 2: Light Mode CSS Not Class-Triggered

`globals.css` defines light mode variables inside:
```css
@media (prefers-color-scheme: light) {
  :root:not(.dark) { ... }
}
```
This only fires when the **system** preference is light AND the `.dark` class is absent.  
When a user toggles via the button, `next-themes` removes `.dark` and adds nothing (no `.light` class by default).  
Result: page background becomes transparent/white from browser default — looks broken.

### Problem 3: ThemeProvider Config Partial

`layout.tsx`:
```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
```
`enableSystem` is on, which respects OS preference on first load — correct.  
But `storageKey` is not set, so it defaults to `"theme"` in localStorage.  
Zustand persists its own `theme` key under `"certmaster-app"` in localStorage.  
These two keys never sync — they drift.

---

## Fix Strategy

### Fix 1: Remove theme from Zustand entirely
Delete `theme` and `toggleTheme` from `AppStore`. Theme state is owned exclusively by `next-themes`.

### Fix 2: Navbar uses `useTheme()` from next-themes
```tsx
import { useTheme } from "next-themes";
const { theme, setTheme } = useTheme();
// Toggle:
setTheme(theme === "dark" ? "light" : "dark");
```

### Fix 3: Rewrite globals.css light mode as `.light` class
```css
/* Dark (default) */
:root { --color-background: hsl(222 47% 7%); ... }

/* Light */
.light {
  --color-background: hsl(0 0% 100%);
  ...
}
```
`next-themes` with `attribute="class"` sets either `.dark` or `.light` on `<html>`.

### Fix 4: System preference detection
Keep `enableSystem` on ThemeProvider. Add `themes={["light", "dark", "system"]}`.  
Add a 3-way toggle: Light | Dark | System.

---

## Verification Checklist

- [ ] `localStorage` key `"theme"` set by next-themes persists across refresh
- [ ] Zustand `certmaster-app` no longer contains `theme` key
- [ ] `.dark` class appears on `<html>` in dark mode (DevTools check)
- [ ] `.light` class appears on `<html>` in light mode
- [ ] CSS variables resolve correctly in both modes
- [ ] Charts, tooltips, modals all respect theme
- [ ] System preference auto-detected on first visit
- [ ] No hydration flash (suppressHydrationWarning on `<html>` — already set ✓)
