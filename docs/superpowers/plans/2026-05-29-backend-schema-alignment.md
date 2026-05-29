# Backend Schema Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the additive schema improvements on `database/schema-redesign` into backend behavior — align existing services to structured replacements and build the selected schema-ready features.

**Architecture:** NestJS modules over Prisma 7 (driver-adapter PrismaService). Edit existing services/DTOs/controllers in place; add one new `reviews` module. No schema migration — every model/enum already exists. TDD with mocked-Prisma Jest specs; keep the suite green (currently 55/55).

**Tech Stack:** NestJS, Prisma 7 (PrismaPg adapter), class-validator, Jest (mocked Prisma).

**Working directory:** all commands run from `backend/`. Tests: `npm test`. Build check: `npm run build`.

**Notes carried from the design:**
- B7 doctor verification is **deferred to a script** — no endpoint in this plan.
- A1 is **medical-history context only**; `recommendations.service.ts` has no doctor query to switch to the junction.
- `?sortBy=rating` sorts in JS (Prisma cannot `orderBy` a computed relation aggregate).

---

## File Structure

- `src/recommendations/recommendations.service.ts` — modify: add `PatientMedicalHistory` to AI prompt context (Task 1).
- `src/doctors/doctors.service.ts` — modify: write `DoctorSpecialization` junction on profile upsert (Task 2); add rating aggregation (Task 8).
- `src/doctors/doctors.controller.ts` — modify: pass `sortBy`, expose `avgRating`/`reviewCount` (Task 8).
- `src/appointments/dto/reschedule-appointment.dto.ts` — create: reschedule body (Task 3).
- `src/appointments/appointments.service.ts` — modify: `reschedule()` (Task 3); add `payment` to includes (Task 7).
- `src/appointments/appointments.controller.ts` — modify: reschedule route (Task 3).
- `src/patients/dto/update-medical-history.dto.ts` — create (Task 4).
- `src/patients/patients.service.ts` — modify: `updateMedicalHistory()` (Task 4).
- `src/patients/patients.controller.ts` — modify: PATCH route (Task 4).
- `src/medical-records/dto/create-medical-record.dto.ts` — modify: structured prescriptions + follow-up link (Tasks 5, 6).
- `src/medical-records/medical-records.service.ts` — modify: create prescription rows + link follow-up (Tasks 5, 6).
- `src/reviews/` — create new module: controller, service, DTO, module, spec (Task 8).
- `src/app.module.ts` — modify: register `ReviewsModule` (Task 8).

Build order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

---

## Task 1: A1 — Recommendations medical-history context

**Files:**
- Modify: `src/recommendations/recommendations.service.ts`
- Test: `src/recommendations/recommendations.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add inside the existing top-level `describe('RecommendationsService', ...)` block in `recommendations.service.spec.ts`:

```typescript
  describe('buildPrompt medical history', () => {
    it('includes allergies, chronic conditions, and current medications when present', () => {
      const prompt = (service as any).buildPrompt('headache', {
        specializations: ['Neurology'],
        symptoms: ['dizzy'],
        medicalHistory: {
          allergies: ['penicillin'],
          chronicConditions: ['hypertension'],
          currentMedications: ['losartan'],
        },
      });
      expect(prompt).toContain('penicillin');
      expect(prompt).toContain('hypertension');
      expect(prompt).toContain('losartan');
    });

    it('omits the medical-history block when arrays are empty', () => {
      const prompt = (service as any).buildPrompt('headache', {
        specializations: [],
        symptoms: [],
        medicalHistory: { allergies: [], chronicConditions: [], currentMedications: [] },
      });
      expect(prompt).not.toContain('Allergies:');
    });
  });
```

If the spec file lacks a `PatientMedicalHistory` mock on `mockPrismaService`, add `patientMedicalHistory: { findUnique: jest.fn() }` to it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- recommendations.service`
Expected: FAIL — the `medicalHistory` block is not yet rendered (`Allergies:` / drug names absent).

- [ ] **Step 3: Implement**

In `recommendations.service.ts`, update the `patientContext` type everywhere it appears (`buildPrompt` param, `getAIRecommendationStream` param, and the local in `createStream`) to:

```typescript
patientContext?: {
  specializations: string[];
  symptoms: string[];
  medicalHistory?: {
    allergies: string[];
    chronicConditions: string[];
    currentMedications: string[];
  };
}
```

