---
name: ninja-design-system
description: >-
  Applies the "Ninja Israel 2026" design system to the Ninja Timer app (vanilla JS + Vite, RTL Hebrew, src/style.css).
  Enforces the shield-blue brand palette, chrome display typography, and competition-red accent.
  Use when adding new UI components, modifying styles, creating new screens, fixing visual bugs,
  or any task involving CSS, colors, fonts, or layout in this project.
---

# Ninja Israel 2026 — Design System

## Source of Truth

All tokens live in `src/style.css` under `:root`. **Never hard-code hex values in JS or inline styles.** Always reference a CSS custom property.

## Color Tokens

| Token | Value | Role |
|---|---|---|
| `--night` | `#060810` | Page background |
| `--navy` | `#0A1430` | Card surfaces |
| `--navy-deep` | `#070D22` | Inputs, insets |
| `--border` | `#162050` | Default borders |
| `--border-mid` | `#1E3880` | Active / hover borders |
| `--blue` | `#1E52E0` | **PRIMARY brand** (shield body) |
| `--blue-brand` | `#2A68F8` | Shield highlight |
| `--blue-glow` | `rgba(30,82,224,.26)` | Glow / box-shadow tint |
| `--blue-soft` | `rgba(30,82,224,.12)` | Hover backgrounds |
| `--blue-light` | `#4A90FF` | Focus rings, active badges |
| `--red` | `#CC1A22` | Competition red — action buttons, falls |
| `--red-vivid` | `#E01018` | Hover state on red |
| `--red-glow` | `rgba(204,26,34,.22)` | Red box-shadow |
| `--red-soft` | `rgba(204,26,34,.10)` | Fallen obstacle bg |
| `--gold` | `#E8B500` | Champion gold — finish, totals |
| `--gold-text` | `#F5CA30` | Gold on dark backgrounds |
| `--gold-soft` | `rgba(232,181,0,.14)` | Passed obstacle bg |
| `--chrome` | `#C8D4F0` | Silver metallic — display text base |
| `--chrome-hi` | `#EEF4FF` | Chrome highlight |
| `--white` | `#FFFFFF` | Pure white |
| `--offwhite` | `#D8E4F8` | Body text on dark |
| `--gray` | `#5870A0` | Muted / secondary text |

## Typography

| Context | Font | Weight | Transform | Notes |
|---|---|---|---|---|
| Page title | `Barlow Condensed` | 900 | UPPERCASE | Chrome gradient + blue drop-shadow |
| Section headers | `Barlow Condensed` | 800 | UPPERCASE | `--offwhite`, letter-spacing 0.5px |
| Buttons (primary) | `Barlow Condensed` | 800 | UPPERCASE | |
| Body text, labels | `Heebo` | 400–700 | normal | RTL Hebrew |
| Timer digits | `Courier New` | 700 | — | `font-variant-numeric: tabular-nums` |

Load via Google Fonts (already in `index.html`):
```
Barlow+Condensed:wght@600;700;800;900
Heebo:wght@400;500;600;700;800;900
```

## Component Patterns

### Card
```css
background: var(--navy);
border: 1px solid var(--border);
border-radius: 16px;
padding: 20px 24px;
box-shadow: 0 4px 24px rgba(0,0,20,.6), 0 1px 0 var(--border-mid) inset;
```
Use `.card` or `.setup-card` classes. Never add inline background colors.

### Button — Primary (gold, finish action)
```css
background: var(--gold);
color: var(--night);        /* WCAG AA: ≥5.4:1 */
font-family: var(--font-display);
font-weight: 800;
text-transform: uppercase;
box-shadow: 0 4px 16px var(--gold-soft);
```

### Button — Competition Red (fall, start competition)
```css
background: var(--red);
color: var(--white);        /* WCAG AA: ≥5.6:1 */
box-shadow: 0 4px 20px var(--red-glow);
```
Hover: `background: var(--red-vivid)`.

