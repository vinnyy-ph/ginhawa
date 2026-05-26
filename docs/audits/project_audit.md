# 🏥 Ginhawa Telehealth App — Full Project Audit

> Audit performed against [SPECS.md](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/docs/SPECS.md)

---

## Executive Summary

| Category | Done | Partial | Missing | Total |
|---|:---:|:---:|:---:|:---:|
| **Database Schema** | 8/8 | 0 | 0 | 8 |
| **Backend API Modules** | 4/10 | 1 | 5 | 10 |
| **Frontend Pages** | 5/19 | 4 | 10 | 19 |
| **Core Feature Flows (Demo Script)** | 2/11 | 1 | 8 | 11 |

**Overall estimate: ~30% complete.** The foundation is solid (auth, profiles, schema, onboarding), but nearly all core transactional flows are missing. Additionally, there are significant architectural inconsistencies (dual auth systems, duplicate routes, dead links) that need cleanup.

---

## 1. Tech Stack Alignment

| Spec Requirement | Status | Actual |
|---|---|---|
| Next.js Frontend | ✅ | Next.js 16 with App Router |
| TypeScript (Frontend) | ✅ | TypeScript throughout |
| Tailwind CSS | ✅ | Tailwind v4 (CSS-first `@theme` config) |
| shadcn/ui or Radix UI | ✅ | Radix UI primitives + CVA components |
| NestJS Backend | ✅ | NestJS 11 |
| REST API | ✅ | REST endpoints |
| PostgreSQL + Prisma | ✅ | PostgreSQL 15 (Docker) + Prisma 7 with driver adapter |
| Docker | ⚠️ | Docker Compose for DB only — no app containerization |
| Socket.IO / Realtime | ❌ | Not installed or configured |
| Consultation Integration | ❌ | No Daily/Jitsi/Meet integration |

> [!TIP]
> The tech stack choices are solid and aligned with spec recommendations. The main gaps are realtime (Socket.IO) and consultation session integration.

---

## 2. Database Schema vs. Spec (§9)

The Prisma schema at [schema.prisma](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/prisma/schema.prisma) has **all 8 entities** defined with correct fields and relationships.

| Spec Entity | Schema Model | Alignment |
|---|---|---|
| User | ✅ `User` | ✅ All fields match. Enum `Role` (PATIENT/DOCTOR) |
| PatientProfile | ✅ `PatientProfile` | ✅ All required + optional fields present |
| DoctorProfile | ✅ `DoctorProfile` | ✅ All required + optional nice-to-have fields (yearsOfExperience, languages, fee, etc.) |
| AvailabilitySlot | ✅ `AvailabilitySlot` | ✅ SlotStatus enum (AVAILABLE/BLOCKED/BOOKED) |
| Appointment | ✅ `Appointment` | ✅ AppointmentStatus enum with all 5 statuses |
| MedicalRecord | ✅ `MedicalRecord` | ✅ Includes `chiefConcern` and `followUpAdvice` beyond spec minimum |
| Notification | ✅ `Notification` | ✅ All fields match |
| RecommendationLog | ✅ `RecommendationLog` | ✅ All fields match |

> [!NOTE]
> The database schema is **100% complete and well-aligned** with the spec. This is a strong foundation — the data layer is ready for all features.

---

## 3. Backend API Modules vs. Spec (§6)

### ✅ Fully Built

#### Auth Module — [auth/](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/src/auth)
Covers spec §6.1 (Authentication and Access)

| Endpoint | Spec Requirement | Status |
|---|---|---|
| `POST /auth/register` | Register with email, password, role | ✅ |
| `POST /auth/login` | Login with email + password, returns JWT | ✅ |
| JWT Guard | Protect role-specific routes | ✅ Global `APP_GUARD` |
| Roles Guard | Enforce role-based access | ✅ Global `APP_GUARD` |
| `@Public()` decorator | Bypass auth for public routes | ✅ |
| `@Roles()` decorator | Restrict by role | ✅ |
| Password hashing | bcrypt | ✅ |

