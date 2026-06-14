# Portfolio Website — Full Build Prompt

## Project Context

You are building a portfolio website for Sahil Sahran using an **existing Vite + React 19 + TypeScript** project. The stack and existing code must be respected and extended — do not recreate what's already there.

### Existing state (do not remove)

- **`src/index.css`**: Tailwind v4 `@theme` block with a dark-only color system. All color tokens already defined (see token table below). Preserve every token.
- **`src/components/ui/bg-pattern.tsx`**: A `BGPattern` component with `variant`, `mask`, `size`, and `fill` props. Keep it exactly as-is.
- **`src/App.tsx`**: Currently a simple hero page. You will replace its JSX entirely, but the component file stays at this path.
- **Fonts**: Clash Grotesk loaded from Fontshare CDN in `index.html`. It is the only display font — use it for all headings. JetBrains Mono is available via Google Fonts (add the `<link>` to `index.html` if not already present) for monospace details.
- **Path alias**: `@/` → `./src/`

### Color tokens (from `src/index.css`)

| Token | Hex | Role |
|---|---|---|
| `--color-background` | `#262C31` | Page background |
| `--color-foreground` | `#D2DCE5` | Body text |
| `--color-card` | `#2E353B` | Card / panel surfaces |
| `--color-primary` | `#D2DCE5` | Primary button bg |
| `--color-primary-foreground` | `#262C31` | Primary button text |
| `--color-secondary` | `#A4C6D3` | Secondary accent |
| `--color-secondary-foreground` | `#262C31` | Text on secondary |
| `--color-muted` / `--color-border` | `#363E45` | Borders, muted surfaces |
| `--color-muted-foreground` | `#D2DCE5` | Muted text |
| `--color-accent` | `#C4EEF0` | Highlight accent, focus rings |
| `--color-accent-foreground` | `#262C31` | Text on accent |
| `--color-ring` | `#C4EEF0` | Focus rings |

**Additional colors to use inline (do not add to theme):**
- Secondary dark: `#4B6376` — used for deep shadows and mid-tones
- Card edge highlight: `rgba(196, 238, 240, 0.08)` — subtle top-edge glow on 3D surfaces

---

## Overall Page Architecture

The page has exactly **two sections** that occupy the full viewport height each. The Experiences panel sits below the Landing in DOM order but uses an animated transform to slide up and cover it.

```
┌─────────────────────────────────┐  ← viewport top
│                                 │
│        LANDING SECTION          │  100vh, position: relative
│                                 │
│  ▼ faint scroll hint at bottom  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│                                 │
│      EXPERIENCES PANEL          │  starts translateY(100%), animates to translateY(0)
│                                 │
└─────────────────────────────────┘
```

The Experiences panel uses `position: fixed`, `inset: 0`, and a `transform: translateY(...)` driven by a `panelProgress` value (0 = fully off-screen below, 1 = fully covering). It sits above the Landing in z-index. Transition this with a `cubic-bezier(0.76, 0, 0.24, 1)` over 600ms.

Manage the current section with a `section` state variable: `'landing' | 'experiences'`. Drive the panel's `translateY` from this state. Use a `transitioning` boolean to block double-triggers during animation.

---

## Section 1 — Landing Page

**File:** `src/App.tsx` (replace JSX, keep imports clean)

The landing section has a **two-column layout** on desktop centered in the viewport. The left column holds the ID Card, the right column holds the name text. Beneath both columns, centered, sit the two CTA buttons and the scroll indicator.

```
┌──────────────────────────────────────────────┐
│  [BGPattern grid, full-bleed, behind all]     │
│                                               │
│   ┌─────────────┐   ┌─────────────────────┐  │
│   │             │   │                     │  │
│   │   ID Card   │   │  SAHIL              │  │
│   │  (portrait) │   │  SAHRAN             │  │
│   │             │   │                     │  │
│   └─────────────┘   └─────────────────────┘  │
│                                               │
│           [ Resume ]  [ Transcript ]          │
│                                               │
│        ↓  Scroll to view Experiences         │
└──────────────────────────────────────────────┘
```

On mobile (< 640px), stack the card and name vertically, card on top, name below, both centered.

### 1A — ID Card Component

**File:** `src/components/IDCard.tsx`

**Card dimensions:** 280px wide × 390px tall (7:10 portrait ratio). On mobile, scale to 240px × 336px.