Replace the body of `buildPrompt` (lines ~43–63) with:

```typescript
  private buildPrompt(
    symptomInput: string,
    patientContext?: {
      specializations: string[];
      symptoms: string[];
      medicalHistory?: {
        allergies: string[];
        chronicConditions: string[];
        currentMedications: string[];
      };
    },
  ): string {
    const mh = patientContext?.medicalHistory;
    const hasHistory =
      !!mh &&
      (mh.allergies.length > 0 ||
        mh.chronicConditions.length > 0 ||
        mh.currentMedications.length > 0);
    const historyBlock = hasHistory
      ? `- Allergies: ${mh!.allergies.join(', ') || 'none'}
- Chronic conditions: ${mh!.chronicConditions.join(', ') || 'none'}
- Current medications: ${mh!.currentMedications.join(', ') || 'none'}
`
      : '';

    const contextBlock = patientContext
      ? `Patient context (use this to personalize your recommendation):
- Recent specializations consulted: ${patientContext.specializations.join(', ') || 'none'}
- Prior symptom history (brief): ${patientContext.symptoms.map((s) => s.slice(0, 100)).join(' | ') || 'none'}
${historyBlock}
`
      : '';

    return `You are a medical triage assistant. ${contextBlock}A patient describes their symptoms: "${symptomInput}".

Return ONLY valid JSON in this exact format, no markdown:
{ "specialization": "<name>", "explanation": "<2-3 sentence reasoning>" }

Specialization must be one of: Cardiology, Dermatology, Orthopedics, Neurology, Gastroenterology, Ophthalmology, Dentistry, Pediatrics, Gynecology, Psychiatry, General Practice, EMERGENCY.

Use EMERGENCY only if symptoms indicate life-threatening conditions (chest pain, stroke, difficulty breathing, heavy bleeding, unconscious, seizure, suicide, self-harm, poisoning).`;
  }
```

In `createStream`, inside the `if (patientId) { ... }` block (after `recentLogs`), fetch history and add it to `patientContext`:

```typescript
        const medHistory = await this.prisma.patientMedicalHistory.findUnique({
          where: { patientId },
        });
        patientContext = {
          specializations: recentLogs.map((l) => l.matchedSpecialization),
          symptoms: recentLogs.map((l) => l.symptomInput),
          medicalHistory: medHistory
            ? {
                allergies: medHistory.allergies,
                chronicConditions: medHistory.chronicConditions,
                currentMedications: medHistory.currentMedications,
              }
            : undefined,
        };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- recommendations.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/recommendations/recommendations.service.ts src/recommendations/recommendations.service.spec.ts
git commit -m "feat(recommendations): add patient medical history to AI prompt context"
```

---

## Task 2: A2 — Doctor specialization junction writes

