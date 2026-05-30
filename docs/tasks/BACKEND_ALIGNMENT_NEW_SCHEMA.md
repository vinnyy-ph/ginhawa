Backend Alignment with New Schema — Task Handoff

Context

Branch database/schema-redesign (in /home/vincentdev/vincent-projects/launchpad/telehealth-app) just landed 12 phases of Prisma schema improvements for the Ginhawa telehealth app (NestJS backend + Next.js frontend + PostgreSQL). 14 commits, 16 migrations, 55/55 backend tests passing, builds clean. Nothing pushed yet.

The schema changes were purely additive and non-breaking — no columns/models dropped, no renames, all new fields optional or defaulted, only enum values added. Existing code still compiles and runs. But most new schema capabilities are not yet wired into backend functionality. Your job: audit what the schema now supports vs. what the backend actually does, then align/build the gaps.

Plan doc: docs/superpowers/plans/2026-05-29-schema-improvements.md. Spec: docs/tasks/SCHEMA_IMPROVEMENTS.md.

What changed in the schema (and what code already uses it)

Area: PatientProfile
New schema: phoneNumber, address, city, region, philhealthId, hmoProvider, hmoCardNo
Backend wiring status: DTO accepts them; no endpoint/UI logic uses them
────────────────────────────────────────
Area: DoctorProfile
New schema: prcLicenseNo, prcLicenseExpiry, ptrNo, region, city, isVerified, isActive, verifiedAt
Backend wiring status: DTOs accept them; searchAll filters isActive:true, isVerified:true. No verify/activate admin
  endpoint exists. No region/city search filter.
────────────────────────────────────────
Area: Appointment
New schema: cancelledAt, cancelReason, rescheduledFromId + self-relation rescheduledFrom/rescheduledTo
Backend wiring status: Cancel sets cancelledAt/cancelReason. Reschedule flow does NOT set rescheduledFromId — no reschedule
  endpoint links old→new appointment.
────────────────────────────────────────
Area: NotificationType enum
New schema: 9 values
Backend wiring status: Fully wired across notifications/appointments/medical-records services. ✓ Done.
────────────────────────────────────────
Area: Specialization + DoctorSpecialization (junction)
New schema: new models, 15 seeded
Backend wiring status: searchAll filters via junction. Data migrated. Doctor onboarding still writes only free-text
  specialization (now @deprecated) — does NOT create junction rows. AI recommendation service still queries old field.
────────────────────────────────────────
Area: Payment + PaymentStatus
New schema: new model
Backend wiring status: Auto-created PAID/WAIVED inside booking transaction. ✓. No endpoint to read/display payment on
  appointment detail.
────────────────────────────────────────
Area: Review
New schema: new model
Backend wiring status: Zero backend code — no create-review endpoint, no avg-rating aggregation, no ?sortBy=rating in
  discovery, no isVisible filtering.
────────────────────────────────────────
Area: PatientMedicalHistory (structured arrays)
New schema: new model
Backend wiring status: Auto-created empty on patient register. No update endpoint. AI recommendation service does NOT read

  allergies/chronicConditions/currentMedications.
────────────────────────────────────────
Area: languagesSpoken
New schema: String → String[]
Backend wiring status: DTOs + frontend + seed converted. ✓. Verify discovery { has: lang } filter works.
────────────────────────────────────────
Area: Prescription
New schema: new structured model
Backend wiring status: Zero backend code — medical records still write prescription String? blob only.
────────────────────────────────────────
Area: MedicalRecord.followUpAppointmentId
New schema: self-relation to Appointment
Backend wiring status: Zero backend code — followUpAdvice still text only, no link to booked follow-up.

Your tasks

1. Audit pass — go module by module                                                                                       (backend/src/{patients,doctors,appointments,meecommendations}). For each new schema elementabove, confirm actual wiring status (table above is my best read — verify against code). Produce a gap list.
2. Align existing functionality — anywhere current code reads/writes an old field that now has a structured replacement:
  - AI recommendation service (recommendations.service.ts): switch specialization matching to the Specialization/DoctorSpecialization junction; incorporate PatientMedicalHistory arrays.
  - Doctor onboarding/create (doctors.service.ts): write junction rows alongside (not instead of) the deprecated specialization string.
  - Reschedule flow: set rescheduledFromId + transition old appointment to RESCHEDULED.
3. Build missing functionality the schema now enables (scope with the user before building — prioritize): Review CRUD + rating aggregation + discovery sort, PatientMedicalHistory update endpoint, structured Prescription endpoints, doctor     verification admin endpoint, payment read on ament linking.
                                                                                                                          Rules & gotchas (read before touching anything

- Project CLAUDE.md is strict: simplicity first, surgical changes, YAGNI, minimum code, match existing patterns. Read it.
- Prisma 7 needs a driver adapter — bare new PrismaClient() fails. Use the PrismaPg + Pool setup (see prisma/seed.ts or scripts/migrate-specializations.ts).
- Harness gates destructive DB ops — prisma migrate reset and bulk data UPDATEs are blocked by the auto-mode classifier;  ask the user to run them via ! <cmd>.
- migrate dev goes interactive when a change triggers a data-loss/unique warning. For those, generate SQL with npx prisma migrate diff --from-config-datasource prisma.config.ts --to-schema prisma/schema.prisma --script, write it to a migration dir, apply via migrate deploy.
- Run from backend/ (cwd drifts after repo-root git commands — re-cd).
- Tests: npm test (Jest, mocked Prisma). Currently 55/55. Keep green. TDD for new logic.
- specialization String on DoctorProfile is @dmove; write both during transition.
- Seed sets doctors isVerified:true + junction links so discovery returns them — preserve if you touch seed.

Start by

Use brainstorming skill if building new features. First deliverable: the audit gap list + a prioritized plan, confirmed with the user before coding.