**Volumetric 3D thickness:** Stack 5 `<div>` layers along the Z axis at offsets `[-2px, -1px, 0px, 1px, 2px]`. The innermost layers (offsets -2 to 0) render as `background: #4B6376` with `border: 1px solid rgba(75, 99, 118, 0.8)` — these form the visible card edge. The outermost front face (offset +2px) contains all the card content.

Apply `transform-style: preserve-3d` to the card wrapper. Use `perspective: 1200px` on the parent container.

**Mouse-tracking tilt with inertia:**
- Track `targetRotX` and `targetRotY` from the mouse position relative to the card's center, clamped to `±14deg` (X) and `±10deg` (Y)
- Smoothly lerp the current rotation toward the target each frame: `current += (target - current) * 0.07`
- Use `requestAnimationFrame` for the loop; cancel on unmount
- When the mouse leaves the card container, set target back to `(0, 0)`
- Apply the rotation as `rotateX(${rotX}deg) rotateY(${rotY}deg)` on the card wrapper

**Dynamic sheen effect:**
- Track the mouse position as CSS custom properties `--mouse-x` and `--mouse-y` on the front face element (update these in the same RAF loop)
- The front face has an absolutely-positioned pseudo-element (or child div) with:
  ```css
  background: radial-gradient(
    400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(196, 238, 240, 0.07) 0%,
    transparent 60%
  );
  pointer-events: none; z-index: 10; position: absolute; inset: 0;
  ```
- This sheen should be smooth and subtle — it should make the surface feel lit from within without washing out content

**Grain texture overlay (on front face):**
```css
background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
opacity: 0.04;
mix-blend-mode: overlay;
pointer-events: none; position: absolute; inset: 0; z-index: 9;
```

**Front face layout (inside the card, z=+2px layer):**

Card background: `background: linear-gradient(160deg, #2E353B 0%, #262C31 100%)`. Border: `1px solid rgba(196, 238, 240, 0.1)`. Border-radius: `16px`. `overflow: hidden`.

```
┌──────────────────────────────┐
│  SAHIL SAHRAN    [monogram]  │  ← name row, top, padding 16px
│──────────────────────────────│
│                              │
│         [ photo ]            │  ← image, 60% of card height
│                              │
│──────────────────────────────│
│  Bio text in foreground      │  ← bottom area, 24% of card height
│  color, small, readable      │
└──────────────────────────────┘
```

- **Name row:** "SAHIL SAHRAN" in Clash Grotesk, `font-size: 10px`, `letter-spacing: 0.2em`, `font-weight: 600`, `color: rgba(196, 238, 240, 0.7)`, `text-transform: uppercase`. Right side: a simple monogram badge — a `24px × 24px` circle with `border: 1px solid rgba(196, 238, 240, 0.2)`, containing "SS" in `6px` Clash Grotesk.

- **Photo:** Place the user's image at `src/assets/photo.png`. Use an `<img>` tag with `object-fit: cover; object-position: top center; width: 100%; height: 100%`. Wrap it in a div that takes up ~58% of the card's height. Over the image, apply a color tint overlay div with `background: rgba(164, 198, 211, 0.12); mix-blend-mode: color; position: absolute; inset: 0`. Also apply a bottom gradient fade: `background: linear-gradient(to bottom, transparent 60%, #262C31 100%)` to blend the photo into the card background smoothly.

  **Fallback:** If the image fails to load or doesn't exist yet, show the card without the image — just show the initials "SS" in large text centered in that area, styled with `color: rgba(196, 238, 240, 0.15)` and `font-size: 80px; font-weight: 800`.

- **Bio text area:** Below the photo, padding `12px 16px`. Bio text: `"Software developer & designer building thoughtful interfaces."` in `font-size: 11px`, `line-height: 1.6`, `color: rgba(210, 220, 229, 0.75)`, font-family Clash Grotesk. This text must always be fully readable — do not let the grain, sheen, or photo overlay affect it (it sits in its own padded div at a higher z-index).

**Card drop shadow:**
```css
box-shadow:
  0 30px 60px -15px rgba(0, 0, 0, 0.7),
  0 10px 20px -8px rgba(0, 0, 0, 0.5),
  0 0 0 1px rgba(196, 238, 240, 0.06);
```

### 1B — Name Text

**In `src/App.tsx`, right column**