**Files:**
- Modify: `src/doctors/doctors.service.ts`
- Test: `src/doctors/doctors.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `doctors.service.spec.ts`. Ensure `mockPrismaService` has `$transaction: jest.fn()` and a `mockTx` with `doctorProfile.upsert`, `specialization.upsert`, `doctorSpecialization.deleteMany`, `doctorSpecialization.upsert`. Pattern (adapt to the file's existing mock style):

```typescript
  describe('upsertProfile junction', () => {
    const mockTx = {
      doctorProfile: { upsert: jest.fn().mockResolvedValue({ id: 'doctor-1' }) },
      specialization: { upsert: jest.fn().mockResolvedValue({ id: 'spec-1', name: 'Cardiology' }) },
      doctorSpecialization: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    beforeEach(() => {
      (mockPrismaService.$transaction as jest.Mock).mockImplementation(async (cb) => cb(mockTx));
    });

    it('creates a primary DoctorSpecialization row from the specialization string', async () => {
      await service.upsertProfile('user-1', {
        fullName: 'Dr. A',
        professionalTitle: 'MD',
        specialization: 'Cardiology',
      } as any);

      expect(mockTx.specialization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'Cardiology' } }),
      );
      expect(mockTx.doctorSpecialization.deleteMany).toHaveBeenCalledWith({
        where: { doctorId: 'doctor-1', isPrimary: true },
      });
      expect(mockTx.doctorSpecialization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { doctorId: 'doctor-1', specializationId: 'spec-1', isPrimary: true },
        }),
      );
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- doctors.service`
Expected: FAIL — `specialization.upsert` not called (current `upsertProfile` writes only the profile).

- [ ] **Step 3: Implement**

In `doctors.service.ts`, replace `upsertProfile` (lines ~27–54) with a transactional version and add a private helper:

```typescript
  async upsertProfile(
    userId: string,
    dto: import('./dto/create-doctor-profile.dto').CreateDoctorProfileDto,
  ) {
    const profileData = {
      fullName: dto.fullName,
      professionalTitle: dto.professionalTitle,
      specialization: dto.specialization,
      bio: dto.bio,
      yearsOfExperience: dto.yearsOfExperience,
      consultationFee: dto.consultationFee,
      languagesSpoken: dto.languagesSpoken,
      consultationFocusAreas: dto.consultationFocusAreas,
      availabilitySummary: dto.availabilitySummary,
      profilePictureUrl: dto.profilePictureUrl,
    };

    const profile = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.doctorProfile.upsert({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      });
      await this.syncPrimarySpecialization(tx, saved.id, dto.specialization);
      return saved;
    });

    return {
      profileComplete: true,
      profile,
    };
  }

  private async syncPrimarySpecialization(
    tx: Prisma.TransactionClient,
    doctorId: string,
    name: string,
  ) {
    const spec = await tx.specialization.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await tx.doctorSpecialization.deleteMany({
      where: { doctorId, isPrimary: true },
    });
    await tx.doctorSpecialization.upsert({
      where: {
        doctorId_specializationId: { doctorId, specializationId: spec.id },
      },
      update: { isPrimary: true },
      create: { doctorId, specializationId: spec.id, isPrimary: true },
    });
  }
```

`Prisma` is already imported at the top of the file (`import { Prisma } from '@prisma/client';`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- doctors.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/doctors/doctors.service.ts src/doctors/doctors.service.spec.ts
git commit -m "feat(doctors): write DoctorSpecialization junction on profile upsert"
```

---

## Task 3: A3 — Reschedule endpoint

**Files:**
- Create: `src/appointments/dto/reschedule-appointment.dto.ts`
- Modify: `src/appointments/appointments.service.ts`, `src/appointments/appointments.controller.ts`
- Test: `src/appointments/appointments.service.spec.ts`

- [ ] **Step 1: Create the DTO**

`src/appointments/dto/reschedule-appointment.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsString()
  @IsNotEmpty()
  newSlotId: string;
}
```

- [ ] **Step 2: Write the failing test**

Add to `appointments.service.spec.ts`:

```typescript
  describe('reschedule', () => {
    const oldAppt = {
      id: 'appt-1',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      slotId: 'slot-old',
      status: AppointmentStatus.CONFIRMED,
      reasonForVisit: 'checkup',
      patient: { userId: 'user-patient-1' },
      doctor: { userId: 'user-doctor-1', consultationFee: 500 },
    };
    const newSlot = {
      id: 'slot-new',
      doctorId: 'doctor-1',
      status: SlotStatus.AVAILABLE,
      startTime: new Date(Date.now() + 86400000),
    };
    const rtx = {
      availabilitySlot: { findUnique: jest.fn(), update: jest.fn() },
      appointment: { update: jest.fn(), create: jest.fn() },
      payment: { create: jest.fn() },
    };

    beforeEach(() => {
      mockPrismaService.appointment.findUnique = jest.fn().mockResolvedValue(oldAppt);
      rtx.availabilitySlot.findUnique.mockResolvedValue(newSlot);
      rtx.appointment.create.mockResolvedValue({ id: 'appt-2', rescheduledFromId: 'appt-1' });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(rtx));
    });

    it('links the new appointment to the old and marks the old RESCHEDULED', async () => {
      const result = await service.reschedule('user-patient-1', 'PATIENT', 'appt-1', 'slot-new');

      expect(rtx.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appt-1' },
        data: { status: AppointmentStatus.RESCHEDULED },
      });
      expect(rtx.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slotId: 'slot-new',
            rescheduledFromId: 'appt-1',
            status: AppointmentStatus.PENDING,
          }),
        }),
      );
      expect(result.rescheduledFromId).toBe('appt-1');
    });

    it('rejects a slot belonging to a different doctor', async () => {
      rtx.availabilitySlot.findUnique.mockResolvedValue({ ...newSlot, doctorId: 'doctor-2' });
      await expect(
        service.reschedule('user-patient-1', 'PATIENT', 'appt-1', 'slot-new'),
      ).rejects.toThrow('Slot belongs to a different doctor');
    });
  });
```

