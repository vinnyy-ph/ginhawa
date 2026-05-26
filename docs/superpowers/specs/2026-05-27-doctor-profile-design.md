# Doctor Profile & Onboarding Design Spec

## 1. Goal
Implement a robust, error-free doctor profile creation flow that aligns with the project specs (`docs/SPECS.md`). This includes streamlining the authentication routes to exclusively use "signup" instead of "register", and breaking the onboarding process into a focused two-step flow.

## 2. Approach: Two-Step Onboarding
To keep the initial barrier to entry low while ensuring data completeness, the flow is divided into account creation and profile completion. Availability scheduling is deliberately deferred to the dashboard to reduce cognitive load during initial onboarding.

## 3. Frontend Routing & Navigation
*   **Terminology Cleanup:** All user-facing terminology and routes using "register" will be changed to "signup" or "Sign Up".
*   **Removed Routes:** The `/src/app/auth/register` directory will be deleted.
*   **Account Creation:** 
    *   Patients use `/src/app/signup/page.tsx`.
    *   Doctors use `/src/app/signup/doctor/page.tsx` to create an account with email and password.
*   **Profile Onboarding:** After successful account creation, doctors are redirected to `/src/app/onboarding/doctor/page.tsx`. This page hosts the profile form containing Name, Professional Title, Specialization, and Bio.
*   **Dashboard Handoff:** Upon submitting the onboarding form, the doctor is routed to `/src/app/dashboard/doctor/page.tsx`. 

## 4. Backend API & Data Flow
*   **Endpoint:** A dedicated `POST /api/doctors/profile` endpoint will be created in the NestJS backend to handle the profile form submission.
*   **Authentication & Security:** The endpoint requires a valid JWT. The `userId` is extracted from the JWT payload to securely associate the `DoctorProfile` with the user, preventing profile spoofing.
*   **Validation:** Strict validation will ensure `fullName`, `professionalTitle`, and `specialization` are provided.
*   **Response Payload:** A successful submission returns a `201 Created` status with the profile data. Crucially, the response will include a `profileComplete: true` flag (or similar status indicator) so the frontend dashboard knows the profile is created but availability slots are pending.

## 5. Post-Onboarding Availability
*   **Dashboard Nudge:** Because availability slots are deferred, the doctor's dashboard will use the status returned from the backend to prominently nudge the user to "Set your availability". 
*   **Discoverability Guardrail:** Doctors without configured availability slots will not be bookable by patients, satisfying the requirement that they must set up their schedule before going fully live.