Render the name as two stacked `<h1>` lines: "SAHIL" on the first, "SAHRAN" on the second. Clash Grotesk, `font-weight: 800`, `text-transform: uppercase`. Responsive size: `clamp(4rem, 7vw, 7rem)`. Color: `#D2DCE5`. `line-height: 0.92`. `letter-spacing: -0.02em`.

**3D text shadow (no gradient — CSS `text-shadow` only):**
```css
text-shadow:
  0 2px 0 #4B6376,
  0 4px 0 rgba(75, 99, 118, 0.6),
  0 8px 16px rgba(0, 0, 0, 0.5),
  0 16px 32px rgba(0, 0, 0, 0.3);
```

**Hover effect on each `<h1>`:** On `mouseenter`, transition over 250ms `ease-out`:
```css
transform: translateY(-3px);
text-shadow:
  0 5px 0 #4B6376,
  0 8px 0 rgba(75, 99, 118, 0.5),
  0 12px 20px rgba(0, 0, 0, 0.6),
  0 24px 40px rgba(0, 0, 0, 0.3);
```
On `mouseleave`, transition back to default. Apply `cursor: default` and `will-change: transform` on these elements.

Below the two name lines, add a subtitle in small Clash Grotesk: `"Full-stack developer & designer"`, `font-size: clamp(0.8rem, 1.2vw, 1rem)`, `color: rgba(164, 198, 211, 0.7)`, `letter-spacing: 0.05em`, `font-weight: 400`, margin-top `1rem`.

### 1C — CTA Buttons

Below the card + name grid, centered. Two buttons side by side with `gap: 16px`. On mobile, stack vertically.

**Button base styles (both share these):**
- `font-family: 'Clash Grotesk', sans-serif`
- `font-size: 14px`, `font-weight: 600`, `letter-spacing: 0.06em`
- `padding: 12px 32px`, `border-radius: 10px`
- `transition: all 300ms cubic-bezier(0.25, 1, 0.5, 1)`
- `cursor: pointer`, `outline: none`, `border: none`

**"Resume" button (primary, lighter):**
```css
background: #D2DCE5;
color: #262C31;
box-shadow:
  0 0 0 1px rgba(0,0,0,0.08),
  0 2px 4px rgba(0,0,0,0.2),
  0 8px 16px -4px rgba(0,0,0,0.4),
  inset 0 1px 0 rgba(255,255,255,0.9),
  inset 0 -2px 4px rgba(0,0,0,0.08);
```

**"Transcript" button (secondary, darker):**
```css
background: #2E353B;
color: #D2DCE5;
box-shadow:
  0 0 0 1px rgba(196, 238, 240, 0.12),
  0 2px 4px rgba(0,0,0,0.4),
  0 8px 16px -4px rgba(0,0,0,0.7),
  inset 0 1px 0 rgba(196, 238, 240, 0.08),
  inset 0 -2px 4px rgba(0,0,0,0.5);
```

**Hover state (both):**
```css
transform: translateY(-2px);
/* Shadows extend downward to increase perceived lift */
```

**Active state (both):**
```css
transform: translateY(1px);
/* Shadows compress */
```

Both buttons are non-functional (no href, no onClick needed). Add `aria-label` attributes.

### 1D — Scroll Indicator

Below the buttons, centered, `margin-top: 32px`. Two parts:
1. A small animated chevron-down icon (from `lucide-react`, `ChevronDown`) that gently bobs up and down — keyframe animation: `translateY(0) → translateY(5px) → translateY(0)`, 2s ease-in-out infinite.
2. Faint text below it: `"Scroll to view Experiences"` in `font-size: 11px`, `letter-spacing: 0.12em`, `text-transform: uppercase`, `color: rgba(210, 220, 229, 0.3)`, Clash Grotesk.

The entire scroll indicator should fade in after a 1.2s delay on mount (CSS animation or `useState` timeout).

---

## Section 2 — Experiences Panel

**File:** `src/components/ExperiencesPanel.tsx`

This panel uses `position: fixed; inset: 0; z-index: 50`. It starts as `transform: translateY(100%)` and transitions to `translateY(0)` when the user scrolls down from the landing. Transition: `transform 600ms cubic-bezier(0.76, 0, 0.24, 1)`.

The panel background: `background: #262C31`. It does **not** use the BGPattern — it should feel distinctly different from the landing page.

### 2A — Panel Entry Animation