Add `BadRequestException`/`ForbiddenException` to imports in the spec only if asserting them; the string `.rejects.toThrow` form above needs none.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- appointments.service`
Expected: FAIL — `service.reschedule` is not a function.

- [ ] **Step 4: Implement the service method**

Add to `AppointmentsService` (after `updateStatus`):

```typescript
  async reschedule(
    userId: string,
    role: string,
    appointmentId: string,
    newSlotId: string,
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: { select: { id: true } } } },
        doctor: { include: { user: { select: { id: true } } } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isOwner =
      role === 'DOCTOR'
        ? appointment.doctor.userId === userId
        : appointment.patient.userId === userId;
    if (!isOwner) {
      throw new ForbiddenException('You can only reschedule your own appointments');
    }

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only pending or confirmed appointments can be rescheduled',
      );
    }

    const newAppointment = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: newSlotId },
      });

      if (!slot) {
        throw new NotFoundException('Availability slot not found');
      }
      if (slot.doctorId !== appointment.doctorId) {
        throw new BadRequestException('Slot belongs to a different doctor');
      }
      if (slot.status !== SlotStatus.AVAILABLE) {
        throw new BadRequestException('Slot is not available');
      }
      if (new Date(slot.startTime) < new Date()) {
        throw new BadRequestException('Cannot book a slot in the past');
      }

      await tx.availabilitySlot.update({
        where: { id: newSlotId },
        data: { status: SlotStatus.BOOKED },
      });
      await tx.availabilitySlot.update({
        where: { id: appointment.slotId },
        data: { status: SlotStatus.AVAILABLE },
      });
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.RESCHEDULED },
      });

      const created = await tx.appointment.create({
        data: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          slotId: newSlotId,
          reasonForVisit: appointment.reasonForVisit,
          status: AppointmentStatus.PENDING,
          rescheduledFromId: appointmentId,
        },
      });

      const fee = appointment.doctor.consultationFee ?? 0;
      await tx.payment.create({
        data: {
          appointmentId: created.id,
          amount: fee,
          status: fee > 0 ? 'PAID' : 'WAIVED',
        },
      });

      return created;
    });

    const targetUserId =
      role === 'DOCTOR'
        ? appointment.patient.userId
        : appointment.doctor.userId;
    this.notifications
      .createNotification(
        targetUserId,
        NotificationType.APPOINTMENT_RESCHEDULED,
        'Appointment Rescheduled',
        'An appointment has been rescheduled to a new time slot.',
      )
      .catch(() => null);

    return newAppointment;
  }
```

`NotFoundException`, `BadRequestException`, `ForbiddenException`, `AppointmentStatus`, `SlotStatus`, `NotificationType` are already imported in this service.

- [ ] **Step 5: Add the controller route**

In `appointments.controller.ts`: import the DTO and add a route. Add to imports:

```typescript
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { Role } from '@prisma/client';
```

(`Role` is already imported — do not duplicate.) Add the route after `updateStatus`:

```typescript
  @Post(':id/reschedule')
  @Roles('DOCTOR', 'PATIENT')
  reschedule(
    @Request() req: { user: { id: string; role: Role } },
    @Param('id') id: string,
    @Body() rescheduleAppointmentDto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(
      req.user.id,
      req.user.role,
      id,
      rescheduleAppointmentDto.newSlotId,
    );
  }
