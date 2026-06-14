# Project State

## Stack
- **Framework:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **UI Library:** shadcn/ui (Radix Nova preset, `components.json` configured)
- **Font:** Clash Grotesk (loaded from Fontshare CDN in `index.html`)
- **Icons:** lucide-react

## Setup
- `@/` path alias resolves to `./src/` (Vite `resolve.alias` + tsconfig `baseUrl`/`paths`)
- Default shadcn component path: `@/components/ui`
- Utility helper `cn()` in `@/lib/utils.ts` (clsx + tailwind-merge)

## Theme (`src/index.css`)
Tailwind v4 `@theme` block. Dark theme only.

| Token | Color | Usage |
|---|---|---|
| `--color-background` | `#262c31` | Page background |
| `--color-foreground` | `#d2dce5` | All body/text |
| `--color-card` / `--color-popover` | `#2e353b` | Card surfaces |
| `--color-primary` | `#d2dce5` | Button bg |
| `--color-primary-foreground` | `#262c31` | Button text |
| `--color-secondary` | `#a4c6d3` | Secondary accent bg |
| `--color-secondary-foreground` | `#262c31` | Secondary accent text |
| `--color-muted` / `--color-border` / `--color-input` | `#363e45` | Borders, muted surfaces |
| `--color-muted-foreground` | `#d2dce5` | Muted text (same as main) |
| `--color-accent` | `#c4eef0` | Highlight accent + focus rings |
| `--color-accent-foreground` | `#262c31` | Text on accent bg |
| `--color-ring` | `#c4eef0` | Focus rings |
| `--font-sans` | `'Clash Grotesk', system-ui, ...` | Default font |

## Page Layout (`src/App.tsx`)
Full-screen hero page with:

1. **Background layer** — `BGPattern` component with `variant="grid"`, `mask="fade-edges"`, `size={40}`, `fill="#1a2227"`. Fills viewport behind content.
2. **Hero content** — Centered vertically/horizontally:
   - Heading: **Sahil** / **Sahran** (two lines, `text-7xl`→`text-9xl`, all in `#d2dce5`)
   - Subtitle: muted description
   - Two CTA buttons ("Get Started" / "Learn More")
   - Three feature cards in a 3-column grid

## Component: `BGPattern` (`@/components/ui/bg-pattern.tsx`)
Decorative background pattern component.

**Props:**
- `variant`: `'grid'` | `'dots'` | `'diagonal-stripes'` | `'horizontal-lines'` | `'vertical-lines'` | `'checkerboard'`
- `mask`: `'fade-edges'` | `'fade-center'` | `'fade-top'` | `'fade-bottom'` | `'fade-left'` | `'fade-right'` | `'fade-x'` | `'fade-y'` | `'none'`
- `size`: pattern spacing in px (default `24`)
- `fill`: pattern color (default `#252525`)

Uses inline `maskImage` / `WebkitMaskImage` for masking. Positioned `absolute inset-0 z-[-10]`.
