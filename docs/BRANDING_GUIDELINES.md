# Branding Guidelines — CertMasterAI × Perficient
**Date:** 2026-08-12

---

## Brand Architecture

**Two brands, clear hierarchy:**

```
┌─────────────────────────────────────┐
│  CertMasterAI                       │  ← Product brand (primary)
│  Powered by Perficient              │  ← Organization brand (secondary)
└─────────────────────────────────────┘
```

CertMasterAI is the product. Perficient is the creator/sponsor.  
Perficient logo appears in: Navbar (small, right side), Footer, Login page.  
CertMasterAI wordmark is the primary identity on all screens.

---

## Color Palette

### Primary — Azure Intelligence Blue
Used for: Primary actions, links, active states, primary badges

| Token | Value | Use |
|-------|-------|-----|
| `--color-primary` | `#0078d4` | Buttons, active nav, primary badges |
| `--color-primary-hover` | `#106ebe` | Button hover state |
| `--color-primary-light` | `#50a0f0` | Subtle highlights |

### Secondary — Perficient Teal
Used for: Perficient brand moments, success states, "powered by" elements

| Token | Value | Use |
|-------|-------|-----|
| `--color-perficient` | `#075056` | Perficient logo, co-brand elements |
| `--color-perficient-light` | `#0a7a82` | Hover/lighter variant |
| `--color-perficient-muted` | `#075056/20` | Background tints |

### Semantic Colors

| State | Dark Mode | Light Mode |
|-------|-----------|------------|
| Success | `#22c55e` | `#16a34a` |
| Warning | `#f59e0b` | `#d97706` |
| Error | `#ef4444` | `#dc2626` |
| Info | `#3b82f6` | `#2563eb` |

### Backgrounds

| Token | Dark | Light |
|-------|------|-------|
| `background` | `hsl(222 47% 7%)` — `#0d1117` | `hsl(210 20% 98%)` — `#f8fafc` |
| `card` | `hsl(222 47% 10%)` — `#111827` | `#ffffff` |
| `border` | `hsl(217 33% 18%)` — `#1e2d40` | `hsl(214 32% 91%)` — `#e2e8f0` |

---

## Typography

### Font Stack
- **Primary:** Inter (currently in use — keep)
- **Monospace:** JetBrains Mono (for code snippets, question IDs)
- **Fallback:** system-ui, -apple-system, sans-serif

### Scale

| Role | Size | Weight | Use |
|------|------|--------|-----|
| Display | 3.5rem / 56px | 700 | Hero heading |
| H1 | 2rem / 32px | 700 | Page titles |
| H2 | 1.5rem / 24px | 600 | Section headings |
| H3 | 1.125rem / 18px | 600 | Card titles |
| Body | 1rem / 16px | 400 | Default text |
| Small | 0.875rem / 14px | 400 | Labels, captions |
| XS | 0.75rem / 12px | 500 | Badges, tags |

---

## Logo Usage

### CertMasterAI Logo (Current)
- BookOpen icon in `#0078d4` rounded square + "CertMaster" + "AI" in azure blue
- Minimum size: 32px icon height
- Don't stretch or recolor the AI badge

### Perficient Logo Integration
- SVG color: `#075056` (already in the SVG fill)
- In dark mode: use white version (apply `filter: brightness(0) invert(1)` or separate white SVG)
- Placement: Navbar right side (64px wide max), Footer center
- Text: "Powered by" in `text-muted-foreground`, then Perficient SVG logo

### Co-brand lockup (Navbar)
```
[📖 CertMasterAI]  ←  left
                   →  [Powered by PERFICIENT]  ← right, smaller
```

---

## Spacing System

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Tight gaps (badge internals) |
| `space-2` | 8px | Icon-to-text gaps |
| `space-3` | 12px | List item gaps |
| `space-4` | 16px | Default component padding |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Section vertical padding |
| `space-16` | 64px | Page section gaps |

---

## Iconography

- **Library:** Lucide React (already in use — keep)
- **Style:** Outline, 2px stroke, consistent 16px / 20px / 24px sizes
- **Certification icons:** Use exam-code prefix abbreviations (AI / AZ / GH / AB) in rounded squares
- **Color:** Match icon to context (primary=blue, success=green, warning=amber, error=red)

---

## Cursor Design — Recommendation

### Chosen Concept: **Concept C — Azure AI Glow** (with enterprise restraint)

**Rationale:** Concept A (learning pointer) is too subtle to notice. Concept B (badge icon) requires  
custom SVG cursor per OS which has poor cross-browser support and looks gimmicky in enterprise context.  
Concept C (AI glow) can be tastefully implemented with CSS custom cursor + pointer glow effect  
that is professional and on-brand.

**Implementation:**
```css
/* Default: system cursor */
* { cursor: default; }

/* Interactive: pointer with subtle blue ring shadow */
[data-interactive], button, a, [role="button"] {
  cursor: pointer;
}

/* Exam option hover: soft pulsing border highlight (CSS only, no custom cursor) */
.exam-option:hover {
  box-shadow: 0 0 0 2px #0078d4, 0 0 12px #0078d430;
}

/* Admin critical actions: standard pointer, red glow on destructive */
.action-destructive:hover {
  box-shadow: 0 0 0 1px #ef4444, 0 0 8px #ef444420;
}
```

Keep system cursor. Add interactive glow effects and consistent `cursor-pointer` everywhere.  
Avoid custom SVG cursors in enterprise apps — accessibility tools and screen readers conflict with them.

---

## Component Appearance Standards

| Component | Dark Mode | Light Mode |
|-----------|-----------|------------|
| Card | `bg-card` + `border-border` | `bg-white` + `border-slate-200` |
| Button (primary) | Azure blue fill | Azure blue fill |
| Button (outline) | Transparent + `border-border` | Transparent + `border-slate-300` |
| Input | `bg-secondary` + `border-input` | `bg-white` + `border-slate-300` |
| Badge (info) | `bg-blue-500/20 text-blue-400` | `bg-blue-100 text-blue-700` |
| Navbar | `bg-background/95 backdrop-blur` | `bg-white/95 backdrop-blur` |