> [!TIP]
> **Role guards ARE properly implemented** — `JwtAuthGuard` and `RolesGuard` are registered as global `APP_GUARD` providers. The `@Roles()` decorator is used on patient and doctor endpoints. The `@Public()` decorator bypasses auth for landing/login/register. This is well-aligned with spec §6.1 & §13.

#### Doctor Profile — [doctors/](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/src/doctors)
Covers spec §6.3 (Doctor Profile) + partial §6.4 (Doctor Discovery)

| Endpoint | Spec Requirement | Status |
|---|---|---|
| `POST /doctors/profile` | Create doctor profile | ✅ `@Roles('DOCTOR')` |
| `PATCH /doctors/profile` | Update doctor profile | ✅ `@Roles('DOCTOR')` |
| `GET /doctors/profile` | Get own profile | ✅ `@Roles('DOCTOR')` |
| `GET /doctors` | Browse doctor list (public) | ✅ With `?search=` and `?specialization=` params |
| `GET /doctors/:id` | View doctor detail | ✅ Returns `PublicDoctorProfile` (strips sensitive fields) |

#### Patient Profile — [patients/](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/src/patients)
Covers spec §6.2 (Patient Profile)

| Endpoint | Spec Requirement | Status |
|---|---|---|
| `POST /patients/profile` | Create patient profile | ✅ `@Roles('PATIENT')` |
| `PATCH /patients/profile` | Update patient profile | ✅ `@Roles('PATIENT')` |
| `GET /patients/profile` | Get own profile | ✅ `@Roles('PATIENT')` |

#### File Uploads — [uploads/](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/src/uploads)

| Endpoint | Status |
|---|---|
| `POST /uploads/profile-picture` | ✅ Multer (JPEG/PNG/WebP, 5MB max, UUID filenames) |

---

### ⚠️ Partially Built

#### Schedule Management — Spec §6.11
- ✅ No dedicated module — slot endpoints live in doctors controller
- ✅ Create available time blocks (`POST /doctors/availability`)
- ✅ View own slots (`GET /doctors/availability`)
- ✅ View doctor's slots publicly (`GET /doctors/:id/availability`)
- ❌ **No delete** slot endpoint
- ❌ **No update/edit** slot endpoint
- ❌ **No mark-as-blocked** endpoint
- ❌ No overlap prevention logic

---

### ❌ Completely Missing Backend Modules

| Spec Section | Feature | Missing Module | Priority |
|---|---|---|---|
| §6.6 | **Appointment Booking** | `AppointmentsModule` | 🔴 Critical |
| §6.10 | **Consultation Notes & Prescriptions** | `MedicalRecordsModule` | 🔴 Critical |
| §6.9 | **Medical Records/History** | Part of MedicalRecordsModule | 🔴 Critical |
| §6.7 | **Notifications** | `NotificationsModule` | 🟡 High |
| §6.5 | **AI Recommendation** | `RecommendationsModule` | 🟡 High |
| §6.8 | **Consultation Session** | `ConsultationsModule` | 🟡 High |

> [!CAUTION]
> **The appointment booking flow is the single most critical missing piece.** Without it, the core telehealth workflow (book → attend → record) cannot function. The Prisma schema is ready — the module just needs to be built.

---

## 4. Frontend Pages vs. Spec (§8)

> [!WARNING]
> **The frontend structure differs significantly from the spec's suggested routes.** Routes use `/dashboard` instead of `/patient/dashboard`, there are duplicate doctor dashboard routes, and many major pages are completely absent (not even stubs).

### ✅ Complete Pages

| Spec Route | Actual Route | Page | Notes |
|---|---|---|---|
| Landing page | `/` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/page.tsx) | Full marketing page with hero, features, testimonials, FAQ, CTA. Framer Motion animations. |
| Login | `/login` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/login/page.tsx) | Email/password form, NextAuth `signIn`, role-based redirect. Has dead link to `/forgot-password`. |
| Sign up (Patient) | `/signup` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/signup/page.tsx) | Patient registration → redirects to `/onboarding/1` |
| Sign up (Doctor) | `/signup/doctor` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/signup/doctor/page.tsx) | Doctor registration → redirects to `/doctor/dashboard` |
| Patient: Complete profile | `/onboarding/1` through `/onboarding/5` | 5 step pages | **Full 5-step onboarding**: personal info → body metrics → medical history → profile picture → review & submit |