```

- [ ] **Step 6: Run tests + build**

Run: `npm test -- appointments.service && npm run build`
Expected: tests PASS, build clean.

- [ ] **Step 7: Commit**

```bash
git add src/appointments/dto/reschedule-appointment.dto.ts src/appointments/appointments.service.ts src/appointments/appointments.controller.ts src/appointments/appointments.service.spec.ts
git commit -m "feat(appointments): add reschedule endpoint linking old and new appointment"
```

---

## Task 4: B5 — Patient medical-history update endpoint

**Files:**
- Create: `src/patients/dto/update-medical-history.dto.ts`
- Modify: `src/patients/patients.service.ts`, `src/patients/patients.controller.ts`
- Test: `src/patients/patients.service.spec.ts`

- [ ] **Step 1: Create the DTO**

`src/patients/dto/update-medical-history.dto.ts`:

```typescript
import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateMedicalHistoryDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @IsOptional()
  @IsString()
  pastSurgeries?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  smokingStatus?: string;
}
```

- [ ] **Step 2: Write the failing test**

Add to `patients.service.spec.ts` (add `patientMedicalHistory: { update: jest.fn() }` to the mock Prisma service if absent):

```typescript
  describe('updateMedicalHistory', () => {
    it('updates the history row for the caller patient profile', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
      mockPrismaService.patientMedicalHistory.update.mockResolvedValue({ id: 'h1', allergies: ['nuts'] });

      const result = await service.updateMedicalHistory('user-1', { allergies: ['nuts'] });

      expect(mockPrismaService.patientMedicalHistory.update).toHaveBeenCalledWith({
        where: { patientId: 'patient-1' },
        data: { allergies: ['nuts'] },
      });
      expect(result.allergies).toEqual(['nuts']);
    });
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- patients.service`
Expected: FAIL — `service.updateMedicalHistory` is not a function.

- [ ] **Step 4: Implement**

Add to `PatientsService` (after `update`), importing the DTO type at the top:

```typescript
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
```

```typescript
  async updateMedicalHistory(userId: string, dto: UpdateMedicalHistoryDto) {
    const profile = await this.findByUserId(userId);
    return this.prisma.patientMedicalHistory.update({
      where: { patientId: profile.id },
      data: dto,
    });
  }
```

- [ ] **Step 5: Add the controller route**

In `patients.controller.ts`, import the DTO and add a route (the controller is already `@Roles('PATIENT')` class-wide):

```typescript
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
```

```typescript
  @Patch('medical-history')
  updateMedicalHistory(
    @Request() req: { user: { id: string } },
    @Body() updateMedicalHistoryDto: UpdateMedicalHistoryDto,
  ) {
    return this.patientsService.updateMedicalHistory(
      req.user.id,
      updateMedicalHistoryDto,
    );
  }
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test -- patients.service`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/patients/dto/update-medical-history.dto.ts src/patients/patients.service.ts src/patients/patients.controller.ts src/patients/patients.service.spec.ts
git commit -m "feat(patients): add medical-history update endpoint"
```

---

## Task 5: B6 — Structured prescriptions on medical record create

**Files:**
- Modify: `src/medical-records/dto/create-medical-record.dto.ts`, `src/medical-records/medical-records.service.ts`
- Test: `src/medical-records/medical-records.service.spec.ts`

- [ ] **Step 1: Extend the DTO**

In `create-medical-record.dto.ts`, add imports and a nested DTO + array field. Replace the import line and append the prescriptions field:

```typescript
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsInt,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  drugName: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}
```

Add this field inside `CreateMedicalRecordDto` (alongside the existing optional fields):

```typescript
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptions?: PrescriptionItemDto[];
```

- [ ] **Step 2: Write the failing test**

Add to `medical-records.service.spec.ts`:

```typescript
  it('creates structured prescription rows when provided', async () => {
    mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' });
    mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);
    mockPrismaService.medicalRecord.create.mockResolvedValue({ id: 'rec-1', patient: { userId: 'u1' } });

    await service.create('user-doctor-1', {
      appointmentId: 'appt-1',
      prescriptions: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'TID' }],
    } as any);

    expect(mockPrismaService.medicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prescriptions: { create: [{ drugName: 'Amoxicillin', dosage: '500mg', frequency: 'TID' }] },
        }),
      }),
    );
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- medical-records.service`
Expected: FAIL — `prescriptions` not in the `create` data.

- [ ] **Step 4: Implement**

In `medical-records.service.ts` `create`, update the `medicalRecord.create` call: add the nested create to `data` and include prescriptions in the response:

```typescript
    const record = await this.prisma.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: doctorProfile.id,
        notes: createMedicalRecordDto.notes,
        prescription: createMedicalRecordDto.prescription,
        recommendations: createMedicalRecordDto.recommendations,
        followUpAdvice: createMedicalRecordDto.followUpAdvice,
        ...(createMedicalRecordDto.prescriptions?.length
          ? { prescriptions: { create: createMedicalRecordDto.prescriptions } }
          : {}),
      },
      include: {
        appointment: true,
        prescriptions: true,
        patient: {
          include: { user: { select: { email: true } } },
        },
      },
    });
```

Also add `prescriptions: true` to the `include` of `findAllForPatient` and `findAllForDoctor`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- medical-records.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/medical-records/dto/create-medical-record.dto.ts src/medical-records/medical-records.service.ts src/medical-records/medical-records.service.spec.ts
git commit -m "feat(medical-records): accept structured prescriptions on record create"
```

---

## Task 6: B9 — Follow-up appointment linking

**Files:**
- Modify: `src/medical-records/dto/create-medical-record.dto.ts`, `src/medical-records/medical-records.service.ts`
- Test: `src/medical-records/medical-records.service.spec.ts`

- [ ] **Step 1: Extend the DTO**

Add to `CreateMedicalRecordDto`:

```typescript
  @IsString()
  @IsOptional()
  followUpAppointmentId?: string;
```

- [ ] **Step 2: Write the failing test**

Add to `medical-records.service.spec.ts`:

```typescript
  it('rejects a follow-up appointment belonging to another patient', async () => {
    mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
    mockPrismaService.appointment.findUnique
      .mockResolvedValueOnce({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' })
      .mockResolvedValueOnce({ id: 'followup-1', patientId: 'patient-2' });
    mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);

    await expect(
      service.create('user-doctor-1', {
        appointmentId: 'appt-1',
        followUpAppointmentId: 'followup-1',
      } as any),
    ).rejects.toThrow('Invalid follow-up appointment');
  });

  it('links a valid follow-up appointment', async () => {
    mockPrismaService.doctorProfile.findUnique.mockResolvedValue({ id: 'doctor-1', fullName: 'Dr. S' });
    mockPrismaService.appointment.findUnique
      .mockResolvedValueOnce({ id: 'appt-1', doctorId: 'doctor-1', patientId: 'patient-1' })
      .mockResolvedValueOnce({ id: 'followup-1', patientId: 'patient-1' });
    mockPrismaService.medicalRecord.findUnique.mockResolvedValue(null);
    mockPrismaService.medicalRecord.create.mockResolvedValue({ id: 'rec-1', patient: { userId: 'u1' } });

    await service.create('user-doctor-1', {
      appointmentId: 'appt-1',
      followUpAppointmentId: 'followup-1',
    } as any);

    expect(mockPrismaService.medicalRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ followUpAppointmentId: 'followup-1' }),
      }),
    );
  });