When the panel becomes visible (`translateY(0)` is reached), trigger a staggered entrance for the interior elements:
- Filter bar fades up from `translateY(20px), opacity: 0` → `translateY(0), opacity: 1` at 100ms after panel settles
- Each experience card in the list staggers in, 60ms apart, from `translateY(16px), opacity: 0`

### 2B — Panel Top Bar

A fixed-to-panel bar at the top of the panel. Height: `60px`. Background: `rgba(38, 44, 49, 0.95)` with `backdrop-filter: blur(12px)`. Border-bottom: `1px solid rgba(54, 62, 69, 0.8)`. `z-index: 10` within the panel.

Left side: "Experiences" heading in Clash Grotesk `font-size: 18px`, `font-weight: 700`, `color: #D2DCE5`.

Center/Right: Two filter dropdowns (see 2C).

Far right: A close/back button — an `X` icon (lucide-react `X`) in a `32px × 32px` rounded button. On click, this triggers the reverse transition back to the landing page.

**"Scroll up to return" hint:** A faint line just below the top bar, `font-size: 10px`, `letter-spacing: 0.14em`, `text-transform: uppercase`, `color: rgba(210, 220, 229, 0.2)`, centered. Only visible when `section === 'experiences'`.

### 2C — Filter Dropdowns

**File:** `src/components/FilterDropdown.tsx`

Two instances in the top bar. The dropdowns must match the 3D button aesthetic.

**Closed state:**
- `background: #2E353B`
- `border: 1px solid rgba(54, 62, 69, 1)`
- `border-radius: 8px`
- `padding: 6px 14px`
- `font-size: 13px`, `color: #D2DCE5`, Clash Grotesk
- `box-shadow: 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(196, 238, 240, 0.05)`
- A `ChevronDown` icon at the right side of the button, `color: rgba(210, 220, 229, 0.4)`, rotates 180deg when open

**Open dropdown panel:**
- `position: absolute; z-index: 100`
- `background: #2E353B`
- `border: 1px solid rgba(54, 62, 69, 1)`
- `border-radius: 10px`
- `box-shadow: 0 16px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)`
- Appears with a 150ms scale-from-top-center animation: `transform-origin: top center; scale: 0.95 → 1; opacity: 0 → 1`
- Each option row: `padding: 8px 16px`, `font-size: 13px`, `color: #D2DCE5`; hover: `background: rgba(196, 238, 240, 0.06)`; selected: `color: #C4EEF0`

**Filter by Skill options:** `["All", "React", "TypeScript", "Python", "Machine Learning", "Node.js", "Design"]`

**Filter by Type options:** `["All", "Work", "Project", "Research"]`

Filters update the `activeSkillFilter` and `activeTypeFilter` state in `ExperiencesPanel`. Filtering is purely presentational — filter the rendered list by matching tags.

### 2D — Experience List

Below the top bar. This scrollable list takes the full left side of the panel (full width when sidebar is closed, `calc(100% - 400px)` when sidebar is open).

Each experience card:
- `background: #2E353B`
- `border-radius: 12px`
- `border: 1px solid rgba(54, 62, 69, 0.8)`
- `padding: 20px 24px`
- `margin-bottom: 12px`
- `cursor: pointer`
- `transition: all 200ms ease`
- `box-shadow: 0 2px 8px rgba(0,0,0,0.3)`

On hover:
- `transform: translateY(-2px)`
- `box-shadow: 0 8px 24px rgba(0,0,0,0.5)`
- `border-color: rgba(196, 238, 240, 0.2)`

When selected (sidebar open for this item):
- `border-color: rgba(196, 238, 240, 0.4)`
- `background: rgba(196, 238, 240, 0.04)`

**Card layout:**
```
┌───────────────────────────────────────────────────────┐
│  [type badge]                           [date]        │
│  Title of Experience / Project                        │
│  Company / Context          [skill tag] [skill tag]   │
│  One-line summary description                         │
└───────────────────────────────────────────────────────┘
```

- Type badge: a small pill `padding: 2px 8px`, `border-radius: 999px`, `font-size: 10px`, `font-weight: 600`, `letter-spacing: 0.08em`, `text-transform: uppercase`. Colors by type: Work → `background: rgba(196, 238, 240, 0.12); color: #C4EEF0`; Project → `background: rgba(164, 198, 211, 0.12); color: #A4C6D3`; Research → `background: rgba(75, 99, 118, 0.2); color: #A4C6D3`
- Title: `font-size: 16px`, `font-weight: 700`, Clash Grotesk, `color: #D2DCE5`
- Company: `font-size: 13px`, `color: rgba(210, 220, 229, 0.6)`
- Skill tags: same pill style but smaller, `font-size: 9px`, background `rgba(54, 62, 69, 0.8)`, color `rgba(210, 220, 229, 0.5)`
- Date: `font-size: 11px`, `color: rgba(210, 220, 229, 0.35)`, JetBrains Mono
- Summary: `font-size: 13px`, `color: rgba(210, 220, 229, 0.6)`, `margin-top: 6px`

