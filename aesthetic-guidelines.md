# Aesthetic & Animation Guidelines

This document outlines the core aesthetic principles, color palette, typography, and complex animation orchestration used in this project. It serves as a strict reference to maintain design consistency and mechanical reliability across future sessions.

## 1. Color Palette

The project uses a moody, cinematic slate-gray color palette with sharp, vibrant typography to create a premium, 3D-heavy experience.

- **App Backgrounds:**
  - Main Body Background: `#262c31` (Slate gray)
  - Secondary/Panel Background: `#1e2428` (Darker slate)
  - Grid Pattern: `#1a2227`
- **Typography & Accents:**
  - Primary Text: `#D2DCE5` (Crisp off-white)
  - Secondary/Muted Text: `rgba(164,198,211,0.7)` (Muted icy blue)
  - Borders/Lines: `rgba(46, 53, 59, 0.5)`

## 2. Typography & Text Effects

- **Font Family:** `Clash Grotesk`, falling back to `system-ui`, `sans-serif`.
- **Text Shadows (3D Depth):** 
  Hero typography uses heavily stacked, multi-layer text shadows to create physical thickness and depth against the background. 
  *Example (Default State):*
  ```css
  text-shadow: 
    0 2px 0 #4B6376,
    0 4px 0 rgba(75, 99, 118, 0.6),
    0 8px 16px rgba(0, 0, 0, 0.5),
    0 16px 32px rgba(0, 0, 0, 0.3);
  ```
  *Example (Hover State - Lifts up):*
  ```css
  transform: translateY(-3px);
  text-shadow: 
    0 5px 0 #4B6376,
    0 8px 0 rgba(75, 99, 118, 0.5),
    0 12px 20px rgba(0, 0, 0, 0.6),
    0 24px 40px rgba(0, 0, 0, 0.3);
  ```

## 3. The 3D "Flipping" Animation System

The flagship interaction of the app is a 3D object (the ID Card) that flips, moves to the center of the screen, and expands to fill the viewport. This is mathematically complex and requires specific implementation rules to prevent browser bugs.

### State Machine Orchestration
Never rely on purely CSS `:hover` or toggle classes for multi-phase complex animations. Use a React state machine to track the exact phase of the motion:
1. `hidden`: The expanded panel is invisible and tracks the exact DOM position of the original small card.
2. `flipping_in`: The panel becomes visible, scales slightly, and flies to the absolute center of the viewport while flipping 180 degrees.
3. `expanding`: The panel stays in the center and its dimensions grow to fill the viewport (`100%`).
4. `open`: The panel rests at full screen.
5. `collapsing`: The panel shrinks back to its card dimensions in the center of the screen.
6. `flipping_out`: The panel flies back to its original DOM position and flips back over.

### Symmetrical Easing
To make the motion feel natural and physically grounded, use symmetrical, palindromic bezier curves for the spatial movement.
- **Flying IN (Decelerating):** `transition: 800ms cubic-bezier(0.25, 1, 0.5, 1)`
- **Flying OUT (Accelerating):** `transition: 800ms cubic-bezier(0.5, 0, 0.75, 0)`

For the expansion/collapsing phase, use a sharp ease-in-out:
- **Expanding/Collapsing:** `transition: 400ms cubic-bezier(0.76, 0, 0.24, 1)`

> [!WARNING]
> **The Transition "Twitch" Bug**
> If you change a React inline style's `transition` property (e.g., swapping easing curves) on the exact same frame that a spatial transition ends, the browser layout engine drops its GPU compositing layer for a millisecond, causing a 1-pixel jitter/twitch. To fix this, always preserve the current `transition` string during the resting state (e.g., keep the `ease-in` string active while `hidden`).

### Layout Anchoring (Fixing transform-origin bugs)
When animating an element's `width` and `height` alongside a 3D `transform` (like rotating and scaling), browsers like Safari and Chrome will often fail to interpolate the `transform-origin` dynamically, causing the element to veer wildly off-center.

**The Fix:** NEVER position an expanding container via top-left (`0,0`).
Always anchor expanding 3D panels to the dead center of the viewport using this formula:
```css
position: fixed;
top: 50%;
left: 50%;
/* The translate(-50%, -50%) forces the physical box to grow symmetrically around the fixed anchor */
transform: translate3d(x, y, 0) translate(-50%, -50%) rotateY(180deg) scale(1);
```

## 4. Cinematic Parallax & Lighting

When the foreground (the card) moves toward the camera, the background must physically react to create deep space.

### 1. Parallax Scaling
The background `scale` should reduce as the card gets closer to simulate distance.
- Start: `scale(1)`
- Flipping In: `scale(0.8)`
- Expanding: `scale(0.7)`

### 2. Proportional Dimming
Because the human eye perceives brightness logarithmically, do not drop lighting drastically during subtle movements. Plunge into darkness *only* when the foreground object expands to block out the light.
- **Flipping In:** Subtle dimming (Brightness `0.7`, Root Black Overlay `0.3`).
- **Expanding:** Dramatic shadow (Brightness `0.15`, Root Black Overlay `0.85`).

### 3. Root Overlay
Using `filter: brightness()` on a shrinking element exposes the bright edges of the HTML `body` behind it. Always animate the `background-color` of a full-screen root wrapper (e.g., to `rgba(0,0,0, 0.85)`) so the shrinking background beautifully melts into the surrounding pitch-black void.