### Button — Brand Blue (secondary brand actions)
```css
background: var(--blue);
color: var(--white);        /* WCAG AA: ≥4.8:1 */
box-shadow: 0 4px 16px var(--blue-glow);
```

### Input / Text field
```css
background: var(--navy-deep);
border: 1px solid var(--border);
color: var(--offwhite);
```
Focus state: `border-color: var(--blue-light); box-shadow: 0 0 0 3px var(--blue-soft);`

### Active / Current obstacle row
```css
border-color: var(--blue-light);
background: var(--blue-glow);   /* brand spotlight */
```

### Passed obstacle row
```css
border-color: rgba(232,181,0,.35);
background: var(--gold-soft);
```

### Fallen obstacle row
```css
border-color: rgba(204,26,34,.4);
background: var(--red-soft);
```

## Color Decision Guide

| Situation | Use |
|---|---|
| Primary CTA, new feature, brand UI | `--blue` / `--blue-brand` |
| Focus rings, active badges | `--blue-light` |
| Destructive action (fall, danger) | `--red` |
| Success / finishing / champion totals | `--gold` / `--gold-text` |
| Display headings | Chrome gradient (see `.page-title`) |
| Body text | `--offwhite` |
| Muted / secondary text | `--gray` |
| Backgrounds | `--night` (page) → `--navy` (card) → `--navy-deep` (input) |

## Accessibility Rules

- Body text (`--offwhite` on `--navy`): contrast ≥ 7.2:1 ✅ AAA
- Muted text (`--gray` on `--navy`): contrast ≥ 4.5:1 ✅ AA
- Gold text (`--gold-text` on `--navy`): contrast ≥ 5.4:1 ✅ AA
- White on `--red`: contrast ≥ 5.6:1 ✅ AA
- White on `--blue`: contrast ≥ 4.8:1 ✅ AA
- **All interactive elements** must have `border-radius ≥ 6px`, minimum touch target `44×44px` on mobile.
- Focus outline: `3px solid var(--blue-light)` via `:focus-visible` (already global in style.css).

## RTL Rules

- `direction: rtl` is set globally on `html, body`.
- All new text inputs must include `direction: rtl`.
- Do not use `float: left/right`; use `flexbox` with `gap`.
- Arrow icons on RTL buttons point **left** (←), not right.

## What NOT to Do

- ❌ Never write `color: #CC1A22` — always `color: var(--red)`.
- ❌ Never use `font-family: Arial` or any font not in the system.
- ❌ Never add `background: white` to cards; use `--navy`.
- ❌ Never use green for success — gold is the success color here.
- ❌ Never use `direction: ltr` on a container unless it's a number/date field.

## Timing Logic — Key Design Decisions

### Hold-to-Confirm Records at Press Start
The hold-to-confirm button (last obstacle "Pass" and "Fall") records the timestamp at
**press start** (`startedAt` from `pointerdown`), NOT at hold completion (~1.2s later).
The hold is only a UI safeguard against accidental taps — the athlete's actual
finish/fall moment is when the operator first presses.
**Do not change this to `Date.now()` at hold completion.**

### Obstacle Start (זינוק) Activates Timer
The run timer does NOT start when the run is created. It starts when the operator
clicks "זינוק" on the first obstacle. Each obstacle has an explicit `OBSTACLE_START`
event recorded before Pass/Fall becomes available.

## Deployment

Production URL: **https://ninja-timer.pages.dev/**
Platform: Cloudflare Pages (static Vite build)

Always deploy to production:
```bash
npx vite build
npx wrangler pages deploy dist --project-name=ninja-timer --branch=master
```

## Files Modified by This Design System

| File | Role |
|---|---|
| `src/style.css` | All tokens + component styles |
| `index.html` | Google Fonts link (`Barlow Condensed` + `Heebo`) |
| `src/stage1-setup.js` | Setup screen DOM |
| `src/stage2-timer.js` | Timer + scoreboard DOM |
| `src/stage3-export.js` | Export screen DOM |