```

Add `BadRequestException` to the spec's imports from `@nestjs/common` only if asserting the instance; the `.rejects.toThrow('Invalid follow-up appointment')` string form needs none.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- medical-records.service`
Expected: FAIL — no follow-up validation/link yet.

- [ ] **Step 4: Implement**

In `medical-records.service.ts`, add `BadRequestException` to the `@nestjs/common` import. After the existing-record `ConflictException` check and before `medicalRecord.create`, validate the follow-up:

```typescript
    if (createMedicalRecordDto.followUpAppointmentId) {
      const followUp = await this.prisma.appointment.findUnique({
        where: { id: createMedicalRecordDto.followUpAppointmentId },
      });
      if (!followUp || followUp.patientId !== appointment.patientId) {
        throw new BadRequestException('Invalid follow-up appointment');
      }
    }
```

Add `followUpAppointmentId` to the `create` `data` (alongside the Task 5 fields):

```typescript
        followUpAppointmentId: createMedicalRecordDto.followUpAppointmentId,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- medical-records.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/medical-records/dto/create-medical-record.dto.ts src/medical-records/medical-records.service.ts src/medical-records/medical-records.service.spec.ts
git commit -m "feat(medical-records): link follow-up appointment on record create"
```

---

## Task 7: B8 — Payment read on appointment includes

**Files:**
- Modify: `src/appointments/appointments.service.ts`
- Test: `src/appointments/appointments.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `appointments.service.spec.ts`:

```typescript
  it('includes payment when listing patient appointments', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findMany = jest.fn().mockResolvedValue([]);

    await service.findAllForPatient('user-1');

    expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ payment: true }),
      }),
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- appointments.service`
Expected: FAIL — `payment` not in the include.

- [ ] **Step 3: Implement**

In `appointments.service.ts`, add `payment: true` to the `include` of `findAllForPatient`, `findAllForDoctor`, and `findOne`. Example for `findAllForPatient`:

```typescript
      include: {
        doctor: true,
        slot: true,
        payment: true,
      },