**List scroll behavior:**
- The list area has `overflow-y: auto; max-height: calc(100vh - 60px)`. 
- Apply `onWheel` on the list container: `e.preventDefault(); listRef.current.scrollTop += e.deltaY`
- Apply `onWheel` on the panel background (outside the list): if scrolling up (`e.deltaY < 0`) AND list is at scroll top (`scrollTop === 0`), trigger the transition back to landing.

### 2E — Detail Sidebar

**File:** `src/components/ExperienceSidebar.tsx`

The sidebar slides in from the right. Width: `400px` (on mobile: full width with a back button instead). `position: absolute; top: 0; right: 0; height: 100%`. `z-index: 20`. Background: `#2E353B`. `border-left: 1px solid rgba(54, 62, 69, 0.8)`. `box-shadow: -8px 0 32px rgba(0,0,0,0.5)`.

Open/close animation: `transform: translateX(100%) → translateX(0)`, 350ms `cubic-bezier(0.76, 0, 0.24, 1)`.

**Sidebar top bar (inside the sidebar):**
Height: `52px`. `border-bottom: 1px solid rgba(54, 62, 69, 0.8)`. Displays:
- Left: `X` close button (lucide-react `X`), `onClick` closes sidebar and deselects the experience
- Center: Experience title truncated, `font-size: 14px`, `color: #D2DCE5`
- Right: Fullscreen button (lucide-react `Maximize2`) — clicking this is non-functional but present

**File switcher (below top bar, if experience has multiple files):**
A horizontal tab row. Each tab: `font-size: 12px`, Clash Grotesk, `padding: 6px 14px`. Active tab: `color: #C4EEF0`, `border-bottom: 2px solid #C4EEF0`. Inactive: `color: rgba(210, 220, 229, 0.4)`. Files are non-functional — tabs just toggle an active state visually.

**Content area (below file switcher):**
Scrollable. Padding `24px`. Contains:
- The full experience `details` string as formatted text
- `font-size: 14px`, `line-height: 1.7`, `color: rgba(210, 220, 229, 0.8)`
- Skills section: "Skills used" heading in `font-size: 11px`, uppercase, `color: rgba(210, 220, 229, 0.4)`, then the skill tags rendered as pills
- A faux file preview area: a rounded `background: #262C31; border: 1px solid rgba(54,62,69,0.8); border-radius: 10px; padding: 48px; display: flex; align-items: center; justify-content: center` box with a document icon (lucide-react `FileText`) at `32px` in `color: rgba(210, 220, 229, 0.2)` and a filename below it — this represents the attached file

---

## Scroll & Interaction Behavior

Manage in `src/App.tsx`:

```ts
const [section, setSection] = useState<'landing' | 'experiences'>('landing');
const [transitioning, setTransitioning] = useState(false);

function goToExperiences() {
  if (transitioning || section === 'experiences') return;
  setTransitioning(true);
  setSection('experiences');
  setTimeout(() => setTransitioning(false), 650);
}

function goToLanding() {
  if (transitioning || section === 'landing') return;
  setTransitioning(true);
  setSection('landing');
  setTimeout(() => setTransitioning(false), 650);
}
```

**Trigger `goToExperiences`:**
- `onWheel` on the landing section: if `e.deltaY > 0` and `section === 'landing'`, call `goToExperiences()`
- Clicking the chevron scroll indicator

**Trigger `goToLanding`:**
- The close/back button in the experiences panel top bar
- The `onWheel` handler in `ExperiencesPanel` when at list scroll top and `deltaY < 0`

Pass `goToLanding` as a prop to `ExperiencesPanel`.

---

## Mock Data

**File:** `src/data/experiences.ts`

