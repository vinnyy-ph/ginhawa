---
name: Ginhawa Design System
colors:
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
  primary: '#006b5e'
  on-primary: '#ffffff'
  primary-container: '#31a795'
  on-primary-container: '#00352e'
  inverse-primary: '#6bd9c5'
  secondary: '#006b5e'
  on-secondary: '#ffffff'
  secondary-container: '#78f4df'
  on-secondary-container: '#006f62'
  tertiary: '#356761'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d9f98'
  on-tertiary-container: '#003530'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
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
  background: '#f7faf9'
  on-background: '#181c1c'
  surface-variant: '#e0e3e2'
  leaf-shadow: '#86beb5'
  surface-white: '#ffffff'
  status-success: '#31a795'
  status-info: '#48cab6'
  text-primary: '#1a3a35'
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
---

## Brand & Style

The brand personality is defined by the Tagalog concept of *Ginhawa*—representing ease, relief, and the physical breath of wellness. This design system targets patients and healthcare providers in the Philippines, prioritizing a visual language that feels culturally resonant, approachable, and professionally reliable.

The chosen style is **Modern Corporate with a Tactile twist**. It utilizes a "Soft Flat" philosophy derived from the reference logo, employing multi-stop teal gradients and organic layering. The UI avoids the sterility of traditional medical software, instead using soft edges and vibrant, healthy greens to evoke a sense of tranquility and "freshness." It is designed to be highly accessible, ensuring clarity for users navigating healthcare under stress.

## Colors

The palette is rooted in a monochromatic teal/seafoam spectrum. 
- **Primary:** A deep, trustworthy teal (`#31a795`) used for main actions and brand identity.
- **Secondary:** A bright, energetic seafoam (`#48cab6`) for highlights and active states.
- **Tertiary:** A soft, desaturated mint (`#ade1d9`) used for secondary surfaces and background accents.
- **Neutral:** A very light, cool-tinted grey (`#f4f7f6`) that provides a cleaner, softer alternative to pure white, reducing eye strain for doctors during long shifts.

The default mode is **Light**, optimizing for legibility in various lighting conditions common in Philippine clinical settings.

## Typography

Typography balances warmth with technical precision. 
- **Plus Jakarta Sans** is used for headlines to provide a friendly, modern, and optimistic tone. Its soft curves mirror the organic nature of the logo.
- **Manrope** is used for body text and labels to ensure maximum legibility and a professional, systematic feel for medical data and patient records.

For mobile devices, headlines are scaled down slightly to prevent awkward line breaks while maintaining a clear hierarchy. Line heights are generous across all levels to improve readability for elderly users or those with visual impairments.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is contained within a maximum width of 1200px on desktop to ensure line lengths remain readable, but background elements and navigation headers stretch to fill the screen.

- **Rhythm:** An 8px base grid ensures consistent vertical and horizontal rhythm.
- **Grid:** A 12-column system is used for desktop (24px gutters), collapsing to 1 column for mobile (16px margins).
- **Reflow:** On tablet/mobile, secondary dashboard sidebars transform into bottom navigation or off-canvas drawers to maximize the active workspace for clinical charts.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Subtle Blend Modes**, mimicking the logo's internal depth.
- **Surface Layers:** The background uses the Neutral color, while primary containers use Surface White.
- **Shadows:** Avoid harsh black shadows. Use soft, diffused shadows with a primary-color tint (e.g., `#31a795` at 8% opacity) to create a "lifted" effect that feels organic.
- **Interaction Depth:** Elements like cards or buttons use a slight inner glow or an overlay blend mode when hovered, suggesting they are "squishy" or tactile, reinforcing the brand's theme of comfort and relief.

## Shapes

The shape language is **Rounded**, echoing the organic, bird-like curves of the logo. 
- **Standard UI elements** (Buttons, Inputs) use a 0.5rem (8px) radius.
- **Large containers** (Cards, Modals) use a 1rem (16px) radius.
- **Iconography and Sparkles:** Elements should avoid sharp 90-degree angles, favoring smooth Bezier curves to maintain the brand’s approachable and "safe" aesthetic.

## Components

- **Buttons:** Primary buttons use a linear gradient from `#48cab6` to `#31a795` with white text. They should have a subtle drop shadow to indicate interactability. Secondary buttons use a primary-colored outline with a light mint hover state.
- **Cards:** Cards should be borderless with a soft, tinted shadow and a white background. Header sections within cards can use a subtle light-teal background (`#f0f9f8`) to separate metadata from content.
- **Input Fields:** Use a 1px border in `#ade1d9` that transitions to a 2px `#31a795` border on focus. Include clear labels and supportive helper text in Body-SM.
- **Chips/Badges:** Used for status indicators (e.g., "Confirmed," "Completed"). These should use highly desaturated versions of the status color for the background and high-contrast dark text.
- **Lists:** Medical records and patient lists use generous 16px padding between rows, with subtle horizontal separators in the neutral color to ensure high scanability.
- **Telehealth Indicators:** Specific components for "Live" status or "Doctor Online" should use the "Sparkle" icon from the logo as a small, animated pulse indicator.