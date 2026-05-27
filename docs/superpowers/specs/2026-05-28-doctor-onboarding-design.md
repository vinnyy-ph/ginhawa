# Doctor Onboarding Redesign

## 1. Overview
The current doctor onboarding flow is a single-page form that only collects basic information (`fullName`, `professionalTitle`, `specialization`, `bio`). It lacks important fields supported by the backend, such as `profilePictureUrl`, `yearsOfExperience`, `languagesSpoken`, `consultationFee`, `consultationFocusAreas`, and `availabilitySummary`.

This design proposes a 4-step wizard for doctors to complete their profile, matching the polished experience of the patient onboarding.

## 2. Architecture

### 2.1 State Management
- Introduce `DoctorOnboardingProvider` inside `frontend/src/context/doctor-onboarding-context.tsx`.
- Type `DoctorOnboardingData` will define the shape containing all fields.

### 2.2 Routes
The current route `/onboarding/doctor` (which hosts the single form) will be replaced by:
- `/onboarding/doctor/layout.tsx` (Wraps the steps with the provider)
- `/onboarding/doctor/1` (Personal Info)
- `/onboarding/doctor/2` (Specialization & Experience)
- `/onboarding/doctor/3` (Practice Details)
- `/onboarding/doctor/4` (Review & Submit)

The root `/onboarding/doctor/page.tsx` will redirect to `/onboarding/doctor/1`.

## 3. Data Flow & Fields

### Step 1: Personal Info
- `fullName` (text, required)
- `professionalTitle` (text, required)
- `profilePictureUrl` (file upload using existing `/uploads/profile-picture` endpoint)

### Step 2: Specialization & Experience
- `specialization` (text, required)
- `yearsOfExperience` (number, optional)
- `languagesSpoken` (text, optional)

### Step 3: Practice Details
- `bio` (textarea, required)
- `consultationFocusAreas` (textarea, optional)
- `consultationFee` (number, optional)
- `availabilitySummary` (textarea, optional)

### Step 4: Review
Displays a read-only summary of the collected data.
On submission, calls `POST /doctors/profile` mapping the `DoctorOnboardingData` to `CreateDoctorProfileDto`.
If successful, redirects to `/doctor/dashboard`.

## 4. Testing & Error Handling
- Validate required fields before allowing progression to the next step.
- Handle file upload errors (size limit, file type) gracefully as done in patient onboarding.
- Handle network errors on final submission with a toast notification.