```

`findAllForDoctor` and `findOne` use `{ patient: true, slot: true }` — add `payment: true` to each.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- appointments.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/appointments/appointments.service.ts src/appointments/appointments.service.spec.ts
git commit -m "feat(appointments): include payment on appointment reads"
```

---

## Task 8: B4 — Reviews module + rating aggregation + discovery sort

**Files:**
- Create: `src/reviews/reviews.module.ts`, `src/reviews/reviews.controller.ts`, `src/reviews/reviews.service.ts`, `src/reviews/dto/create-review.dto.ts`, `src/reviews/reviews.service.spec.ts`
- Modify: `src/app.module.ts`, `src/doctors/doctors.service.ts`, `src/doctors/doctors.controller.ts`
- Test: `src/reviews/reviews.service.spec.ts`, `src/doctors/doctors.service.spec.ts`

### 8a — Reviews module (create endpoint)

- [ ] **Step 1: Create the DTO**

`src/reviews/dto/create-review.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
```

- [ ] **Step 2: Write the failing service spec**

`src/reviews/reviews.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrismaService = {
    patientProfile: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn() },
    review: { findUnique: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  const dto = { appointmentId: 'appt-1', rating: 5, comment: 'great' };

  it('creates a review for a completed, owned appointment', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', status: AppointmentStatus.COMPLETED,
    });
    mockPrismaService.review.findUnique.mockResolvedValue(null);
    mockPrismaService.review.create.mockResolvedValue({ id: 'rev-1' });

    const result = await service.create('user-1', dto);

    expect(mockPrismaService.review.create).toHaveBeenCalledWith({
      data: { appointmentId: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', rating: 5, comment: 'great' },
    });
    expect(result.id).toBe('rev-1');
  });

  it('rejects a review on a non-completed appointment', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', status: AppointmentStatus.CONFIRMED,
    });
    await expect(service.create('user-1', dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects a review on an appointment the patient does not own', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-2', doctorId: 'doctor-1', status: AppointmentStatus.COMPLETED,
    });
    await expect(service.create('user-1', dto)).rejects.toThrow(ForbiddenException);
  });

  it('rejects a duplicate review', async () => {
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1' });
    mockPrismaService.appointment.findUnique.mockResolvedValue({
      id: 'appt-1', patientId: 'patient-1', doctorId: 'doctor-1', status: AppointmentStatus.COMPLETED,
    });
    mockPrismaService.review.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.create('user-1', dto)).rejects.toThrow(ConflictException);
  });
});
```

- [ ] **Step 3: Run spec to verify it fails**

Run: `npm test -- reviews.service`
Expected: FAIL — cannot find `./reviews.service`.

- [ ] **Step 4: Implement service, controller, module**

`src/reviews/reviews.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('You can only review your own appointments');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed appointments');
    }

    const existing = await this.prisma.review.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) {
      throw new ConflictException('A review already exists for this appointment');
    }

    return this.prisma.review.create({
      data: {
        appointmentId: dto.appointmentId,
        patientId: patient.id,
        doctorId: appointment.doctorId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }
}
```

`src/reviews/reviews.controller.ts`:

```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles('PATIENT')
  create(
    @Request() req: { user: { id: string } },
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }
}
```

`src/reviews/reviews.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
```

Register in `src/app.module.ts`: add `import { ReviewsModule } from './reviews/reviews.module';` with the other imports and add `ReviewsModule` to the `imports` array.

- [ ] **Step 5: Run spec to verify it passes**

Run: `npm test -- reviews.service`
Expected: PASS (all 4 cases).

- [ ] **Step 6: Commit**

```bash
git add src/reviews src/app.module.ts
git commit -m "feat(reviews): add review create endpoint for completed appointments"
```

### 8b — Rating aggregation + discovery sort

- [ ] **Step 7: Write the failing test**

Add to `doctors.service.spec.ts` (add `review: { groupBy: jest.fn() }` to the mock Prisma service):

