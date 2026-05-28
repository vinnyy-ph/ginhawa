# Features Page Design: The Narrative Journey

## Purpose
To create a dedicated, standalone `/features` page for the Ginhawa telehealth application. This page replaces the anchor link on the landing page, providing the space needed to fully explain the platform's value proposition through a guided, step-by-step narrative.

## Aesthetic Direction
**Modern Corporate with a Tactile twist (Soft Flat)**, adhering strictly to `docs/DESIGN-v2.md`. The design will utilize:
- Generous whitespace and a fixed-fluid hybrid layout (max-width: 1200px).
- Soft, blurred gradient backgrounds (`primary-container`, `secondary-container`) to evoke calm and ease ("Ginhawa").
- **Plus Jakarta Sans** for welcoming, curved headlines.
- **Manrope** for highly legible body copy and labels.
- Soft, organic rounded shapes (no harsh 90-degree corners).

## Page Structure

### 1. Hero Section
*   **Layout:** Centered text block with ample top/bottom padding.
*   **Background:** `surface-white` with absolute-positioned, blurred decorative orbs using brand gradients.
*   **Content:**
    *   Eyebrow: "Why Ginhawa?" (using `primary` color, `label-md`).
    *   Headline: "Your journey to better health, simplified." (`display-lg`, Plus Jakarta Sans).
    *   Sub-headline: "From understanding your symptoms to getting your prescription, we make healthcare accessible from the comfort of your home." (`body-lg`, Manrope).

### 2. The Narrative Journey (Alternating Blocks)
A sequence of four sections. Each section alternates layout: Text Left / Graphic Right, then Text Right / Graphic Left.

*   **Common Section Styling:**
    *   Padding: `py-24`.
    *   Graphic Container: A soft, elevated card (`rounded-3xl`, `shadow-soft`, `bg-surface-container-lowest`) holding a stylized UI representation of the feature.

*   **Step 1: AI-Powered Symptom Matching**
    *   *Text:* Highlights the AI recommendation engine.
    *   *Graphic Concept:* A simplified UI mockup of the symptom input box and a "Recommended Specialist" badge.

*   **Step 2: Frictionless Scheduling**
    *   *Text:* Focuses on real-time availability and easy booking.
    *   *Graphic Concept:* A stylized calendar grid or a stack of available time slots.

*   **Step 3: Secure Video Consultations**
    *   *Text:* Emphasizes the reliability and security of the video platform.
    *   *Graphic Concept:* An abstract representation of the dark-mode video call interface (a dark card with a PiP box).

*   **Step 4: Digital Health Records**
    *   *Text:* Explains the secure storage of notes and e-prescriptions.
    *   *Graphic Concept:* A stylized medical document or prescription slip icon.

### 3. Call-to-Action (CTA) Section
*   **Layout:** Full-width block at the bottom of the page.
*   **Background:** Deep primary color (`bg-[#004d43]`) to provide strong contrast and visual closure. Text is `white` / `on-primary`.
*   **Content:**
    *   Headline: "Ready to experience Ginhawa?"
    *   Buttons:
        1. "Check My Symptoms" (Solid white button, primary text, links to `/recommendations`).
        2. "Browse Doctors" (Outline white button, links to `/doctors`).

## Technical Notes
*   Built as a Next.js App Router Server Component (no `'use client'` needed unless interactive elements are added).
*   Utilize existing `@/components/ui/fade-in` for scroll animations.
*   Ensure the page is fully responsive, breaking down from alternating rows to a single vertical stack on mobile devices (`flex-col-reverse` so the graphic appears above the text on small screens).