### ⚠️ Partially Built / Problematic Pages

| Page | Route | Issues |
|---|---|---|
| Patient Dashboard | `/dashboard` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/dashboard/page.tsx) — Server-protected with `getServerSession`, but renders a placeholder "Your patient dashboard is coming soon" |
| Doctor Dashboard (Route 1) | `/doctor/dashboard` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/doctor/dashboard/page.tsx) — **No auth check**, just a Card saying "The full scheduling and consultation workflow is being built" |
| Doctor Dashboard (Route 2) | `/dashboard/doctor` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/dashboard/doctor/page.tsx) — **Duplicate route**, no auth guard, hardcoded `needsAvailability=true`, broken "Set Up Now" button |
| Doctor Onboarding | `/onboarding/doctor` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/onboarding/doctor/page.tsx) — **Rough stub**: uses `localStorage` for token (not NextAuth), hardcoded API URL, no validation, unstyled, doesn't match app design system |
| For Doctors Landing | `/for-doctors` | [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/for-doctors/page.tsx) — Polished marketing page for doctors (not in spec but nice to have) |

### ❌ Completely Missing Pages

| Spec Route (§8) | Expected Path | Feature |
|---|---|---|
| **Patient: Find Doctors** | `/doctors` or `/patient/doctors` | Browse, search, filter doctors |
| **Patient: Doctor Detail** | `/doctors/[id]` | View doctor profile, availability, book appointment |
| **Patient: Book Appointment** | `/book/[doctorId]` | Select slot, provide reason, confirm booking |
| **Patient: Appointments** | `/dashboard/appointments` | List appointments, reschedule/cancel |
| **Patient: Medical Records** | `/dashboard/records` | View consultation history, prescriptions |
| **Patient: AI Recommendation** | `/recommendations` | Symptom input, get matched doctors |
| **Patient: Notifications** | `/dashboard/notifications` | Notification center |
| **Patient: Consultation Room** | `/consultation/[id]` | Join consultation session |
| **Doctor: Schedule Management** | `/doctor/schedule` | Create/edit/block availability slots |
| **Doctor: Appointments** | `/doctor/appointments` | View booked appointments, patient context |
| **Doctor: Patient Records** | `/doctor/patients/[id]` | View patient history for consultation |
| **Doctor: Notes & Prescriptions** | `/doctor/notes/[appointmentId]` | Write consultation notes, prescriptions |
| **Doctor: Notifications** | `/doctor/notifications` | Notification center |
| **Doctor: Consultation Room** | `/doctor/consultation/[id]` | Join consultation session |

> [!CAUTION]
> **None of the core transactional pages exist.** There is no doctor discovery page, no booking page, no appointments list, no records view, no consultation room. These aren't stubs — they simply don't exist yet.

---

## 5. Frontend Components & Design System

### Components Inventory

| Category | Component | Status |
|---|---|---|
| **Auth** | `auth-card.tsx` — Centered card wrapper with logo | ✅ |
| **Layout** | `header.tsx` — Sticky nav with role-aware links | ✅ |
| | `hero-section.tsx` — Landing hero with stats | ✅ |
| | `features-section.tsx` — Feature cards grid | ✅ |
| | `showcase-section.tsx` — Split layout (has placeholder wireframe, not real screenshots) | ⚠️ |
| | `testimonials-section.tsx` — Hardcoded testimonials | ✅ |
| | `faq-section.tsx` — Radix Accordion FAQ | ✅ |
| | `cta-section.tsx` — Final CTA section | ✅ |
| | `footer.tsx` — 4-column footer (has dead `#` links, placeholder trust badge divs) | ⚠️ |
| **UI** | `button.tsx` — CVA with gradient default, 6 variants | ✅ |
| | `card.tsx` — Card compound component | ✅ |
| | `badge.tsx` — CVA badge with 6 variants | ✅ |
| | `accordion.tsx` — Radix wrapper | ✅ |
| | `fade-in.tsx` — Framer Motion scroll animation | ✅ |
| | `form-field.tsx` — Accessible form field with Radix Label | ✅ |
| | `password-input.tsx` — Show/hide toggle | ✅ |
| | `progress-indicator.tsx` — Step progress bar | ✅ |
| | `spinner.tsx` — Animated SVG spinner | ✅ |
| | `toast.tsx` — Success/error toast notification | ✅ |

