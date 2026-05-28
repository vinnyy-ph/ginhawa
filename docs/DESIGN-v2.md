---
name: Ginhawa Design System
version: 2.0
colors:
  # Surfaces
  surface: '#f7faf9'
  surface-dim: '#d7dbda'
  surface-bright: '#f7faf9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f3'
  surface-container: '#ebeeed'
  surface-container-high: '#e6e9e8'
  surface-container-highest: '#e0e3e2'
  on-surface: '#181c1c'
  on-surface-variant: '#3d4946'
  inverse-surface: '#2d3131'
  inverse-on-surface: '#eef1f0'
  outline: '#6d7a76'
  outline-variant: '#bcc9c5'
  surface-tint: '#006b5e'

  # Primary
  primary: '#006b5e'
  on-primary: '#ffffff'
  primary-container: '#31a795'
  on-primary-container: '#00352e'
  inverse-primary: '#6bd9c5'

  # Secondary
  secondary: '#006b5e'
  on-secondary: '#ffffff'
  secondary-container: '#78f4df'
  on-secondary-container: '#006f62'

  # Tertiary
  tertiary: '#356761'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d9f98'
  on-tertiary-container: '#003530'

  # Error — softened for medical context
  error: '#c0392b'
  on-error: '#ffffff'
  error-container: '#fde8e6'
  on-error-container: '#7d1d1d'

  # Fixed
  primary-fixed: '#88f5e1'
  primary-fixed-dim: '#6bd9c5'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005046'
  secondary-fixed: '#7bf7e2'
  secondary-fixed-dim: '#5bdac6'
  on-secondary-fixed: '#00201b'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#b8ede5'
  tertiary-fixed-dim: '#9dd0c9'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#1a4f49'

  # Background
  background: '#f7faf9'
  on-background: '#181c1c'
  surface-variant: '#e0e3e2'

  # Semantic
  leaf-shadow: '#86beb5'
  surface-white: '#ffffff'
  status-success: '#31a795'
  status-info: '#48cab6'
  status-warning: '#e09b2d'
  status-error: '#c0392b'
  text-primary: '#1a3a35'

  # Dark mode surfaces
  dark-surface: '#0e1a18'
  dark-surface-container: '#1a2724'
  dark-surface-container-high: '#243330'
  dark-on-surface: '#e0e3e2'
  dark-on-surface-variant: '#bcc9c5'
  dark-outline: '#8a9895'
  dark-primary: '#6bd9c5'
  dark-on-primary: '#00352e'
  dark-primary-container: '#005046'
  dark-on-primary-container: '#88f5e1'

  # Video call
  video-overlay-bg: 'rgba(14, 26, 24, 0.85)'
  video-controls-bg: 'rgba(14, 26, 24, 0.72)'
  video-pip-border: '#31a795'
  video-muted-indicator: '#c0392b'
  video-signal-strong: '#31a795'
  video-signal-weak: '#e09b2d'
  video-signal-lost: '#c0392b'

  # Accessibility focus
  focus-ring: '#006b5e'
  focus-ring-offset: '#ffffff'

typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  # Medical data — monospace for lab values, dosages, vitals
  medical-data:
    fontFamily: JetBrains Mono, monospace
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px

rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px

spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1200px
  # Medical form tap targets — minimum for patient usability
  tap-target-min: 48px
  form-row-gap: 20px

accessibility:
  wcag-target: AA (WCAG 2.1)
  min-contrast-normal: 4.5:1
  min-contrast-large: 3.0:1
  focus-ring-width: 3px
  focus-ring-offset: 2px
---

## Brand & Style

The brand personality is defined by the Tagalog concept of *Ginhawa*—representing ease, relief, and the physical breath of wellness. This design system targets patients and healthcare providers in the Philippines, prioritizing a visual language that feels culturally resonant, approachable, and professionally reliable.

The chosen style is **Modern Corporate with a Tactile twist**. It utilizes a "Soft Flat" philosophy derived from the reference logo, employing multi-stop teal gradients and organic layering. The UI avoids the sterility of traditional medical software, instead using soft edges and vibrant, healthy greens to evoke a sense of tranquility and "freshness." It is designed to be highly accessible, ensuring clarity for users navigating healthcare under stress.

---

## Colors

The palette is rooted in a monochromatic teal/seafoam spectrum.

- **Primary:** A deep, trustworthy teal (`#006b5e`) used for main actions and brand identity.
- **Secondary:** A bright, energetic seafoam (`#48cab6`) for highlights and active states.
- **Tertiary:** A soft, desaturated mint (`#ade1d9`) used for secondary surfaces and background accents.
- **Neutral:** A very light, cool-tinted grey (`#f4f7f6`) that provides a cleaner, softer alternative to pure white, reducing eye strain for doctors during long shifts.