```ts
export type Experience = {
  id: string;
  title: string;
  company: string;
  type: 'Work' | 'Project' | 'Research';
  skills: string[];
  date: string;
  summary: string;
  details: string;
  files: { name: string; type: 'pdf' | 'image' }[];
};

export const EXPERIENCES: Experience[] = [
  {
    id: '1',
    title: 'Frontend Engineer Intern',
    company: 'Acme Corp',
    type: 'Work',
    skills: ['React', 'TypeScript', 'Node.js'],
    date: 'May – Aug 2024',
    summary: 'Built internal tooling dashboards serving 200+ daily users.',
    details: 'Led development of three internal dashboard applications using React and TypeScript. Reduced page load time by 40% through code splitting and lazy loading. Collaborated with the design team to implement a new component library, improving consistency across 12 product surfaces.',
    files: [{ name: 'internship-report.pdf', type: 'pdf' }],
  },
  {
    id: '2',
    title: 'ML Research Assistant',
    company: 'University of Toronto',
    type: 'Research',
    skills: ['Python', 'Machine Learning', 'PyTorch'],
    date: 'Sep 2023 – Apr 2024',
    summary: 'Researched transformer attention mechanisms for time-series data.',
    details: 'Assisted in a lab studying efficient attention mechanisms for long-sequence time-series forecasting. Implemented three baseline models from scratch in PyTorch, ran ablation studies across 6 datasets, and contributed to a workshop paper submitted to NeurIPS. Managed a dataset pipeline processing 50GB of sensor data.',
    files: [{ name: 'research-paper-draft.pdf', type: 'pdf' }, { name: 'poster.pdf', type: 'pdf' }],
  },
  {
    id: '3',
    title: 'Portfolio Website',
    company: 'Personal Project',
    type: 'Project',
    skills: ['React', 'TypeScript', 'Design'],
    date: 'Jun 2025',
    summary: 'This website — built with Vite, React 19, and Tailwind CSS v4.',
    details: 'Designed and engineered a personal portfolio with a focus on motion design and 3D web aesthetics. Features a custom 3D card component with mouse-tracking parallax, a physics-based panel transition system, and a responsive experience browser. Built with Vite, React 19, TypeScript, and Tailwind CSS v4.',
    files: [{ name: 'design-mockup.png', type: 'image' }],
  },
  {
    id: '4',
    title: 'Full-stack Developer',
    company: 'Startup XYZ',
    type: 'Work',
    skills: ['React', 'Node.js', 'TypeScript'],
    date: 'Jan – Apr 2024',
    summary: 'Shipped a B2B SaaS MVP from zero to 50 paying customers in 4 months.',
    details: 'Co-developed a B2B SaaS application for logistics routing optimization. Owned the full frontend and contributed to the Node.js API. Integrated Stripe for billing, built a real-time map interface using Mapbox GL, and set up a CI/CD pipeline on GitHub Actions. The product reached 50 paying customers within 4 months of launch.',
    files: [{ name: 'case-study.pdf', type: 'pdf' }],
  },
  {
    id: '5',
    title: 'Design Systems Library',
    company: 'Open Source',
    type: 'Project',
    skills: ['React', 'TypeScript', 'Design'],
    date: 'Aug 2023',
    summary: 'A composable component library with 40+ components and full a11y support.',
    details: 'Created and published an open-source React component library to npm, reaching 800+ downloads per month. Built with TypeScript, Radix UI primitives, and Tailwind CSS. Includes full keyboard navigation, ARIA compliance, and a Storybook documentation site. Components are used across 3 internal projects.',
    files: [{ name: 'docs-screenshot.png', type: 'image' }, { name: 'npm-stats.pdf', type: 'pdf' }],
  },
  {
    id: '6',
    title: 'NLP Sentiment Analysis Tool',
    company: 'Hackathon Project',
    type: 'Project',
    skills: ['Python', 'Machine Learning', 'React'],
    date: 'Nov 2023',
    summary: 'Won 2nd place at HackTheNorth. Real-time social media sentiment dashboard.',
    details: 'Built over 36 hours at HackTheNorth 2023 with a team of 3. A real-time sentiment analysis dashboard that ingests Twitter/X data, classifies posts using a fine-tuned DistilBERT model, and displays trends on an interactive React frontend. Placed 2nd overall out of 200+ teams.',
    files: [{ name: 'demo-video.pdf', type: 'pdf' }],
  },
];
```

---

## File Structure

