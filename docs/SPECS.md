# Telehealth App Specifications

## 1. Product Summary

### 1.1 Product Name
Ginhawa

### 1.2 Product Type
Minimal Viable Product (MVP) telehealth web application built for desktop-first responsive use.[file:2][file:3]

### 1.3 Objective
Build a functional telehealth platform that allows patients to register, discover doctors, book consultations, receive recommendations based on symptoms, attend online consultations, and review basic medical records, while enabling doctors to manage schedules, conduct consultations, and issue notes or prescriptions.[file:2][file:3]

### 1.4 Why This Product
The product aims to reduce friction in accessing healthcare online by making the patient journey simple, guided, and trustworthy. It should also give doctors a clean workflow for schedule management, patient context review, and post-consultation documentation, which aligns with the builder round’s emphasis on user empathy, healthcare trust, and polished UX.[file:2]

---

## 2. Goals

### 2.1 Primary Goals
- Allow patients to create accounts and complete a usable health profile.[file:2][file:3]
- Allow patients to find relevant doctors through browsing, filters, and symptom-based recommendations.[file:2][file:3]
- Allow patients to book, reschedule, or cancel consultations based on doctor availability.[file:2][file:3]
- Allow both patients and doctors to join an online consultation session without building a custom video engine from scratch.[file:2][file:3]
- Allow doctors to manage schedules, review patient records, and write prescriptions or consultation notes.[file:2][file:3]

### 2.2 Success Criteria
- All required builder round features are implemented end to end for both core roles.[file:2][file:3]
- The app is complete enough to demonstrate a believable telehealth workflow from onboarding to consultation history.[file:2]
- The UX feels safe, clear, and healthcare-appropriate rather than just technically functional.[file:2]

---

## 3. Users and Roles

### 3.1 Patient
A patient is the end-user who creates an account, searches for doctors, books consultations, attends sessions, and reviews appointment history, records, and prescriptions.[file:2][file:3]

### 3.2 Doctor
A doctor is the medical professional who creates a profile, defines specialization and availability, reviews patient context, joins consultations, and writes consultation notes or prescriptions.[file:2][file:3]

---

## 4. Core User Stories

### 4.1 Patient Stories
- As a patient, I want to register with email and password so I can access the platform securely.[file:2][file:3]
- As a patient, I want to add my personal and basic medical information so doctors can better understand my context.[file:2][file:3]
- As a patient, I want to browse doctors and filter by specialization so I can find relevant care quickly.[file:2][file:3]
- As a patient, I want to describe my symptoms and get doctor recommendations so I do not need to guess which specialist to choose.[file:2][file:3]
- As a patient, I want to book, reschedule, or cancel an appointment so I can manage my consultation schedule.[file:2][file:3]
- As a patient, I want to receive appointment notifications so I do not miss sessions or updates.[file:2][file:3]
- As a patient, I want to join a consultation online and later view my consultation history and prescriptions.[file:2][file:3]

### 4.2 Doctor Stories
- As a doctor, I want to register and create a professional profile so patients can discover me.[file:2][file:3]
- As a doctor, I want to define my specialization and availability so only valid time slots can be booked.[file:2][file:3]
- As a doctor, I want to review a patient’s consultation history and records before or during an appointment.[file:2][file:3]
- As a doctor, I want to receive notifications for bookings and schedule changes so I can manage my day properly.[file:2][file:3]
- As a doctor, I want to join consultations and write notes or prescriptions after each session.[file:2][file:3]

---

## 5. Scope

### 5.1 In Scope
The MVP includes the required patient and doctor modules defined in the builder round: authentication, profile creation, doctor discovery, AI recommendation, appointment booking, schedule management, consultation joining, notifications, appointment history, and basic medical records or prescriptions.[file:2][file:3]

### 5.2 Out of Scope
- Full EMR/EHR compliance workflows
- Insurance claims processing
- Payment gateway integration
- Custom-built WebRTC video infrastructure
- Complex lab integrations
- Multi-clinic admin panels
- Native mobile apps

These are excluded to keep the build focused, complete, and realistic within the five-day challenge window, which explicitly favors a smaller polished solution over an unfinished ambitious one.[file:2]

---

## 6. Functional Requirements

### 6.1 Authentication and Access
#### Patient
- Register using email and password.[file:2][file:3]
- Log in and log out.
- Access only patient pages and records.