The default mode is **Light**, with a fully defined **Dark** mode for evening teleconsult sessions (see Dark Mode section).

### Error & Status Colors

Error states use a softened coral-red (`#c0392b`) rather than a bright alarm red. In medical interfaces, a high-contrast red near a diagnosis field or prescription form can feel alarming and increase patient anxiety. Error messages must always pair color with a descriptive text label — never color alone.

| Token | Value | Usage |
|---|---|---|
| `status-success` | `#31a795` | Appointment confirmed, prescription sent |
| `status-info` | `#48cab6` | Doctor online, session ready |
| `status-warning` | `#e09b2d` | Appointment in 10 min, connection unstable |
| `status-error` | `#c0392b` | Session failed, payment error |

---

## Typography

Typography balances warmth with technical precision.

- **Plus Jakarta Sans** is used for headlines to provide a friendly, modern, and optimistic tone. Its soft curves mirror the organic nature of the logo.
- **Manrope** is used for body text and labels to ensure maximum legibility and a professional, systematic feel for medical data and patient records.
- **JetBrains Mono** is used exclusively for medical data values: lab results, dosages, vital signs, and prescription quantities. Monospace rendering prevents digit-width inconsistency (e.g. "1" vs "8") in clinical readings.

For mobile devices, headlines are scaled down slightly to prevent awkward line breaks while maintaining a clear hierarchy. Line heights are generous across all levels to improve readability for elderly users or those with visual impairments.

---

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is contained within a maximum width of 1200px on desktop to ensure line lengths remain readable, but background elements and navigation headers stretch to fill the screen.

- **Rhythm:** An 8px base grid ensures consistent vertical and horizontal rhythm.
- **Grid:** A 12-column system is used for desktop (24px gutters), collapsing to 1 column for mobile (16px margins).
- **Reflow:** On tablet/mobile, secondary dashboard sidebars transform into bottom navigation or off-canvas drawers to maximize the active workspace for clinical charts.

### Mobile Bottom Navigation Priority Order

When the sidebar collapses to bottom navigation, tabs follow this priority sequence:

1. **Home / Dashboard** — appointments, upcoming sessions
2. **Consult** — active or scheduled video call entry point
3. **Records** — patient history, lab results, prescriptions
4. **Chat** — messaging with doctor between sessions
5. **Profile** — account, settings, notifications

During an active video call, the bottom navigation is replaced by the call controls bar (see Video Call Components).

### Medical Form Tap Targets

All interactive form elements in patient-facing flows must have a minimum touch target of **48×48px** (the `tap-target-min` spacing token), even if the visual element appears smaller. This ensures usability for elderly patients and those filling out forms during physical discomfort.

---

## Dark Mode

Dark mode is required for nighttime teleconsult sessions — a common scenario for working patients consulting from home after hours.

### Dark Mode Tokens

| Light token | Dark equivalent | Notes |
|---|---|---|
| `surface` `#f7faf9` | `dark-surface` `#0e1a18` | Deep teal-black, not pure black |
| `surface-container` `#ebeeed` | `dark-surface-container` `#1a2724` | Card backgrounds |
| `on-surface` `#181c1c` | `dark-on-surface` `#e0e3e2` | Body text |
| `on-surface-variant` `#3d4946` | `dark-on-surface-variant` `#bcc9c5` | Secondary text |
| `primary` `#006b5e` | `dark-primary` `#6bd9c5` | Buttons, links |
| `on-primary` `#ffffff` | `dark-on-primary` `#00352e` | Text on primary buttons |

### Dark Mode Rules

- Never use pure black (`#000000`) backgrounds — the deep teal-black (`#0e1a18`) maintains brand warmth while reducing glare.
- Primary buttons in dark mode use the inverse primary (`#6bd9c5`) with dark text (`#00352e`), not white. This preserves the required 4.5:1 contrast ratio.
- Status colors remain the same in both modes — they are calibrated for contrast on both light and dark surfaces.
- The video call interface always renders in dark mode regardless of system preference, since camera feeds read better against dark backdrops.

---

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Subtle Blend Modes**, mimicking the logo's internal depth.

- **Surface Layers:** The background uses the Neutral color, while primary containers use Surface White.
- **Shadows:** Avoid harsh black shadows. Use soft, diffused shadows with a primary-color tint (e.g., `#31a795` at 8% opacity) to create a "lifted" effect that feels organic.
- **Interaction Depth:** Elements like cards or buttons use a slight inner glow or an overlay blend mode when hovered, suggesting they are "squishy" or tactile, reinforcing the brand's theme of comfort and relief.