### Design System
- **Fonts**: Plus Jakarta Sans (headings) + Manrope (body) via Google Fonts
- **Colors**: Material Design 3-inspired tokens, primary `#006b5e`, custom surface/status colors
- **CSS**: `@theme` block in [globals.css](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/globals.css) with custom properties
- **Quality**: The existing components are well-built with proper accessibility (aria attributes, Radix primitives)

---

## 6. Auth Architecture — Critical Inconsistency

> [!WARNING]
> **There are TWO competing auth systems in the codebase.** This is the most architecturally confusing issue in the project.

### System 1: NextAuth (Primary)
- `next-auth` IS installed and configured at [route.ts](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/api/auth/%5B...nextauth%5D/route.ts)
- Uses `CredentialsProvider` → calls `POST /auth/login` on backend
- Login page uses `signIn('credentials', ...)`
- Session includes `id`, `role`, `accessToken` (JWT from backend)
- Root layout wraps app in `<SessionProvider>`
- Patient dashboard checks `getServerSession()` for protection

### System 2: localStorage JWT (Legacy/Doctor)
- Doctor onboarding page uses `localStorage.getItem('token')` directly
- Doctor onboarding sends requests with a manually-constructed `Authorization` header
- Patient signup uses a different API path prefix (`/api/auth/register` vs `/auth/register`)

### Impact
- **Doctor flows bypass NextAuth entirely** — the doctor onboarding page will not work if the user signed up through the NextAuth flow
- **Inconsistent API paths**: Patient signup hits `/api/auth/register`, doctor signup hits `/auth/register`
- **Session vs localStorage**: Some pages check `getServerSession()`, others check `localStorage`
- **Recommendation**: Pick ONE auth system and commit to it. NextAuth is already the primary — remove all `localStorage` token references.

---

## 7. Core Feature Flows — Demo Script Coverage (§15)

| # | Demo Step | Backend | Frontend | Flow Status |
|---|---|:---:|:---:|---|
| 1 | Register a patient account | ✅ | ✅ | ✅ **Works** |
| 2 | Complete patient profile | ✅ | ✅ (5-step onboarding) | ✅ **Works** |
| 3 | Browse or search doctors | ✅ (API exists) | ❌ No page | ❌ **No UI** |
| 4 | Use symptom-based recommendation | ❌ | ❌ | ❌ **Not built** |
| 5 | Book appointment from available slot | ❌ | ❌ No page | ❌ **Not built** |
| 6 | Appointment visible for both patient & doctor | ❌ | ❌ | ❌ **Not built** |
| 7 | Join consultation session | ❌ | ❌ | ❌ **Not built** |
| 8 | Doctor writes notes/prescription | ❌ | ❌ | ❌ **Not built** |
| 9 | Patient views medical record/history | ❌ | ❌ | ❌ **Not built** |
| 10 | Reschedule or cancellation flow | ❌ | ❌ | ❌ **Not built** |
| 11 | Notifications + architecture explanation | ❌ | ❌ | ❌ **Not built** |

> [!IMPORTANT]
> **Only 2 of 11 demo steps are functional end-to-end.** Step 3 has a backend endpoint but no frontend page. The remaining 8 steps require both backend and frontend work.

---

## 8. Issues & Misalignments

### 🔴 Critical Issues

