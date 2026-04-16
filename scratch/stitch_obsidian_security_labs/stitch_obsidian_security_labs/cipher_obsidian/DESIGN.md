# Design System Specification: The Obsidian Pulse

## 1. Overview & Creative North Star
### Creative North Star: "The Digital Vanguard"
The Digital Vanguard is a design philosophy that merges the raw, technical energy of the Y2K hacking era with the clinical precision of a modern corporate security firm. We are moving away from "standard" dashboard aesthetics to create an experience that feels like a high-end, proprietary OS used by elite operatives.

This design system rejects the "web-page-as-a-document" mental model. Instead, it treats the interface as a **Tactical Glass Surface**. By leveraging intentional asymmetry, razor-sharp edges, and deep tonal layering, we create a sense of focused aggression (Red Team) tempered by professional stability (Blue Team). We avoid generic grids in favor of "active-corner" layouts—where information is anchored to the extremes of the viewport, creating a wide, cinematic field of view.

---

## 2. Colors & Surface Philosophy
The palette is rooted in an ultra-dark grayscale foundation to represent the "void" of cyberspace, punctuated by high-frequency purples that represent active data streams.

### The "No-Line" Rule
Traditional 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined through:
1.  **Tonal Shifts:** Placing a `surface-container-high` module atop a `surface` background.
2.  **Negative Space:** Using the spacing scale to create invisible gutters that define the eye's path.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, semi-transparent layers.
*   **Base:** `surface` (#0e0e0f) – The infinite canvas.
*   **Sectioning:** `surface-container-low` (#131314) – Use for large secondary areas like sidebars.
*   **Active Modules:** `surface-container-highest` (#262627) – Use for cards and interactive terminal windows.

### The "Glass & Gradient" Rule
To achieve the avant-garde Y2K feel, use **Glassmorphism** for all floating elements (Modals, Hover Tooltips, Floating Action Menus). 
*   **Recipe:** `surface-variant` at 60% opacity + `backdrop-filter: blur(12px)`.
*   **Gradients:** Use a subtle linear gradient (45deg) from `primary` (#ca98ff) to `primary-dim` (#9c42f4) for high-intent CTAs. This adds a "liquid light" effect that flat colors lack.

---

## 3. Typography
The typography strategy creates a tension between "Human Readability" and "Machine Logic."

*   **The Technical Engine (Inter):** Used for all `body` and `title` roles. It provides the corporate stability and legibility required for complex hacking tasks.
*   **The Avant-Garde Accent (Space Grotesk):** Used for `display`, `headline`, and `label` roles. Its wider tracking and geometric apertures provide the futuristic, technical vibe.

**Scale Usage:**
*   **Display LG (3.5rem):** Use for hero statistics (e.g., "99% SYSTEM BREACH").
*   **Label SM (0.6875rem):** Always uppercase with 10% letter spacing. Use for metadata, technical timestamps, and "Red vs Blue" status indicators.

---

## 4. Elevation & Depth
In this system, depth is not "height," it is **"Density."**

### The Layering Principle
Do not use drop shadows to indicate elevation. Instead, stack container tiers. A `surface-container-highest` element feels "closer" to the user because it is lighter than the `surface` below it.

### Ambient Shadows
If a floating element requires separation from a complex background, use a **Tinted Ambient Glow**:
*   **Shadow:** `0px 20px 40px rgba(138, 43, 226, 0.08)` (a faint purple bloom).
*   Avoid pure black shadows; they "muddy" the deep grays of the background.

### The "Ghost Border" Fallback
Where containment is required for accessibility, use a **Ghost Border**:
*   **Token:** `outline-variant` (#484849) at 20% opacity.
*   **Execution:** 1px width, **0px border-radius**. Sharp edges are non-negotiable.

---

## 5. Components

### Buttons (Tactical Trigger)
*   **Primary:** Solid `primary` (#ca98ff) with `on-primary` text. No rounded corners. 
*   **Secondary:** Ghost Border with `primary` text. On hover, fill with `primary-container` at 10% opacity.
*   **States:** On hover, add a 2px "scanning" underline animation using `primary-fixed-dim`.

### Input Fields (Data Entry)
*   **Styling:** `surface-container-lowest` background with a bottom-only border of `outline`. 
*   **Focus:** The bottom border transforms into a `primary` glow.
*   **Error:** Use `error` (#ff6e84) for the bottom border and helper text.

### Cards & Lists (Data Clusters)
*   **Constraint:** Forbid the use of horizontal dividers. 
*   **Separation:** Use `8px` of vertical white space and subtle `surface` shifts. 
*   **Interactivity:** On hover, a card should shift from `surface-container` to `surface-bright`.

### Tactical Chips
*   **Red Team / Blue Team:** Red Team uses `tertiary-container` (reddish); Blue Team uses `secondary-container` (purplish).
*   **Style:** Sharp edges, `label-sm` typography, 1px ghost border.

### Pulse Indicator (Custom Component)
A small, breathing dot using `primary` for "System Online" or `error` for "System Compromised." Use a `2s` ease-in-out opacity animation (0.4 to 1.0).

---

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme contrast in typography sizing (e.g., a tiny `label-sm` next to a massive `display-lg`).
*   **Do** keep all corners at `0px`. Roundness kills the avant-garde hacking aesthetic.
*   **Do** use `primary` sparingly. It is a "laser," not a "paint." Use it to draw the eye to the most critical action.

### Don't:
*   **Don't** use 100% opaque borders to separate sections.
*   **Don't** use standard "drop shadows" or soft, bubbly UI elements.
*   **Don't** introduce any colors outside the grayscale and purple spectrum, except for status-critical errors (`error` / `tertiary` tokens).
*   **Don't** use dividers. If the content feels cluttered, increase the spacing or adjust the surface tier.