---

## Shapes

The shape language is **Rounded**, echoing the organic, bird-like curves of the logo.

- **Standard UI elements** (Buttons, Inputs) use a 0.5rem (8px) radius.
- **Large containers** (Cards, Modals) use a 1rem (16px) radius.
- **Iconography and Sparkles:** Elements should avoid sharp 90-degree angles, favoring smooth Bezier curves to maintain the brand's approachable and "safe" aesthetic.

---

## Accessibility

All components must meet **WCAG 2.1 AA** as a minimum. Healthcare interfaces are used under stress, in varied lighting, and by users with a wide range of visual abilities.

### Contrast Requirements

| Use case | Minimum ratio | Notes |
|---|---|---|
| Body text on surface | 4.5:1 | All `body-*` and `label-*` tokens |
| Large text (≥18px or ≥14px bold) | 3.0:1 | Headlines only |
| UI components & icons | 3.0:1 | Buttons, input borders, icons |
| Status indicators | 3.0:1 | Must always pair with a text label |

> ⚠ **Button gradient warning:** The light end of the primary button gradient (`#48cab6` on white) achieves approximately 2.9:1 contrast — below AA for body text. Use the deep primary (`#006b5e`) as the button background color, or ensure white text is only placed on gradient sections that exceed 4.5:1. Do not rely on the full gradient with white text.

### Focus States

Every interactive element must have a visible focus ring:

```css
:focus-visible {
  outline: 3px solid #006b5e;
  outline-offset: 2px;
  border-radius: inherit;
}
```

In dark mode, swap the focus ring color to `#6bd9c5`.

### ARIA Roles & Screen Reader Patterns

- Appointment status badges: use `role="status"` with an `aria-label` that includes the full state (e.g. `aria-label="Appointment confirmed"`).
- Live session indicators: use `aria-live="polite"` for "Doctor Online" pulse states so screen readers announce changes without interrupting the user.
- Video call controls: all icon-only buttons require a descriptive `aria-label` (e.g. "Mute microphone", "Turn off camera", "End call").
- Medical forms: every input must have an explicit `<label>` — no placeholder-only labeling.
- Error messages: associate errors with their input via `aria-describedby` and include `role="alert"` on the error container so they are announced immediately.

### Color-Blind Safety

Status colors are always paired with icons and text labels. The system must never communicate medical information through color alone:

- ✅ Confirmed — green badge + check icon + "Confirmed" label
- ⚠ Pending — amber badge + clock icon + "Pending" label
- ✗ Cancelled — red badge + x icon + "Cancelled" label

---

## Components

### Buttons

- **Primary buttons** use `#006b5e` as a solid background with white text — this replaces the full gradient to ensure WCAG AA contrast across the entire button surface. A subtle teal gradient overlay (`#006b5e` → `#31a795`) may be applied as a decorative layer at ≤15% opacity without affecting the text contrast calculation.
- **Secondary buttons** use a primary-colored outline with a light mint hover state.
- All buttons have a minimum height of 48px for touch accessibility.

### Cards

Cards should be borderless with a soft, tinted shadow and a white background. Header sections within cards can use a subtle light-teal background (`#f0f9f8`) to separate metadata from content.

### Input Fields

Use a 1px border in `#ade1d9` that transitions to a 2px `#006b5e` border on focus. Include clear `<label>` elements and supportive helper text in Body-SM. The focus border change must be paired with the focus ring for keyboard users.

### Medical Intake Forms

Symptom checklists, intake questionnaires, and prescription forms follow these additional rules:

- **Checkbox and radio groups** use a minimum 48px hit area with 8px spacing between options. Labels sit to the right of the control, never below.
- **Date of birth picker** uses three separate selects (Day / Month / Year) rather than a calendar widget — faster to fill under stress and more accessible on small screens.
- **Read-only confirmed state** renders filled form values in `body-md` with `on-surface` color inside a `surface-container-low` background. A "Confirmed" badge appears top-right of the section.
- **Inline validation** triggers on blur, not on keystroke. Error messages appear below the field in `body-sm` using `status-error` color plus a warning icon, associated via `aria-describedby`.
- **Dosage and lab value fields** use the `medical-data` type token (JetBrains Mono, 16px/500) so digit widths are consistent.

### Chips & Badges