#### Doctor
- Register using email and password.[file:2][file:3]
- Log in and log out.
- Access only doctor-facing pages and patient records relevant to their consultations.

#### System Rules
- Email must be unique per account.
- Password must meet minimum validation rules.
- Role must be assigned at signup and control route access.

---

### 6.2 Patient Profile
Patients must be able to create and update a profile with the following fields, reflecting the required builder round details: name, birthday, weight, height, profile picture, contact details, and basic medical history.[file:2][file:3]

#### Required Fields
- Full name
- Birthdate
- Contact number or email
- Weight
- Height
- Basic medical history
- Profile picture upload

#### Notes
- Medical history can be stored as structured text for MVP simplicity.
- Empty profile states should guide the user to complete missing information.

---

### 6.3 Doctor Profile
Doctors must be able to create and maintain a professional profile containing discovery-facing information and practice details, including profile details, bio, and specialization as explicitly required.[file:2][file:3]

#### Required Fields
- Full name
- Professional title
- Specialization
- Short bio
- Profile picture
- Consultation availability

#### Optional Nice-to-Have
- Years of experience
- Languages spoken
- Consultation focus areas
- Consultation fee display, if you choose to simulate pricing

---

### 6.4 Doctor Discovery
Patients must be able to explore available doctors before booking, including browsing doctor availability, exploring based on symptoms or medical needs, and filtering or searching by specialization.[file:2][file:3]

#### Required Capabilities
- Browse a doctor list
- View doctor profile cards
- View available consultation slots
- Search by doctor name or specialization
- Filter by specialization
- Open a detail page or drawer for doctor details

#### Suggested UX
- Card list with specialization badge, next available slot, and CTA to view/book
- Empty state when no doctors match filters
- Quick symptom tags for guided exploration

---

### 6.5 AI Recommendation
Patients must be able to input symptoms or healthcare concerns and receive suggested doctors based on specialization or expertise, which is a required feature in the challenge brief.[file:2][file:3]

#### MVP Behavior
- Patient enters free-text symptoms.
- System analyzes keywords and maps them to one or more specializations.
- System returns recommended doctors sorted by specialization match and availability.

#### Recommended Implementation
For the MVP, use a rule-based or LLM-assisted recommendation layer:
- Rule-based fallback: map symptom keywords to specializations.
- Optional AI enhancement: use an LLM prompt to classify symptoms into likely specialties, then match against doctor records.

#### Guardrails
- Show a disclaimer that recommendations are supportive and not a medical diagnosis.
- Avoid giving treatment advice.
- Prompt urgent-care messaging for emergency-related symptom keywords.

---

### 6.6 Appointment Booking
Patients must be able to book consultations online and also reschedule or cancel them, which is a required core flow.[file:2][file:3]

#### Required Capabilities
- View doctor availability
- Select a valid time slot
- Create appointment
- Reschedule appointment
- Cancel appointment
- Prevent booking unavailable or conflicting slots

#### Booking Rules
- A slot can only belong to one appointment at a time.
- Cancelled slots return to available state, depending on timing rules.
- Rescheduling must revalidate target slot availability.
- Past time slots cannot be booked.

#### Appointment Statuses
- Pending
- Confirmed
- Cancelled
- Completed
- Rescheduled

---

### 6.7 Notifications
The brief requires real-time push notifications for booked appointments, upcoming appointments, and schedule updates for both patient and doctor workflows.[file:2][file:3]

#### MVP Interpretation
If full push delivery is too heavy for the timeline, implement in-app real-time notifications plus optional email simulation. The important part is that schedule-changing events are visible immediately and demonstrably.

#### Notification Triggers
- Appointment booked
- Appointment rescheduled
- Appointment cancelled
- Upcoming consultation reminder
- Doctor schedule updated

#### Suggested Delivery
- In-app notification center
- Toast notifications for immediate confirmation
- Optional email/log entry for demo purposes

---

### 6.8 Consultation Session
Both patients and doctors must be able to join a consultation session, and the brief explicitly states that a fully custom-built video conferencing solution is not required.[file:2][file:3]

#### MVP Implementation Options
- Embedded Google Meet or external meeting link
- Daily, Jitsi, Zoom, or similar third-party session link
- Mock consultation room with “Join Session” redirect

#### Required Elements
- Session page tied to appointment
- Join button enabled near appointment time
- Appointment metadata shown before joining
- Safe handling for users without a valid session link

