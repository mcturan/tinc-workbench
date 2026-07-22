# TINC Design System

## 1. Design Principles
1. **Hardware First**: The canvas is the hero. The UI must remain unobtrusive, fading into the background when not in use.
2. **Minimal Chrome**: Eliminate unnecessary borders, backgrounds, and drop shadows. Use spacing to create visual hierarchy.
3. **Calm Aesthetics**: Utilize a low-saturation, high-contrast color palette to reduce eye strain during long engineering sessions.
4. **Predictable Patterns**: A button should always look like a button. A panel should always behave like a panel. Consistency builds trust.
5. **Progressive Disclosure**: Only show controls when they are contextually relevant (e.g., auto-hide the Property Inspector when selection is empty).

---

## 2. Color Tokens

The application must use **only** the following CSS variable tokens. Hardcoded hex colors are strictly forbidden.

### Surfaces
- `--bg-canvas`: The lowest layer. The infinite void where hardware is designed. (Dark/Neutral base)
- `--bg-surface`: Primary content areas (Modals, Dialogs, Welcome Screen cards).
- `--bg-sidebar`: Docked panels (Left/Right sidebars).
- `--bg-toolbar`: Navigation and top-level action bars.

### Content
- `--text-primary`: Primary text, standard icons, active elements.
- `--text-secondary`: Subtitles, metadata, inactive icons, placeholders.
- `--border`: Standard structural separators and dividers.
- `--border-strong`: Focused inputs, active drag states, pronounced separators.

### Semantic & Accents
- `--accent`: The primary brand color. Used sparingly for primary actions (e.g., Floating Action Button, active tabs).
- `--success`: Success states, valid checks.
- `--warning`: Warnings, non-critical alerts, ERC warnings.
- `--danger`: Destructive actions, ERC errors, invalid routing.

---

## 3. Typography Scale

TINC uses a strict typographic scale utilizing the system default sans-serif stack (falling back to `Inter` where available) to feel native to the user's OS.

- `font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;`

### Scale
- **Display**: `24px` / `1.2` line-height / `600` weight (Welcome Screen Title)
- **Heading 1**: `16px` / `1.4` line-height / `600` weight (Sidebar Headers, Panel Titles)
- **Heading 2**: `14px` / `1.4` line-height / `600` weight (Section Headers)
- **Body**: `13px` / `1.5` line-height / `400` weight (Standard UI Text, Lists, Descriptions)
- **Caption**: `11px` / `1.4` line-height / `500` weight (Badges, Metadata, Inspector Labels)

---

## 4. Spacing Scale

All layout padding, margins, and gaps must adhere to an 8-point base grid (subdividing to 4 points for micro-adjustments).

- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `xxl`: 32px

---

## 5. Elevation & Shadows

Drop shadows are used strictly for floating, transient elements. Docked or flat elements must use borders, not shadows.

- **Level 0 (Flat)**: No shadow. (Sidebars, Canvas, Toolbars)
- **Level 1 (Hover)**: `0 2px 8px rgba(0,0,0,0.1)`. (Hover states for cards or large buttons)
- **Level 2 (Floating)**: `0 4px 12px rgba(0,0,0,0.15)`. (Floating Action Buttons, Tooltips)
- **Level 3 (Modal)**: `0 10px 30px rgba(0,0,0,0.2)`. (Global Search, Welcome Screen, Dialogs)

---

## 6. Border Radius

- **Small (`4px`)**: Inputs, standard buttons, small tags.
- **Medium (`6px`)**: Cards, dropdown menus, context menus.
- **Large (`8px`)**: Modals, large surface panels (Global Search container).
- **Pill (`9999px`)**: Badges, Floating Action Buttons.

---

## 7. UI Component Rules

### Sidebars & Panels
- Must be docked flush against the edges.
- Separated from the canvas via a single `1px solid var(--border)`.
- Internal padding must be `md` (12px) or `lg` (16px) consistently.

### Toolbars
- Must be minimal. Only primary navigation items.
- Height is fixed (`44px` or `40px` depending on density).
- Items align vertically center with `sm` (8px) gaps.

### Buttons
- **Primary**: Filled with `var(--accent)`, text color white/inverse.
- **Secondary / Ghost**: Transparent background, `var(--text-primary)`, changes to `var(--bg-toolbar)` or `var(--border)` on hover.
- **Icons**: Must use SVG paths or consistent unicode glyphs. Sizing must be identical.

### Empty States
- Must be vertically and horizontally centered.
- Use `--text-secondary` for color.
- Typography: Body size.
- Should ideally provide a one-click action to resolve the empty state.

---

## 8. Motion & Interaction Guidelines
- **Transitions**: Keep it fast. `0.1s` to `0.15s` `ease-in-out` for color, background, and shadow changes.
- **Transforms**: Use `scale(0.97)` on `:active` states for buttons to provide tactile feedback without relying on complex color shifts.
- **Focus**: Inputs must use `outline: 2px solid var(--accent)` (with appropriate offset) for accessibility, rather than changing border colors alone.