1. **No appointment module at all** — This is the central feature of a telehealth app. Without it, 6+ demo steps fail. The Prisma model exists but no backend module or frontend pages.

2. **No doctor discovery page** — The backend has `GET /doctors` with search/filter params, but there is no frontend page for patients to browse or search doctors. This is a spec §6.4 core requirement.

3. **Dual auth system conflict** — NextAuth and localStorage-based JWT coexist. Doctor onboarding uses localStorage tokens, patient flows use NextAuth. These two systems will clash if not unified.

4. **Users controller exposes passwordHash** — `GET /users` and `GET /users/:id` return the full User object including `passwordHash` with no role restriction. Security vulnerability per spec §13.

5. **Duplicate doctor dashboards** — Both `/doctor/dashboard` and `/dashboard/doctor` exist. Neither is functional. This creates confusion about the canonical route.

### 🟡 Moderate Issues

6. **Doctor onboarding is a rough stub** — [page.tsx](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/app/onboarding/doctor/page.tsx) uses `localStorage` for token, hardcoded API URL, no validation, unstyled. Completely inconsistent with the polished 5-step patient onboarding.

7. **Missing auth middleware** — No `middleware.ts` in the frontend. Routes like `/dashboard/doctor`, `/doctor/dashboard`, and all onboarding steps have no server-side auth protection. Only `/dashboard` checks `getServerSession()`.

8. **Dead links everywhere**:
   - `/forgot-password` (linked from login page — **does not exist**)
   - Footer links: About Us, Contact, Privacy Policy, AI Recommendations — all point to `#`
   - "Contact Support" CTA button points to `#`

9. **Onboarding data lost on refresh** — The [OnboardingContext](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/src/context/onboarding-context.tsx) stores all 5 steps of data in React state only. If the user refreshes mid-onboarding, all data is lost. Should persist to `sessionStorage`.

10. **Inconsistent API path prefixes** — Patient signup calls `/api/auth/register`, doctor signup calls `/auth/register`. The `apiRequest` helper prepends `NEXT_PUBLIC_API_URL`, but some calls use different base paths.

11. **CORS is wide open** — Backend `main.ts` calls `app.enableCors()` with no configuration (all origins). Must be restricted for production per spec §7.8.

12. **Empty directories** — `onboarding/role-selection/` and `onboarding/patient/` exist but contain no `page.tsx`. Suggest abandoned/planned features.

### 🟢 Minor Issues

13. **Profile picture stored on local filesystem** — `uploads/` directory via Multer. Won't work on ephemeral deploy platforms. Cloudinary integration is stubbed but throws an error.

14. **No loading skeletons** — Spec §7.7 recommends skeleton states. Only a basic spinner exists.

15. **Showcase section uses placeholder wireframe** — Gray div rectangles instead of real screenshots.

16. **Footer has placeholder trust badge divs** — Gray rectangles instead of real compliance/security badges.

17. **Empty scaffold files** — `create-auth.dto.ts`, `update-auth.dto.ts`, `auth.entity.ts`, `user.entity.ts` are all empty placeholder classes never used.

---

## 9. Unnecessary / Dead Code