---

### 6.9 Medical Records and History
Patients must be able to view appointment history and basic medical records or prescriptions, while doctors must be able to access patient consultation history and previously issued records or prescriptions.[file:2][file:3]

#### Patient Side
- View previous appointments
- View consultation summaries
- View prescriptions

#### Doctor Side
- View patient appointment history
- View previous notes
- View previous prescriptions

#### MVP Data Model
Records can be tied directly to completed appointments and displayed in a timeline or list.

---

### 6.10 Consultation Notes and Prescriptions
Doctors must be able to document findings, recommendations, prescriptions, and consultation summaries after an appointment.[file:2][file:3]

#### Required Fields
- Chief concern or reason for visit
- Consultation notes
- Recommendations
- Prescription text
- Follow-up advice

#### Rules
- Only doctors can create these entries.
- Patients can view but not edit doctor-issued records.
- Records should be timestamped and associated with doctor and appointment IDs.

---

### 6.11 Schedule Management
Doctors must be able to manage consultation schedules and restrict unavailable slots, which is a required doctor workflow.[file:2][file:3]

#### Required Capabilities
- Create available time blocks
- Mark certain slots unavailable
- View upcoming bookings
- Prevent overlaps with existing confirmed appointments

#### Suggested UX
- Calendar or slot manager
- Weekly recurring schedule plus manual exceptions
- Clear visual distinction between available, booked, and blocked slots

---

## 7. Non-Functional Requirements

### 7.1 Platform
The app must be web-only and desktop-oriented while still being responsive, which is part of the stated technical expectations.[file:2][file:3]

### 7.2 Frontend
A React or Next.js app using TypeScript is a strong fit because the challenge prefers strongly typed languages and permits UI libraries such as Shadcn or Radix.[file:2]

### 7.3 Backend
Use custom APIs for the main backend logic, with Node.js or NestJS as the likely stack, since the brief prefers custom backend logic and discourages using BaaS as the primary database layer.[file:2]

### 7.4 Database
Use a persistent database such as PostgreSQL, MySQL, or MongoDB, consistent with the allowed stacks.[file:2]

### 7.5 Code Quality
The codebase should be modular, documented, and include error handling, because these are explicit evaluation expectations for the technical track.[file:2]

### 7.6 Deployment
The app must be deployed to a public URL, and containerized deployment is preferred though not mandatory.[file:2]

### 7.7 Performance
- Main patient flows should load quickly on standard laptop connections.
- Doctor list filtering and schedule views should feel responsive.
- Basic skeleton states should cover loading delays.

### 7.8 Trust and Privacy
Even if full regulatory compliance is outside MVP scope, the app should still communicate healthcare trust through:
- Secure authentication
- Role-based access
- Clear privacy language
- Minimal exposure of sensitive medical data
- Confirmation before destructive actions like cancellation

---

## 8. Suggested Information Architecture

### 8.1 Public Routes
- Landing page
- Login
- Sign up
- Role selection

### 8.2 Patient Routes
- Patient dashboard
- Complete profile
- Find doctors
- AI recommendation
- Doctor details
- Book appointment
- Appointments
- Medical records
- Notifications
- Consultation room

### 8.3 Doctor Routes
- Doctor dashboard
- Complete profile
- Schedule management
- Appointments
- Patient records
- Consultation room
- Notes and prescriptions
- Notifications

---

## 9. Suggested Database Entities

### 9.1 User
- id
- email
- password_hash
- role (`patient` | `doctor`)
- created_at
- updated_at

### 9.2 PatientProfile
- id
- user_id
- full_name
- birthdate
- weight
- height
- profile_picture_url
- contact_details
- medical_history
- created_at
- updated_at

### 9.3 DoctorProfile
- id
- user_id
- full_name
- bio
- specialization
- profile_picture_url
- availability_summary
- created_at
- updated_at

### 9.4 AvailabilitySlot
- id
- doctor_id
- start_time
- end_time
- status (`available`, `blocked`, `booked`)
- created_at
- updated_at

### 9.5 Appointment
- id
- patient_id
- doctor_id
- slot_id
- status
- reason_for_visit
- consultation_link
- booked_at
- updated_at

### 9.6 MedicalRecord
- id
- appointment_id
- patient_id
- doctor_id
- notes
- prescription
- recommendations
- created_at

### 9.7 Notification
- id
- user_id
- type
- title
- message
- read_at
- created_at

