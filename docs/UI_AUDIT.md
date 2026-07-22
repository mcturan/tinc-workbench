# TINC Workbench UI Audit

## Overview
This audit examines the current state of the TINC Workbench user interface. The goal is to identify inconsistencies in visual language, layout paradigms, and interaction patterns across the application. This analysis serves as the foundation for the TINC Design System.

## Key Inconsistencies

### 1. Color System
- **Fragmented Tokens**: The application uses a mix of native CSS variables (`var(--bg-surface)`, `var(--text-primary)`) and hardcoded hex values (`#191a21`, `#44475a`, `#6272a4`, `#bd93f9`, `#8be9fd`, `#50fa7b`).
- **Semantic Mismatch**: Colors like `--success` or `#8be9fd` are used for branding or non-status elements (e.g., component names or example tags), diluting their semantic meaning.
- **Contrast Issues**: Secondary text colors and subtle borders occasionally lack the contrast necessary for high legibility on dark or light backgrounds.

### 2. Surface Hierarchy and Elevation
- **Inconsistent Shadows**: The application uses wildly different drop shadows to indicate elevation:
  - Global Search Panel: `0 10px 25px rgba(0,0,0,0.5)`
  - Floating Add Button: `0 4px 12px rgba(0,0,0,0.3)`
  - Sidebars: Heavy shadows were partially removed but residual drop-shadows exist.
- **Surface Layering**: The distinction between `--bg-canvas`, `--bg-surface`, `--bg-sidebar`, and `--bg-toolbar` is sometimes blurred. Elements that should belong to the same elevation plane use different background variables.

### 3. Typography
- **Ad-Hoc Scales**: Font sizes are chosen arbitrarily per component (`10px`, `11px`, `12px`, `14px`, `15px`, `18px`, `20px`, `42px`). There is no defined typographic scale (e.g., Headline 1, Subtitle, Body, Caption).
- **Font Weights**: Mixed usage of `600`, `700`, and `bold`.
- **System Fonts**: The application explicitly declares `"Inter", sans-serif` in some inline styles but leaves others to inherit browser defaults.

### 4. Spacing and Grid
- **Magic Numbers**: Margins, paddings, and gaps rely on arbitrary numbers (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `40px`, `48px`). While roughly adhering to a 4px/8px grid, there are many exceptions.
- **Component Density**: The Welcome Screen cards feel spacious and modern, whereas the Property Inspector feels dense and utilitarian.

### 5. Borders and Radii
- **Radii Chaos**: Border radii fluctuate without semantic meaning (`4px` for inputs, `6px` or `8px` for buttons, `10px` or `12px` for badges, `24px` for the floating action button).
- **Border Colors**: Hover states often rely on changing border colors (e.g., `transparent` to `var(--border)`), which can cause layout shifting or visual noise if not handled correctly.

### 6. Component Level Observations
- **Buttons**: There are multiple button implementations. The floating `+` button is highly stylized, while toolbar buttons are plain text or emojis (`☰`, `⚙`).
- **Sidebars**: The Left Sidebar (Component Browser) and Right Sidebar (Property Inspector) handle their empty states and internal padding differently.
- **Global Search**: The search input field lacks a clear active/focus state beyond the default browser behavior, and result highlights rely on changing the entire background rather than subtle indicators.
- **Canvas**: The drawing canvas uses a `1x1` dot grid, but interactions (like wiring and placing) do not visually tie into the UI styling language.

## Conclusion
The application is functionally sound but visually fragmented. It currently looks like an amalgamation of different themes (Dracula-inspired dark mode elements mixed with native OS defaults). By establishing a rigid Design System driven by primitive tokens, we can unify the interface and elevate it to match modern productivity tools like Linear, Notion, or Figma.
