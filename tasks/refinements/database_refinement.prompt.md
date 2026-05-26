# Task: Sync schema.prisma to Match SPECS.md Exactly

## Objective
Update `schema.prisma` to be a strict 1:1 replica of the database entities defined
in `SPECS.md` (Section 9: Suggested Database Entities). No additions. No omissions.
No deviations from what the specs explicitly define.

---

## Context: What I Already Know

A cross-check between the current `schema.prisma` and `SPECS.md` revealed the
following issues:

### ❌ Remove These (Exist in Schema, NOT in Specs)
1. `ADMIN` value in the `Role` enum — specs only define `patient` and `doctor`.
   Admin panels are explicitly listed as out of scope in Section 5.2.
2. `updatedAt` field on `MedicalRecord` — Section 9.6 lists only `created_at`, no
   `updated_at`.

### ❌ Add These (In Specs, MISSING from Schema)
1. `follow_up_advice` field on `MedicalRecord` — Section 6.10 lists it as a required
   field under "Consultation Notes and Prescriptions".
2. `professional_title` on `DoctorProfile` — Section 6.3 lists it as a required field.
3. Optional nice-to-have fields on `DoctorProfile` per Section 6.3:
   - `years_of_experience`
   - `languages_spoken`
   - `consultation_focus_areas`
   - `consultation_fee`

### ⚠️ Rename This (Naming Inconsistency)
- `User.password` → should be `password_hash` per Section 9.1's explicit naming,
  which communicates that the field stores a hashed value, not plain text.

---

## Rules and Constraints
- Do NOT add any fields, models, enums, or relations that are not explicitly listed
  in SPECS-2.md Section 9.
- Do NOT remove any fields that ARE listed in SPECS-2.md Section 9.
- Do NOT change field types, optionality, or default values unless the specs
  explicitly require it.
- Preserve all existing Prisma-specific best practices that are spec-neutral:
  indexes (`@@index`), `@map` column naming, `onDelete` behaviors, and `@unique`
  constraints — these are implementation details not defined by specs and should stay.
- Keep the `@@map` table names as-is (e.g., `@@map("users")`) since they are
  infrastructure-level, not spec-level.

---

## Deliverable
Return the complete, updated `schema.prisma` file with all changes applied.
Annotate each change with a short inline comment explaining what spec section
justified the change (e.g., `// Section 9.1`, `// Section 6.10`).