```
src/
  App.tsx                         ← main layout, section state, scroll logic
  assets/
    photo.png                     ← user's headshot (transparent bg PNG, placed by user)
  components/
    IDCard.tsx                    ← 3D tilt card with sheen
    FilterDropdown.tsx            ← 3D styled dropdown
    ExperiencesPanel.tsx          ← full panel with list
    ExperienceSidebar.tsx         ← right detail sidebar
  data/
    experiences.ts                ← mock data
  components/ui/
    bg-pattern.tsx                ← EXISTING, do not modify
  index.css                       ← EXISTING theme + new animation keyframes
  lib/
    utils.ts                      ← EXISTING cn() helper
index.html                        ← add JetBrains Mono link if not present
```

---

## CSS Additions to `src/index.css`

Append these to the existing file — do **not** replace the `@theme` block:

```css
/* Scroll indicator bob animation */
@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(5px); }
}

/* Scroll indicator fade in */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Stagger entrance for experience cards */
@keyframes card-enter {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Prevent layout shift during 3D transforms */
.preserve-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
```

---

## Consistency Rules

These rules must be respected throughout every component:

1. **Font:** Use Clash Grotesk for ALL text (headings, labels, buttons, tags, descriptions). JetBrains Mono only for dates and file names. Never use `font-sans` or system-ui without the Clash Grotesk fallback.

2. **Border radius vocabulary:** Cards → `12px`; Buttons → `10px`; Dropdown panels → `10px`; Pill tags → `999px`; Small UI elements (tabs, chips) → `6px–8px`. Never use `rounded-full` on rectangular elements.

3. **3D shadow system:** Every interactive surface has a shadow with at least two layers — a tight ambient layer and a softer spread. Hover state deepens both. Active/pressed state collapses both. Never use a single flat shadow.

4. **Color usage:** `#C4EEF0` (accent) is for selected states, active indicators, and emphasis only — never for backgrounds. `#D2DCE5` (foreground) for all primary text. `rgba(210, 220, 229, 0.4–0.6)` for secondary/muted text. `#2E353B` for all raised card surfaces. Never use pure white or pure black.

5. **No gradients on text.** All text uses `color:` only. The 3D effect on the name text comes exclusively from `text-shadow`.

6. **Motion speed:** Micro-interactions (hover) = 200–300ms. Panel transitions = 600ms. Stagger delays no longer than 60ms per item. No animation should feel sluggish. Respect `prefers-reduced-motion` — wrap all `@keyframes` usage in a `@media (prefers-reduced-motion: no-preference)` block, and set transitions to `0ms` otherwise.

7. **All `z-index` values must be explicit and documented in a comment** so layers don't conflict: BGPattern → `z-[-10]`, Landing content → `z-10`, Experiences panel → `z-50`, Sidebar → `z-20` (within panel stacking context), Dropdowns → `z-100`.

8. **The BGPattern component stays as the landing background only.** It does not appear in the Experiences panel. The panel has a flat `#262C31` background to create a distinct feel when the user transitions.

9. **Spacing scale:** Use Tailwind's spacing throughout. Card padding = `p-5` (`20px`). Section padding = `px-8 py-12` on desktop, `px-4 py-8` on mobile. Gap between major layout elements = `gap-12` desktop, `gap-8` mobile.

10. **TypeScript:** All components must be fully typed. No `any`. `Experience` type imported from `@/data/experiences`. Props interfaces defined for every component.

---

## Implementation Notes

- The `IDCard` component should accept a `photoSrc?: string` prop. If undefined, render the initials fallback. The parent passes `import photoPng from '@/assets/photo.png'` — if the file doesn't exist, TypeScript will error; add a `.d.ts` declaration for `*.png` if needed.
- Use `useRef<HTMLDivElement>` for the card wrapper to attach the RAF loop without triggering re-renders.
- The `ExperiencesPanel` receives `isVisible: boolean` and `onClose: () => void` props from `App.tsx`. It manages its own `selectedExperience`, `skillFilter`, `typeFilter` state internally.
- The sidebar open/close state lives in `ExperiencesPanel`. When sidebar opens, add `transition: width 350ms cubic-bezier(0.76, 0, 0.24, 1)` to the list column width change rather than an abrupt jump.
- Dropdowns should close when clicking outside — use a `useEffect` that adds a `mousedown` listener on `document` and checks if the click target is outside the dropdown ref.
- Do not use `gsap` or any animation library. All motion is achieved with CSS transitions, `@keyframes`, and `requestAnimationFrame` only.
- The only external dependency addition needed is none — lucide-react is already available per the project state.
