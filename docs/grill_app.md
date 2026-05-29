# Progress Tracker

Scope: **everything except legal** (Privacy/Terms legal pages are out, per decision 2026-05-30). Status updated after each completion. `[x]` done · `[ ]` todo · `[—]` out of scope.

## Showstoppers
- [x] **S1** Onboarding state persistence (sessionStorage) — `f5dc719`
- [x] **S2** PRC license saved (no verification, MVP) — `b3a0265`
- [x] **S3** Show ratings (stars + count) on DoctorCard + DoctorAbout — `ac8e9d4`
- [x] **S4** Patient not ejected on transient call drop (reconnecting + manual return) — `6fb0948`
- [x] **S5** Camera/mic permission error UX + retry (consultation join) — `a59956d`
- [x] **S6** AI-prescription verify gate + publish confirm + amend path + field labels aligned — `d831c55`, `579bbbd`
- [—] **S7** Privacy/Terms links + legal pages — OUT (legal). Trust-badge placeholders folded into V6.
- [x] **S8** All times pinned to Asia/Manila — `0f1eebf`

## Patient UX
- [ ] **P1** Onboarding "skip for now" → reach booking with name/DOB/contact, defer clinical intake
- [x] **P2** Disabled-button reasons + profile photo made optional — `b5846db`
- [x] **P3** Confirm-booking copy + redirect (pre-session) — accurate "request" copy shipped
- [x] **P4** Prescription rendered as clean medication list (structured `prescriptions[]`, no error-red) — `34062a8`
- [x] **P5** Join surfaces (30s poll + "Join opens at" hint) — `3a0c73b`
- [x] **P6** Symptom check authenticated + persisted — `91fab73`
- [ ] **P7** DOB picker: year/decade jump + 44px touch targets
- [ ] **P8** Patient mobile bottom-nav

## Doctor UX
- [x] **D1** Dashboard launchpad: clickable stats (deep-linked), actionable today schedule, Join in rows — `5dfca75`
- [x] **D2** Dashboard load-fail → error + Retry (not false empty) — `615c5ec`
- [x] **D3** Gate Complete & Document until slot ends (no overlap with Join) — `1b3acf5`
- [x] **D4** Confirm/cancel success banner on doctor appointments — `1b3acf5`
- [ ] **D5** Decline-with-reason (distinct from Cancel)
- [ ] **D6** Mobile Notifications reachable + doctor mobile top header
- [x] **D7** Identity papercuts: clean greeting (no "Dr. Dr."), dropped raw-UUID patient id — `44f3de6`

## Appearance, design & a11y
- [ ] **V1** Design tokens: gradient + warning token; route the ~17 hardcoded `#48cab6/#31a795` files through them
- [ ] **V2** One `<Alert variant="error|success">` (kill the two different reds)
- [ ] **V3** Wordmark font consistency across the login boundary
- [ ] **V4** Truncation tooltips (review-id-card name/credentials; doctor-card languages, touch-accessible)
- [ ] **V5** De-dupe double specialization render (`doctors/[id]`)
- [ ] **V6** Footer indentation + header-style consistency + fill the empty trust-badge placeholders
- [ ] **V7** `prefers-reduced-motion` / `motion-reduce` (esp. emergency Call-911 bounce+pulse)
- [ ] **V8** a11y: real `<button>`s (cards/notification rows), focus rings, skip-to-content, 44px touch targets
- [ ] **V9** De-dup: shared relative-time formatter, `/features` CTA → `<CTASection/>`, photo-capture/dead `ProfilePhotoField`, `DashboardLayout` role-prop dead code

---

# Original review (reference)

I used this telehealth app as a patient and as a doctor. Here's where it lost me.

I verified every "critical" below against actual code before writing it. None of these are guesses.