| Item | Location | Issue |
|---|---|---|
| `NEXTAUTH_SECRET` in backend `.env` | [backend/.env](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/.env) | Backend doesn't use NextAuth — these env vars belong in frontend only |
| `app.controller.ts` + `app.service.ts` | [backend/src/](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/src/app.controller.ts) | Default NestJS "Hello World" boilerplate |
| `app.controller.spec.ts` | [backend/src/](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/backend/src/app.controller.spec.ts) | Test for boilerplate controller |
| Empty DTOs/Entities | `create-auth.dto.ts`, `update-auth.dto.ts`, `auth.entity.ts`, `user.entity.ts` | Empty classes, never used |
| `CLAUDE.md` | [frontend/CLAUDE.md](file:///home/vincentdev/vincent-projects/launchpad/telehealth-app/frontend/CLAUDE.md) | Contains only `# frontend` |
| Duplicate dashboard route | `/dashboard/doctor` | Conflicts with `/doctor/dashboard`, neither works |
| Empty directories | `onboarding/role-selection/`, `onboarding/patient/` | No page files, abandoned |

---

## 10. What's Working Well ✅

1. **Complete database schema** — All 8 entities with proper relationships, enums, and indexes
2. **Proper auth architecture (backend)** — Global JWT + Roles guards, `@Public()` decorator, bcrypt hashing
3. **Polished patient onboarding** — 5-step flow with progress indicator, unit toggles, file upload, review page
4. **Good component library** — Accessible Radix primitives, CVA variants, Framer Motion animations
5. **Design system** — Consistent Material Design 3-inspired tokens, serif+sans font pairing
6. **Landing page and marketing** — Professional healthcare look, feature cards, testimonials, FAQ, doctor-specific page
7. **Backend API for doctor discovery** — Search by name, filter by specialization, public profile stripping
8. **Clean project structure** — Monorepo with `concurrently`, Docker Compose for DB, TypeScript configs

---

## 11. Priority Roadmap to Spec Completion

### 🔴 Phase 1 — Must-Have Core (Unblocks 8 demo steps)

| Priority | Task | Backend | Frontend |
|---|---|---|---|
| **P0** | **Unify auth system** | — | Remove all `localStorage` token usage, use NextAuth everywhere, add `middleware.ts` for route protection |
| **P0** | **Appointments Module** | Create `POST/GET/PATCH /appointments` with booking rules, slot validation, status management | Build appointments list page for both patient & doctor |
| **P0** | **Doctor Discovery Page** | — (API exists) | Build `/doctors` browse/search page + `/doctors/[id]` detail page with booking trigger |
| **P1** | **Medical Records Module** | Create `POST/GET /medical-records` (doctor creates, patient reads) | Build doctor notes form + patient records page |
| **P1** | **Doctor Onboarding Rewrite** | — | Rewrite to match patient onboarding quality, use NextAuth session |
| **P1** | **Remove duplicate dashboard** | — | Pick canonical routes, delete duplicates, build real dashboard content |

### 🟡 Phase 2 — Required Polish

| Priority | Task | Backend | Frontend |
|---|---|---|---|
| **P2** | Notifications Module | Create `POST/GET/PATCH /notifications` + event triggers | Build notification center + toast integration |
| **P2** | AI Recommendations | Create `POST /recommendations` (keyword→specialization mapping) | Build symptom input + results page |
| **P2** | Consultation Session | Add consultation link to appointments | Build consultation room page with "Join" button |
| **P2** | Schedule Management | Add delete/update/block slot endpoints + overlap prevention | Build full schedule management UI |
| **P2** | Reschedule/Cancel | Appointment status transition endpoints | Add action buttons to appointment cards |

### 🟢 Phase 3 — Bonus Differentiators

| Priority | Task |
|---|---|
| **P3** | AI triage with LLM integration |
| **P3** | Doctor "best match" score explanation |
| **P3** | Post-consultation care summary |
| **P3** | Loading skeletons & empty states |
| **P3** | Fix dead links (forgot-password, about, contact, privacy) |
| **P3** | Persist onboarding data to sessionStorage |
| **P3** | Restrict CORS to specific origins |
| **P3** | Cleanup dead code |

---

## 12. Final Verdict

> [!IMPORTANT]
> **You are on the right path architecturally**, but you're roughly **30% done**. The foundation (schema, auth backend, profiles, onboarding, design system) is solid and well-built. However:
>
> 1. **The entire transactional core is missing** — booking, appointments, records, prescriptions, notifications, consultations. These are what make it a telehealth app rather than a doctor directory with login.
>
> 2. **The frontend has architectural debt** — dual auth systems, duplicate routes, inconsistent API paths, missing auth middleware. This should be cleaned up **before** building new features to avoid compounding the inconsistencies.
>
> 3. **The most urgent action** is: unify auth → build Appointments Module → build Doctor Discovery page → build Appointments list page. This sequence would unlock 5+ demo steps and make the app demonstrably functional.