Used for status indicators (e.g. "Confirmed," "Completed"). These use highly desaturated versions of the status color for the background and high-contrast dark text. All badges include an icon prefix and a visible text label — never color alone.

### Lists

Medical records and patient lists use generous 16px padding between rows, with subtle horizontal separators in the neutral color to ensure high scanability.

### Skeleton Loaders

Telehealth screens rely on real-time data (lab results, prescription history, doctor availability). Skeleton loaders are required for all data-fetching states to maintain perceived performance on LTE and mobile networks common in Philippine usage.

- Skeleton shapes mirror the layout of the content they represent (a card skeleton matches card dimensions, a list skeleton shows 3–5 rows).
- Use `surface-container-high` (`#e6e9e8`) as the base color with a shimmer animation sweeping left-to-right at 1.4s.
- In dark mode, use `dark-surface-container-high` (`#243330`) as the base.
- Never show a spinner as the sole loading indicator for content that has a known structure.

### Telehealth Indicators

Specific components for "Live" status or "Doctor Online" should use the "Sparkle" icon from the logo as a small, animated pulse indicator. The pulse animation uses a CSS `scale` keyframe (1.0 → 1.25 → 1.0) at 2s intervals, wrapped in `@media (prefers-reduced-motion: no-preference)` so it respects accessibility settings.

---

## Video Call Components

The video call interface is the defining feature of a telehealth app. It always renders in dark mode regardless of system preference.

### Layout

The call screen uses a full-viewport layout with three layers:

1. **Primary feed** — the remote participant (doctor or patient) fills the entire viewport as a `background-size: cover` video element.
2. **Picture-in-picture (PiP)** — the local camera feed is pinned to the bottom-right corner at 160×120px on mobile, 200×150px on desktop. It has a 2px `video-pip-border` (`#31a795`) outline and `border-radius: lg`.
3. **Controls overlay** — a floating controls bar anchored to the bottom center of the screen.

### Controls Bar

The controls bar uses `video-controls-bg` (`rgba(14, 26, 24, 0.72)`) with `backdrop-filter: blur(12px)` and `border-radius: xl`. It contains:

| Control | Icon | Active state | Muted/Off state |
|---|---|---|---|
| Microphone | mic / mic-off | `on-primary` white | `video-muted-indicator` red background |
| Camera | video / video-off | `on-primary` white | `video-muted-indicator` red background |
| Speaker | volume / volume-off | `on-primary` white | `outline-variant` grey |
| Chat | message-circle | `on-primary` white | Badge on unread count |
| End call | phone-off | `error-container` red background | — always red |

All controls are icon-only with `aria-label` attributes. Minimum tap target: 56×56px (larger than standard, given the high-stress context of ending or muting a medical call).

### Connection Quality Indicator

Positioned top-right of the primary feed. Displays a 3-bar signal icon:

- **3 bars** — strong (`video-signal-strong` `#31a795`)
- **2 bars** — moderate (`video-signal-weak` `#e09b2d`) — with tooltip "Connection may affect video quality"
- **1 bar / 0 bars** — poor or lost (`video-signal-lost` `#c0392b`) — with `aria-live="assertive"` announcement "Connection lost, attempting to reconnect"

### Waiting Room State

Before the doctor joins, the patient sees:

- A centered avatar of the assigned doctor (64px circle) with their name and specialization in `headline-md`.
- An animated "Doctor is on their way" indicator using the Sparkle pulse component.
- Estimated wait time in `body-lg` using `text-primary`.
- A "Leave waiting room" secondary button — not an end-call button, to avoid accidental session cancellation.

### Post-Call Summary

After a session ends, a modal appears before navigating away:

- Consultation duration
- Doctor name and specialization
- Quick action buttons: "View prescription", "Book follow-up", "Download summary"
- A 1–5 star rating prompt (optional, dismissable)

---

## Loading & Skeleton States

| State | Pattern | Duration |
|---|---|---|
| Page / route transition | Full-page skeleton matching destination layout | Until first data load |
| Card data (appointments, records) | Card-shaped skeleton, shimmer at 1.4s | Until API response |
| Doctor availability | Skeleton rows in the doctor list, 3–5 items | Until real-time data |
| Lab results | Skeleton table rows | Until results load |
| Video call connecting | Pulsing `surface-container` overlay on video viewport | Until WebRTC connected |

Skeleton shimmer keyframe:

```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-container-high) 25%,
    var(--surface-container-highest) 50%,
    var(--surface-container-high) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
}
```

Always wrap skeleton animations in `@media (prefers-reduced-motion: no-preference)` — for users who opt out of motion, show a static `surface-container-high` placeholder without animation.