---
🔴 The 8 showstoppers (I'd abandon, or these are dangerous)

1. The app forgets everything you typed. Both patient and doctor onboarding store all state in a single React useState with zero persistence (onboarding-context.tsx:16, doctor-onboarding-context.tsx). Refresh, swipe-back, a phone call backgrounding the tab, a deep-link to step 3 — and name, DOB, weight, blood type, allergies, your whole medical history silently vanish, dropping you to a blank form. For a 58-year-old on a phone filling a medical intake, this is the single most damaging thing in the app. → Persist to sessionStorage on every update; rehydrate on mount.

2. Doctor "verification" is a lie. Step 2 tells the physician "Required for verification. Your PRC license confirms you are licensed to practice." I confirmed in backend/.../doctors.service.ts:31-42 that upsertProfile builds profileData that omits prcLicenseNo, prcLicenseExpiry, ptrNo, region, city — the columns exist in Prisma, but the values are thrown away. Then the backend unconditionally returns { profileComplete: true } and the UI shows a green "Profile completed!". A doctor leaves believing they're verified; nothing was stored to verify against. Patient-safety + liability + trust failure, all in one.

3. You promise reviews and board-certification, then show neither. The doctors hero says "Browse our trusted network of board-certified doctors, read patient reviews…" Your backend already computes avgRating and reviewCount and supports sortBy=rating (doctors.service.ts:135-159). I grepped DoctorCard.tsx and DoctorAbout.tsx: zero stars, ratings, review counts, or credentials are rendered anywhere. So patients pick the doctor they'll video-call about their health based on a self-written bio and a price. The data is sitting right there — wire it up or stop claiming it.

4. Patients get silently ejected from the video call. consultation/[appointmentId]/page.tsx:67-70: handleParticipantLeft does an immediate router.push('/appointments') on any participant-left event. A momentary doctor disconnect (constant on mobile/clinic networks) yanks the anxious patient out mid-sentence, no message, no idea if the call ended or glitched. → Only leave on the explicit call-ended app-message you already handle; on participant-left show "Doctor disconnected — reconnecting…".

5. No camera/mic permission UX at all. Same file: callFrame.join() fires with no .catch, no camera-error/error listeners, no pre-join check. A first-timer who hasn't granted permissions gets a black Daily iframe and no guidance — effectively unable to attend their appointment.

6. AI writes the prescription, and one click makes it permanent. doctor/finalize/[appointmentId]: opening a consult auto-fires runSummarize() which silently fills the Prescriptions and Clinical Notes textareas with AI output under one grey line ("Edit as needed"). There's no "AI-generated, verify before signing" gate, no attestation checkbox, and Publish has no confirmation — it POSTs the record + marks the appointment COMPLETED, and the record is then read-only forever with no amend path. A time-pressed doctor can publish a hallucinated dosage into a legal medical record by clicking once. Worse: the field labels don't even match where the text lands (doctorSummary→notes, patientSummary→recommendations).

7. Your Privacy Policy and Terms are dead text. footer.tsx:30-31: they're <span className="… cursor-not-allowed">, not links, pointing nowhere. Right below, the "trust badges" are two empty grey placeholder <div>s. On a product that collects PhilHealth IDs and medical histories, a user who clicks "Privacy Policy" to check how their data is handled hits a not-allowed cursor. That alone kills sign-ups, and it's a likely Data Privacy Act (RA 10173) compliance problem.

8. Appointment times are never pinned to a timezone. I grepped: zero timeZone: options anywhere, against 16 toLocaleTimeString('en-PH', …) calls. en-PH only sets formatting (AM/PM, month names) — the hour renders in the viewer's machine timezone. An OFW abroad booking for family, or anyone on a misconfigured clock, sees a consult time hours off from the real Manila slot. Timezone ambiguity is the #1 cause of missed telehealth appointments. → One shared formatter with timeZone: 'Asia/Manila' + a

---
🧍 Walking through it as a patient — where it's confusing or bad

- You make me do a 6-step clinical intake before I can do the one thing I came for. Signarding/1, and there's no "Skip for now" anywhere. I came scared about a symptom; you handme body metrics, PhilHealth/HMO numbers, blood type, and family history first. Many will bail. Let me reach booking with name/DOB/contact and defer the rest.
- "Why can't I press this button?" — everywhere. This pattern repeats across the whole app and it's the most common confusion trigger:
  - Reason-for-visit silently requires 5 chars; type "flu" → permanently greyed Confirm Booking with no hint (doctor-booking-panel.tsx:24,79).
  - Profile picture step is effectively required (Continue disabled until a file) but never says so, with no "optional"/"skip" (onboarding/5/page.tsx:54-65).
  - Weight and height are hard-required to continue, unexplained (onboarding/3).
  - Hero symptom box disabled until 10 chars, no hint (inline-recommendation-widget.tsx:

Rule for the whole app: never show a disabled primary button without an adjacent reason.
- "Confirm Booking" lies about being confirmed. The button says Confirm, but the appointhe toast says "your doctor will confirm shortly." Then a 1.5s timer yanks me to/appointments — if I'm scrolled down, I may never see the toast or learn it's pending. Rename to "Request Appointment" and replace the timed redirect with a dwell-able confirmation card (doctor + date + time + "pending").                                                                                                                                                                                                 - My prescription looks like an error. records/page.tsx:143 renders it as free text in at icon) — the same red you use for Cancel and errors. For a second I thought something was wrong. And your API has structured prescriptions[] (drug/dosage/frequency/duration) that you never display. Render it as a clean medication list in neutral/teal.
- Joining is hidden. On the day of, the Join button is buried inside an accordion that's collapsed by default, wedged next to Cancel (appointment-card.tsx:169). It only appears 15 min before with no countdown and the list doesn't auto-refresh, so it may never appear without a manual reload. Surface Join on the collapsed card with a "Join opens at 2:45 PM" countdown.
- My symptom check vanishes and isn't even authenticated. The /recommendations POST sends no Authorization header (the history GET does), and the completed result is stored with a temp-${Date.now()} id and never added to "Your past symptom checks." Sensitive symptom text sent unauthenticated + appears to disappear = trust gap.                                                                                    - DOB entry is painful for the exact users you serve. The date picker is a tiny segmentelendar with no year/decade jump (date-picker.tsx, calendar.tsx). Reaching 1965 meanshundreds of taps; cells are 36px (under the 44px touch target).
- On mobile I have no real navigation. Logged-in patient header collapses to just a bell + an unlabeled avatar circle (no caret, no "Menu"). There's no bottom tab bar like the doctor side has. Everything — Appointments, Records, Profile — is hidden behind a dropdown a low-tech user won't disco

🩺 Walking through it as a doctor — where it's confusing or bad

- My dashboard is a poster, not a launchpad. The stat cards (Total / Pending / Confirmedan't click "3 pending" to see them. "Today's Schedule" rows have no Join button and nolink, and they mix in cancelled/completed appointments, so the list disagrees with the "Confirmed Today" stat right above it. First thing in the morning I have to mentally filter and then navigate away to act.
- Silent dashboard failure tells me I have no patients. If /appointments/doctor throws, the catch only console.errors and renders 0 pending / 0 confirmed / "No appointments today" (doctor-dashboard-client.tsx:42-46). On a flaky network I'd confidently believe my day is empty and miss real consults. Never render unloaded data as an authoritative empty state.
- Two competing primary actions during a live consult. The instant start-time passes, both Join Consultation and Complete & Document render on the same card (appointment-card.tsx:315). I could hit "Complete & Document" before the call even happens — which auto-runs AI summarize against an empty consult. Gate documentation until the slot ends.
- No success feedback when I confirm a booking. Confirming a request silently flips a badge (doctor/appointments/page.tsx), even though it notifies the patient. Your Schedule page does toast on every slot change — so it's inconsistent too. I'm left unsure the patient was told.
- I can't decline a request, only "Cancel" it (red). Refusing a pending request is indisa booked appointment, and the patient gets a generic cancellation. Triaging needs a real"Decline (with reason)."
- Notifications are unreachable on my phone. The mobile bottom nav is navItems.slice(0, 5) (dashboard-layout.tsx:128) and Notifications is the 6th item — so on mobile a doctor literally cannot reach new
booking requests. The doctor area also has no top header at all on mobile.
- Small clinical-data papercuts: the greeting can render "Welcome back, Dr. Dr. Reyes" or "Dr. jsmith" (email fallback); patient identity shows a truncated raw UUID ("Patient ID: 1a2b3c4d") instead of age/DOB/MRN; the PRC-expiry picker won't let me enter an already-expired license (it's a historical fact, not a future booking).

---
🎨 Appearance, layout & visual clarity — the part you specifically asked about

Honestly? The aesthetics are the strongest part of this project. The teal/Ginhawa system is calm and healthcare-appropriate, the serif+sans pairing reads as trustworthy, shadows and spacing are tasteful, and your empty/loading/error states (doctors discovery especially: SkeletonCard + EmptyState "Reset Search" + ErrorState "Try Again") are genuinely above average. The hero is excellent. So this section is
polish, not rescue.

Where the visual clarity does break down:

- Your design tokens are quietly bypassed. globals.css defines a real palette, but the signature CTA gradient from-[#48cab6] to-[#31a795] is hand-pasted as raw hex in button.tsx, header.tsx, toast.tsx, and three patient-home tiles — and #48cab6 isn't even a defined token. --color-primary is actually #004d43, much darker. So "the brand color" is ambiguous, and you end up with two slightly different greens in the same flow (the Button primary vs the bespoke Join/Publish green). Add gradient + warning tokens and route everything through them.
- Two different reds for errors. Some error banners use the error token (#ba1a1a), others use raw Tailwind bg-red-50/border-red-100 — sometimes right next to a token-based success banner (profile/page.tsx:205-213). It looks like two authors. Extract one <Alert variant="error|success">.
- The wordmark changes font across the login boundary — font-plus-jakarta on auth screens vs font-serif in the header (auth-card.tsx vs header.tsx:29). The brand name visibly re-typesets the moment you log in, right when the user is deciding to trust you.
- Truncation on the worst possible screens. The onboarding review card (review-id-card.tider" card hard-truncate the name/credentials with no tooltip — i.e. the screen whoseentire job is "verify this is correct" can clip the thing you're verifying. Doctor cards truncate languages to a mouse-only tooltip that's invisible on touch.
- Specialization renders twice in the doctor profile hero (doctors/[id]/page.tsx:142 and45) — looks like a bug, wastes your most valuable space.
- Footer is misindented and its two column headers use different styles (one uppercase tracking-wider sans, one font-serif).
- Motion has no brakes. Zero prefers-reduced-motion / motion-reduce anywhere — every page fades/slides in, skeletons pulse, the unread badge pulses forever, and the emergency state stacks animate-bounce + animate-pulse on the "Call 911" button. Continuous motion at a literally-emergency moment is a vestibular-accessibility problem.
- Accessibility gaps that hurt your exact audience: clickable <div>s instead of buttons on appointment cards and notification rows (no keyboard/aria-expanded/focus), FAQ accordion has no focus ring, no "skip to content" link in any shell, 10px EDIT/SAVE/CANCEL links well under touch targets.

---
🔁 The recurring rot (fix the pattern, not just the instance)

These three patterns generate most of the findings above:
1. Disabled buttons with no explanation → adopt a rule: every disabled CTA shows why.
2. Missing/optimistic feedback → no success confirmation on reschedule or doctor-confirmparallel requests with N refetch-storms on failure; generic "Something went wrong." thathides whether data was saved.                                                                                                                                                                               3. Copy-paste instead of shared components → relative-time formatter duplicated across bne variant drops the en-PH locale); the /features CTA is a verbatim re-implementation of<CTASection/>; three photo-capture UIs in onboarding plus a dead, never-imported ProfilePhotoField; DashboardLayout takes a role="patient" prop but hardcodes doctor nav (dead code that'll bite a future patient dashboard).

---
✅ Credit where it's due (so you know what to protect)                                                                                                                                                      
The hero + live symptom widget, the emergency short-circuit ("Do NOT book a consult, call 911"), the up-front medical disclaimer, the doctor Schedule page (weekly-template generator with live count, booked-slot protection, MAX_BULK_SLOTS guard, optimistic+revert), the patient-detail search with <mark> highlighting, graceful camera-capture fallbacks, consistent status→Badge mapping, secure-by-default login copy (no user enumeration), and the Logo namespacing its SVG gradient IDs with use real product care. Keep them.

---
📋 If I were prioritizing your fixes

P0 (do before anyone real touches this): persist onboarding state (#1) · save the PRC license + stop the false "verified"/"profile complete" (#2) · stop ejecting patients from the call (#4) · pin all times to Asia/Manila (#8) · ship + link real Privacy/Terms (#7).

P1: display ratings/credentials you already compute (#3) · AI-prescription verify gate + publish confirmation + amend path (#6) · camera/mic permission UX (#5) · structured prescription rendering · patient mobile bottom nav + doctor mobile Notifications · "Forgot password?" + distinguish outage-from-wrong-password on login · explain every disabled button.

P2: design-token cleanup (one green, one red, warning token) · prefers-reduced-motion · a11y (real buttons, focus rings, skip link, touch targets) · per-page <title> · success toasts for reschedule/confirm · de-dupe shared components.