### 9.8 RecommendationLog
- id
- patient_id
- symptom_input
- matched_specialization
- created_at

---

## 10. Recommended MVP Prioritization

### Phase 1: Must-Have Core
- Auth for patient and doctor
- Patient profile
- Doctor profile
- Doctor discovery
- Schedule management
- Booking flow
- Appointment list
- Consultation join link
- Doctor notes/prescriptions
- Patient medical record history

### Phase 2: Required Polish
- Reschedule and cancel flow
- Notification center
- Symptom-based recommendation
- Better validation and error states
- Responsive refinement

### Phase 3: Bonus Differentiators
- AI triage assistant with safer prompt handling
- Smart intake form before booking
- Doctor “best match” score explanation
- Post-consultation care summary
- Follow-up reminder workflow

This prioritization fits the challenge guidance that a smaller but complete solution is preferred over an ambitious unfinished one.[file:2]

---

## 11. UX Principles

### 11.1 Trust First
Healthcare UX should feel calm, clear, and reliable. Use clear labels, visible confirmations, and low-friction forms to support the brief’s emphasis on trust and user empathy.[file:2]

### 11.2 Reduce Decision Fatigue
Patients may not know which specialization to choose, so the recommendation flow should guide them rather than making them guess.[file:2][file:3]

### 11.3 Clarity Over Cleverness
Use familiar appointment, profile, and record patterns. Avoid novelty that makes core actions harder to understand.

### 11.4 Complete Key Journeys
It is better to have one excellent end-to-end flow than several half-working screens, which directly aligns with the challenge advice.[file:2]

---

## 12. Error States and Edge Cases

- Duplicate email on registration
- Missing required profile data
- No doctors found for a specialization
- No available slots for selected doctor
- Attempt to double-book a slot
- Cancelled or expired appointment join attempt
- Doctor tries to edit an appointment already completed
- Patient tries to access another patient’s records
- AI recommendation returns low confidence or no clear match

Each should have a friendly, human-readable message and a next-step CTA.

---

## 13. Security and Access Rules

- Only authenticated users can access role-specific dashboards.
- Patients can only access their own appointments and records.
- Doctors can only access records related to patients they consulted or are scheduled to consult.
- Prescription and notes creation is restricted to doctors.
- Passwords must be hashed.
- Sensitive fields should never be exposed in public doctor discovery views.

---

## 14. Suggested Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- NestJS or Express with TypeScript
- REST API

### Database
- PostgreSQL with Prisma ORM

### Realtime / Notifications
- Socket.IO or polling-based notification refresh

### Consultation Session
- Daily, Jitsi, or Google Meet link integration

### Deployment
- Vercel for frontend
- Render/Fly.io/Railway for backend + PostgreSQL
- Docker if you want cleaner deployment story

This stack fits the allowed technical expectations and keeps development practical within the builder round constraints.[file:2]

---

## 15. Demo Script Coverage

The final build should support this end-to-end demo:
1. Register a patient account.
2. Complete patient profile.
3. Browse or search doctors.
4. Use symptom-based recommendation.
5. Book an appointment from an available slot.
6. Show appointment appearing for both patient and doctor.
7. Join consultation session.
8. Doctor writes notes/prescription.
9. Patient views updated medical record/history.
10. Show reschedule or cancellation flow.
11. Show notifications and explain architecture choices.

This demo path maps closely to the required feature set and will help with the required walkthrough video and evaluation on functionality and product sense.[file:2][file:3]

---

## 16. Nice Product Angle

### Positioning
“Fast, guided online consultations for patients who are unsure where to start.”

### Differentiation
Instead of only being a booking app, the product’s differentiator is guided matching:
- Patients can start from symptoms, not specialization names.
- The app explains why a doctor is being recommended.
- The workflow is optimized for confidence and trust, especially for first-time telehealth users.

This is a good fit for the bonus-feature guidance asking how the app differentiates itself and improves long-term patient and doctor journeys.[file:2]

---

## 17. Definition of Done

The MVP is done when:
- All required patient and doctor features are implemented in a working prototype.[file:2][file:3]
- The app is deployed publicly.[file:2]
- The core consultation workflow is fully demonstrable end to end.
- The UI is responsive and polished enough to communicate healthcare trust.
- The architecture and tradeoffs are clear enough to explain during pair programming and the recorded walkthrough.[file:2]