```typescript
  describe('searchAll ratings', () => {
    it('attaches avgRating and reviewCount, and sorts by rating', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([
        { id: 'doctor-1', fullName: 'A' },
        { id: 'doctor-2', fullName: 'B' },
      ]);
      mockPrismaService.review.groupBy.mockResolvedValue([
        { doctorId: 'doctor-1', _avg: { rating: 3 }, _count: { rating: 2 } },
        { doctorId: 'doctor-2', _avg: { rating: 5 }, _count: { rating: 4 } },
      ]);

      const result = await service.searchAll(undefined, undefined, 'rating');

      expect(mockPrismaService.review.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isVisible: true }) }),
      );
      expect(result[0].id).toBe('doctor-2');
      expect(result[0].avgRating).toBe(5);
      expect(result[0].reviewCount).toBe(4);
      expect(result[1].avgRating).toBe(3);
    });

    it('defaults missing ratings to zero', async () => {
      mockPrismaService.doctorProfile.findMany.mockResolvedValue([{ id: 'doctor-3', fullName: 'C' }]);
      mockPrismaService.review.groupBy.mockResolvedValue([]);

      const result = await service.searchAll();

      expect(result[0].avgRating).toBe(0);
      expect(result[0].reviewCount).toBe(0);
    });
  });
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npm test -- doctors.service`
Expected: FAIL — `searchAll` takes 2 args, returns no `avgRating`.

- [ ] **Step 9: Implement aggregation in `doctors.service.ts`**

Update `searchAll` to accept `sortBy` and attach ratings; update `findById` to attach a single rating; add a private helper:

```typescript
  async searchAll(search?: string, specialization?: string, sortBy?: string) {
    const where: Prisma.DoctorProfileWhereInput = {
      isActive: true,
      isVerified: true,
    };

    if (search) {
      where.fullName = { contains: search, mode: 'insensitive' };
    }

    if (specialization) {
      where.specializations = {
        some: {
          specialization: {
            name: { contains: specialization, mode: 'insensitive' },
          },
        },
      };
    }

    const profiles = await this.prisma.doctorProfile.findMany({
      where,
      include: {
        availabilitySlots: true,
      },
    });

    const withRatings = await this.attachRatings(profiles);

    if (sortBy === 'rating') {
      withRatings.sort((a, b) => b.avgRating - a.avgRating);
    }

    return withRatings;
  }

  private async attachRatings<T extends { id: string }>(profiles: T[]) {
    if (profiles.length === 0) {
      return [] as (T & { avgRating: number; reviewCount: number })[];
    }
    const ids = profiles.map((p) => p.id);
    const grouped = await this.prisma.review.groupBy({
      by: ['doctorId'],
      where: { doctorId: { in: ids }, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const byDoctor = new Map(grouped.map((g) => [g.doctorId, g]));
    return profiles.map((p) => {
      const g = byDoctor.get(p.id);
      return {
        ...p,
        avgRating: g?._avg.rating ?? 0,
        reviewCount: g?._count.rating ?? 0,
      };
    });
  }
```

Update `findById` to attach the rating before returning:

```typescript
  async findById(id: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        availabilitySlots: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    const [withRating] = await this.attachRatings([profile]);
    return withRating;
  }
```

- [ ] **Step 10: Thread `sortBy` through the controller**

In `doctors.controller.ts`, update `findAll` to read `?sortBy` and expose the rating fields through the public mapper:

```typescript
  @Public()
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('specialization') specialization?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const profiles = await this.doctorsService.searchAll(
      search,
      specialization,
      sortBy,
    );
    return profiles.map((p) => ({
      ...toPublicDoctorProfile(p),
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
    }));
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const profile = await this.doctorsService.findById(id);
    return {
      ...toPublicDoctorProfile(profile),
      avgRating: profile.avgRating,
      reviewCount: profile.reviewCount,
    };
  }
```

`toPublicDoctorProfile` ignores the extra `avgRating`/`reviewCount`/`id` keys it doesn't destructure, so passing the enriched object is safe.

- [ ] **Step 11: Run tests + build**

Run: `npm test -- doctors && npm run build`
Expected: tests PASS, build clean.

- [ ] **Step 12: Commit**

```bash
git add src/doctors/doctors.service.ts src/doctors/doctors.controller.ts src/doctors/doctors.service.spec.ts
git commit -m "feat(doctors): aggregate review ratings and support sortBy=rating in discovery"
```

---

## Final verification

- [ ] **Run the full suite + build**

Run: `npm test && npm run build`
Expected: all tests PASS (≥55, plus the new cases), build clean, 0 TypeScript errors.

- [ ] **Confirm no migration drift**

Run: `npx prisma validate`
Expected: "The schema is valid" — no schema edits were made, so no migration is needed.
