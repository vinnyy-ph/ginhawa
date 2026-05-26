# Doctor Profiles Backend Design

## 1. Overview
The `doctors` backend module will manage doctor profiles. It serves two distinct purposes:
1. Allowing doctors to create, read, and update their own profiles (Self-Management).
2. Allowing patients to discover and view public doctor information (Discovery).

## 2. Architecture & Endpoints
The module will consist of a single `DoctorsController` and `DoctorsService`. 

### 2.1 Self-Management (For Doctors)
- `POST /doctors/profile`: Create a doctor profile linked to the authenticated user's ID.
- `GET /doctors/profile`: Retrieve the authenticated doctor's full profile.
- `PATCH /doctors/profile`: Update the authenticated doctor's profile.

### 2.2 Discovery (For Patients)
- `GET /doctors`: Retrieve a list of all doctors. Supports optional query parameters for filtering:
  - `search`: Matches against `fullName`.
  - `specialization`: Exact or partial match for `specialization`.
- `GET /doctors/:id`: Retrieve a specific doctor's profile by their profile ID.

## 3. Data Privacy & Stripping
To ensure sensitive data is not leaked to patients during discovery, a mapping function `toPublicDoctorProfile` will be used.

**Public Fields Kept:**
`id`, `fullName`, `professionalTitle`, `bio`, `specialization`, `profilePictureUrl`, `availabilitySummary`, `yearsOfExperience`, `languagesSpoken`, `consultationFocusAreas`, `consultationFee`.

**Private Fields Stripped:**
`userId`, `createdAt`, `updatedAt`, and any joined `User` model data (like email or passwordHash).

## 4. Error Handling & Validation
- **409 Conflict**: Returned if a doctor attempts to `POST /doctors/profile` but already has a profile.
- **404 Not Found**: Returned if a profile is not found for `GET /doctors/:id` or `GET /doctors/profile`.
- **Authentication**: All endpoints require a valid JWT token (using `JwtAuthGuard`).
- **Validation**: Input data for POST/PATCH will be validated using DTOs with `class-validator`.

## 5. Implementation Notes
- The database schema for `DoctorProfile` already exists in `schema.prisma`.
- The `doctors` module structure should mirror the existing `patients` module for consistency.
