# Design System Specification: The Sovereign Ledger

## 1. Overview & Creative North Star
**Creative North Star: "The Sovereign Ledger"**
This design system rejects the cluttered, line-heavy aesthetic of traditional enterprise software. Instead, it draws inspiration from high-end editorial layouts and premium physical stationery. The goal is to create a digital environment that feels authoritative, surgically precise, and quiet. 

By utilizing a "No-Line Architecture," we transition from a "software" feel to a "document" feel. We prioritize mathematical harmony, intentional asymmetry, and tonal depth over rigid, bordered grids. For the Saudi market, this means respecting the flow of RTL (Right-to-Left) typography with the same prestige one would find in a royal decree or a high-end financial report.

---

## 2. Colors & Tonal Architecture
The palette is rooted in "Platinum" and "Deepest Royal Navy," creating a high-contrast, high-trust environment.

### Surface Hierarchy & Nesting
Traditional UI uses borders to separate content; this design system uses **Tonal Layering**.
- **Base Layer:** The primary canvas is `surface` (#F8F9FA).
- **Structural Shifts:** Use `surface_container_low` (#F3F4F5) to define large functional areas (like a sidebar or a secondary utility rail).
- **Document Cards:** All primary content must sit on `surface_container_lowest` (#FFFFFF) cards. This creates a "sheet of paper" effect against the platinum background.
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries are defined solely by the shift from `surface` to `surface_container`.

### Signature Accents
- **The Navy Authority:** `primary_container` (#001C39) is reserved for high-level navigation and primary brand moments. 
- **The Emerald Standard:** `on_tertiary_container` (#009768) and its variants represent "Success" and "Growth." In a financial context, this must feel professional—avoid neon greens; use the muted, deep emerald provided.
- **Glass & Gradient Rule:** For primary Action Buttons or Hero Data points, use a subtle linear gradient from `primary_container` to a slightly lighter variant to add "soul" and dimension, preventing the UI from feeling "flat" or "cheap."

---

## 3. Typography: The Editorial Edge
Typography is our most powerful tool for conveying precision. We pair a geometric headline face with a high-legibility data face.

- **Headlines (Manrope / Tajawal):** These should be bold and assertive. Use `display-lg` and `headline-lg` for dashboard summaries and section headers. The geometric nature of Manrope mirrors the architectural strength of Tajawal in RTL contexts.
- **Financial Data (Inter / Cairo):** For high-density tables and logistics tracking, use `body-md` and `label-sm`. Cairo’s sharp apertures and Inter’s tall x-height ensure that complex numbers remain legible even at high densities.
- **Hierarchy:** Use `on_surface_variant` (#43474D) for secondary labels to create a clear "read-order" where the data (in `on_surface`) is the hero.

---

## 4. Elevation & Depth
In a no-line system, depth is the only way to communicate "clickability" and "importance."

- **The Layering Principle:** Depth is achieved by stacking. A `#FFFFFF` card sits on a `#F8F9FA` background. If a card requires further nesting, the inner element uses `surface_container_high`.
- **Ambient Shadows:** Standard drop shadows are too "web-like." When an element must float (e.g., a modal or a floating action button), use an extra-diffused shadow: `blur: 24px`, `opacity: 6%`, colored with the `on_surface` token. It should feel like a soft shadow cast by a desk lamp onto paper.
- **The "Ghost Border" Fallback:** If accessibility requirements demand a border (e.g., in high-contrast modes), use `outline_variant` at 15% opacity. Never use 100% opaque lines.
- **Glassmorphism:** For floating navigation or context menus, use `surface_container_lowest` with a 70% opacity and a `backdrop-blur: 12px`. This integrates the component into the environment rather than making it feel "pasted on."

---

## 5. Components

### Buttons
- **Primary:** High-contrast `primary_container` with `on_primary` text. Use `rounded-md` (0.375rem). Use a very subtle 2px inner-top-glow to simulate a premium tactile button.
- **Secondary:** `surface_container_high` background. No border.
- **Tertiary:** Text-only with an icon. No background until hover.

### Document Cards
- **Style:** Pure white (#FFFFFF) with `rounded-lg` (0.5rem) corners. 
- **Content:** No dividers between list items inside a card. Use `1.5rem` of vertical padding and subtle `surface_container_low` background shifts on hover to indicate row selection.

### Input Fields
- **Architecture:** "Filled" style using `surface_container_low`. 
- **State:** On focus, the background shifts to `surface_container_lowest` (#FFFFFF) and gains a subtle `primary` (Navy) indicator—not a full border, but a 2px bottom-accent or a "ghost" shadow.

### Data Tables (High Density)
- **Header:** Use `on_surface_variant` at `label-md` weight. 
- **Rows:** No horizontal lines. Use a alternating zebra-striping with `surface_container_low` or simply rely on white space.
- **RTL Alignment:** Ensure financial totals are always aligned to the left in RTL (standard international accounting practice) while text labels remain aligned to the right.

---

## 6. Do's and Don'ts

### Do's
- **DO** use generous white space. High density doesn't mean "cramped"; it means "efficient."
- **DO** use the `surface_container` tiers to create hierarchy. If everything is white, nothing is important.
- **DO** ensure RTL layouts feel natural. Icons that imply direction (arrows, progress bars) must be flipped.

### Don'ts
- **DON'T** use 1px solid borders. It breaks the "Sovereign" editorial feel.
- **DON'T** use pure black (#000000). It is too harsh against the Platinum background. Always use `on_surface`.
- **DON'T** use standard "Material Design" shadows. They are too aggressive for this sophisticated aesthetic.
- **DON'T** use dividers in lists. Use 8px or 12px gaps and tonal shifts instead.