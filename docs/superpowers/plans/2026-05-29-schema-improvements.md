# Schema Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 12 sequential Prisma migrations across 5 phases — adding structured fields, new models, a type change, a data migration script, and bonus models — without breaking any working API endpoint.

**Architecture:** Each phase owns exactly one migration (`npx prisma migrate dev --name <name>` from `backend/`), followed by DTO/service/frontend code changes. `npm test` (from `backend/`) verifies no regressions after every phase. Frontend changes happen only in Phase 3.

**Tech Stack:** NestJS + Prisma ORM + PostgreSQL; Next.js + TypeScript; Jest unit tests (all `*.spec.ts` in `backend/src/`)

---

## File Map

| Phase | Files modified / created |
|---|---|
| Pre-Flight | — (DB reset only) |
| 1.1 | `backend/prisma/schema.prisma`, `backend/src/patients/dto/create-patient.dto.ts` |
| 1.2 | `schema.prisma`, `backend/src/doctors/dto/create-doctor.dto.ts`, `backend/src/doctors/dto/create-doctor-profile.dto.ts`, `backend/src/doctors/doctors.service.ts`, `backend/src/doctors/doctors.service.spec.ts` |
| 1.3 | `schema.prisma`, `backend/src/appointments/dto/update-appointment-status.dto.ts`, `backend/src/appointments/appointments.service.ts` |
| 1.4 | `schema.prisma`, `backend/src/notifications/notifications.service.ts`, `backend/src/appointments/appointments.service.ts`, `backend/src/medical-records/medical-records.service.ts` |
| 2.1 | `schema.prisma`, `backend/prisma/seed.ts` |
| 2.2 | `schema.prisma`, `backend/src/appointments/appointments.service.ts`, **create** `backend/src/appointments/appointments.service.spec.ts` |
| 2.3 | `schema.prisma` |
| 2.4 | `schema.prisma`, `backend/src/patients/patients.service.ts`, `backend/src/patients/patients.service.spec.ts` |
| 3.1 | `schema.prisma`, `backend/prisma/seed.ts`, `backend/src/doctors/dto/create-doctor.dto.ts`, `backend/src/doctors/dto/create-doctor-profile.dto.ts`, `frontend/src/types/api.ts`, `frontend/src/app/doctors/[id]/page.tsx`, `frontend/src/app/doctor/profile/page.tsx`, `frontend/src/app/onboarding/doctor/4/page.tsx`, `frontend/src/components/doctors/use-doctor-discovery.ts`, `frontend/src/components/doctors/DoctorCard.tsx` |
| 4 | **create** `backend/scripts/migrate-specializations.ts`, `backend/src/doctors/doctors.service.ts`, `backend/src/doctors/doctors.service.spec.ts` |
| 5.1 | `schema.prisma` |
| 5.2 | `schema.prisma` |

---

## Pre-Flight: Reset Database

**Files:** none (DB operation only)

- [ ] **Step 1: Reset the database**

```bash
cd backend
npx prisma migrate reset
```

Confirm `y` when prompted. This drops and recreates the database, replaying all existing migrations.

- [ ] **Step 2: Verify migration status**

```bash
npx prisma migrate status
```

Expected: all migrations listed as `Applied`. No pending or failed migrations.

- [ ] **Step 3: Verify no schema drift**

```bash
npx prisma db pull
```

Expected: output with no drift warnings (e.g. "The database schema is in sync with your Prisma schema").

- [ ] **Step 4: Re-run the seed**

```bash
npx prisma db seed
```

Expected: "Doctors seeded." and "Patients seeded." logged without errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: all tests pass (currently 36).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: reset database before schema improvements"
```

---

## Task 1 — Phase 1.1: PatientProfile Additive Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/patients/dto/create-patient.dto.ts`

- [ ] **Step 1: Add fields to PatientProfile in schema**

In `backend/prisma/schema.prisma`, inside the `PatientProfile` model, add after the `contactDetails` field:

```prisma
phoneNumber     String?  @map("phone_number")
address         String?
city            String?
region          String?
philhealthId    String?  @map("philhealth_id")
hmoProvider     String?  @map("hmo_provider")
hmoCardNo       String?  @map("hmo_card_no")
```

Do NOT remove `contactDetails String? @map("contact_details")`.

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_patient_contact_location_fields
```

Expected: migration created and applied with no errors.

- [ ] **Step 3: Add optional fields to patient DTO**

In `backend/src/patients/dto/create-patient.dto.ts`, add these optional fields at the end of the class (after existing fields):

```typescript
@IsOptional()
@IsString()
phoneNumber?: string;

@IsOptional()
@IsString()
address?: string;

@IsOptional()
@IsString()
city?: string;

@IsOptional()
@IsString()
region?: string;

@IsOptional()
@IsString()
philhealthId?: string;

@IsOptional()
@IsString()
hmoProvider?: string;

@IsOptional()
@IsString()
hmoCardNo?: string;
```

`UpdatePatientDto extends PartialType(CreatePatientDto)` — the update DTO inherits these automatically. No changes needed there.

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd backend
npx prisma generate
```

Expected: no errors. New fields appear in Prisma types.

- [ ] **Step 5: Run tests — verify no regressions**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ src/patients/dto/create-patient.dto.ts
git commit -m "feat: add structured patient contact and location fields (Phase 1.1)"
```

---

## Task 2 — Phase 1.2: DoctorProfile Verification & Location Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/doctors/dto/create-doctor.dto.ts`
- Modify: `backend/src/doctors/dto/create-doctor-profile.dto.ts`
- Modify: `backend/src/doctors/doctors.service.ts`
- Modify: `backend/src/doctors/doctors.service.spec.ts`

- [ ] **Step 1: Write a failing test for the new discovery filter**

In `backend/src/doctors/doctors.service.spec.ts`, add inside the existing `describe('DoctorsService', ...)` block:

```typescript
describe('searchAll', () => {
  it('should always filter by isActive: true and isVerified: true', async () => {
    mockPrismaService.doctorProfile.findMany.mockResolvedValue([]);

    await service.searchAll();

    expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isVerified: true,
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
npm test -- --testPathPattern=doctors.service
```

Expected: FAIL — `isActive` and `isVerified` are not in the current where clause.

- [ ] **Step 3: Add fields to DoctorProfile in schema**

In `backend/prisma/schema.prisma`, inside the `DoctorProfile` model, add after `consultationFee`:

```prisma
prcLicenseNo      String?   @map("prc_license_no")
prcLicenseExpiry  DateTime? @map("prc_license_expiry")
ptrNo             String?   @map("ptr_no")
region            String?
city              String?
isVerified        Boolean   @default(false) @map("is_verified")
isActive          Boolean   @default(true)  @map("is_active")
verifiedAt        DateTime? @map("verified_at")
```

- [ ] **Step 4: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_doctor_verification_and_location_fields
```

Expected: migration created and applied.

- [ ] **Step 5: Update searchAll to filter by isActive and isVerified**

In `backend/src/doctors/doctors.service.ts`, update `searchAll`:

```typescript
async searchAll(search?: string, specialization?: string) {
  const where: Prisma.DoctorProfileWhereInput = {
    isActive: true,
    isVerified: true,
  };

  if (search) {
    where.fullName = { contains: search, mode: 'insensitive' };
  }

  if (specialization) {
    where.specialization = { contains: specialization, mode: 'insensitive' };
  }

  return this.prisma.doctorProfile.findMany({
    where,
    include: {
      availabilitySlots: true,
    },
  });
}
```

- [ ] **Step 6: Add optional fields to doctor DTOs**

In `backend/src/doctors/dto/create-doctor.dto.ts`, add at the end of the class:

```typescript
@IsOptional()
@IsString()
@MaxLength(255)
prcLicenseNo?: string;

@IsOptional()
@IsDateString()
prcLicenseExpiry?: string;

@IsOptional()
@IsString()
@MaxLength(255)
ptrNo?: string;

@IsOptional()
@IsString()
@MaxLength(255)
region?: string;

@IsOptional()
@IsString()
@MaxLength(255)
city?: string;
```

Add `IsDateString` to the imports at the top: `import { IsString, IsOptional, IsNumber, Min, MaxLength, IsDateString } from 'class-validator';`

In `backend/src/doctors/dto/create-doctor-profile.dto.ts`, add at the end of the class:

```typescript
@IsOptional()
@IsString()
prcLicenseNo?: string;

@IsOptional()
@IsDateString()
prcLicenseExpiry?: string;

@IsOptional()
@IsString()
ptrNo?: string;

@IsOptional()
@IsString()
region?: string;

@IsOptional()
@IsString()
city?: string;
```

Add `IsDateString` to the imports: `import { IsString, IsOptional, IsNumber, IsUrl, Min, IsDateString } from 'class-validator';`

- [ ] **Step 7: Run tests to confirm they pass**

```bash
cd backend
npm test -- --testPathPattern=doctors.service
```

Expected: PASS including the new `searchAll` test.

- [ ] **Step 8: Run full suite**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ src/doctors/
git commit -m "feat: add doctor verification, location fields, and discovery filter (Phase 1.2)"
```

---

## Task 3 — Phase 1.3: Appointment Reschedule Audit Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/appointments/dto/update-appointment-status.dto.ts`
- Modify: `backend/src/appointments/appointments.service.ts`

- [ ] **Step 1: Add audit fields and self-relation to Appointment in schema**

In `backend/prisma/schema.prisma`, inside the `Appointment` model, add after `bookedAt`:

```prisma
cancelledAt       DateTime? @map("cancelled_at")
cancelReason      String?   @map("cancel_reason")
rescheduledFromId String?   @map("rescheduled_from_id")
rescheduledFrom   Appointment?  @relation("RescheduledAppointments", fields: [rescheduledFromId], references: [id], onDelete: SetNull)
rescheduledTo     Appointment?  @relation("RescheduledAppointments")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_appointment_reschedule_audit
```

Expected: migration created and applied.

- [ ] **Step 3: Add optional cancelReason to the status update DTO**

Replace the contents of `backend/src/appointments/dto/update-appointment-status.dto.ts`:

```typescript
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  @IsNotEmpty()
  status: AppointmentStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
```

- [ ] **Step 4: Set cancelledAt and cancelReason in updateStatus**

In `backend/src/appointments/appointments.service.ts`, find the appointment update call (around line 230). Currently:

```typescript
const updated = await this.prisma.appointment.update({
  where: { id },
  data: { status },
});
```

Update the method signature to accept `cancelReason` and set the audit fields:

```typescript
async updateStatus(
  userId: string,
  role: string,
  id: string,
  status: AppointmentStatus,
  cancelReason?: string,
) {
```

And update the appointment update call:

```typescript
const updated = await this.prisma.appointment.update({
  where: { id },
  data: {
    status,
    ...(status === AppointmentStatus.CANCELLED && {
      cancelledAt: new Date(),
      cancelReason: cancelReason ?? null,
    }),
  },
});
```

- [ ] **Step 5: Pass cancelReason from the controller**

In `backend/src/appointments/appointments.controller.ts`, find the `updateStatus` handler. Pass `dto.cancelReason` through:

```typescript
return this.appointmentsService.updateStatus(
  req.user.id,
  req.user.role,
  id,
  dto.status,
  dto.cancelReason,
);
```

- [ ] **Step 6: Run tests**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ src/appointments/
git commit -m "feat: add appointment cancellation audit and reschedule link fields (Phase 1.3)"
```

---

## Task 4 — Phase 1.4: NotificationType Enum

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/notifications/notifications.service.ts`
- Modify: `backend/src/appointments/appointments.service.ts`
- Modify: `backend/src/medical-records/medical-records.service.ts`

- [ ] **Step 1: Add NotificationType enum and update Notification model in schema**

In `backend/prisma/schema.prisma`, add the enum after the existing `SlotStatus` enum:

```prisma
enum NotificationType {
  APPOINTMENT_BOOKED
  APPOINTMENT_CONFIRMED
  APPOINTMENT_CANCELLED
  APPOINTMENT_COMPLETED
  APPOINTMENT_RESCHEDULED
  APPOINTMENT_REMINDER
  PRESCRIPTION_READY
  MEDICAL_RECORD_CREATED
  GENERAL
}
```

Inside the `Notification` model, replace:
```prisma
type      String
```
With:
```prisma
type      NotificationType
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_notification_type_enum
```

Expected: migration created and applied. If it fails with a cast error (shouldn't with a clean DB from pre-flight), run:
```sql
UPDATE notifications SET type = 'GENERAL' WHERE type NOT IN (
  'APPOINTMENT_BOOKED','APPOINTMENT_CONFIRMED','APPOINTMENT_CANCELLED',
  'APPOINTMENT_COMPLETED','APPOINTMENT_RESCHEDULED','APPOINTMENT_REMINDER',
  'PRESCRIPTION_READY','MEDICAL_RECORD_CREATED','GENERAL'
);
```
Then re-run the migration.

- [ ] **Step 3: Update notifications service signature**

Replace the `createNotification` method in `backend/src/notifications/notifications.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message },
    });
  }
}
```

- [ ] **Step 4: Update appointments service notification calls**

In `backend/src/appointments/appointments.service.ts`, add import:
```typescript
import { AppointmentStatus, SlotStatus, NotificationType } from '@prisma/client';
```

Update the two hardcoded `APPOINTMENT_BOOKED` calls in `create()`:
```typescript
this.notifications
  .createNotification(
    appointment.doctor.userId,
    NotificationType.APPOINTMENT_BOOKED,
    'New Appointment Request',
    `You have a new appointment request from ${patientProfile.fullName}.`,
  )
  .catch(() => null);

this.notifications
  .createNotification(
    userId,
    NotificationType.APPOINTMENT_BOOKED,
    'Appointment Requested',
    `Your appointment with ${appointment.doctor.fullName} has been requested.`,
  )
  .catch(() => null);
```

Replace the dynamic `APPOINTMENT_${status}` call in `updateStatus()`:

```typescript
const typeMap: Partial<Record<AppointmentStatus, NotificationType>> = {
  [AppointmentStatus.CONFIRMED]: NotificationType.APPOINTMENT_CONFIRMED,
  [AppointmentStatus.CANCELLED]: NotificationType.APPOINTMENT_CANCELLED,
  [AppointmentStatus.COMPLETED]: NotificationType.APPOINTMENT_COMPLETED,
};

const notif = statusMessages[status];
if (notif && notif.targetUserId) {
  this.notifications
    .createNotification(
      notif.targetUserId,
      typeMap[status] ?? NotificationType.GENERAL,
      notif.title,
      notif.message,
    )
    .catch(() => null);
}
```

Remove the old `const notif = statusMessages[status]; if (notif && notif.targetUserId) { this.notifications.createNotification(notif.targetUserId, \`APPOINTMENT_${status}\`, ...) }` block and replace with the above.

- [ ] **Step 5: Update medical records service notification call**

In `backend/src/medical-records/medical-records.service.ts`, add import:
```typescript
import { NotificationType } from '@prisma/client';
```

Find the `createNotification` call and update:
```typescript
.createNotification(
  record.patient.userId,
  NotificationType.MEDICAL_RECORD_CREATED,
  'New Medical Record',
  `${doctorProfile.fullName} has added consultation notes and a prescription to your records.`,
)
```

- [ ] **Step 6: Run tests**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ src/notifications/ src/appointments/ src/medical-records/
git commit -m "feat: add NotificationType enum and update all notification call sites (Phase 1.4)"
```

---

## Task 5 — Phase 2.1: Specialization Model + Seed

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`

- [ ] **Step 1: Add Specialization and DoctorSpecialization models to schema**

In `backend/prisma/schema.prisma`, add after the existing `RecommendationLog` model:

```prisma
model Specialization {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  doctors     DoctorSpecialization[]

  @@map("specializations")
}

model DoctorSpecialization {
  doctorId         String         @map("doctor_id")
  doctor           DoctorProfile  @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  specializationId String         @map("specialization_id")
  specialization   Specialization @relation(fields: [specializationId], references: [id], onDelete: Cascade)
  isPrimary        Boolean        @default(false) @map("is_primary")

  @@id([doctorId, specializationId])
  @@map("doctor_specializations")
}
```

Inside the existing `DoctorProfile` model, add after the last `@@` directive or after the existing relation fields:

```prisma
specializations  DoctorSpecialization[]
```

Do NOT remove `specialization String` from `DoctorProfile`.

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_specialization_model
```

Expected: migration created and applied.

- [ ] **Step 3: Seed the Specialization table**

In `backend/prisma/seed.ts`, inside the `main()` function, add after the database clear block (before doctor seeding):

```typescript
// Seed specializations
console.log('Seeding specializations...');
const specializationNames = [
  'General Practice', 'Internal Medicine', 'Pediatrics', 'OB-GYN',
  'Dermatology', 'Cardiology', 'Orthopedics', 'ENT', 'Psychiatry',
  'Neurology', 'Ophthalmology', 'Radiology', 'Surgery',
  'Family Medicine', 'Rehabilitation Medicine',
];
for (const name of specializationNames) {
  await prisma.specialization.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}
console.log('Specializations seeded.');
```

Also add `prisma.doctorSpecialization.deleteMany()` and `prisma.specialization.deleteMany()` to the database clear block (in order — doctorSpecialization before specialization, and both before doctorProfile):

```typescript
await prisma.medicalRecord.deleteMany();
await prisma.appointment.deleteMany();
await prisma.availabilitySlot.deleteMany();
await prisma.doctorSpecialization.deleteMany();
await prisma.recommendationLog.deleteMany();
await prisma.notification.deleteMany();
await prisma.patientProfile.deleteMany();
await prisma.doctorProfile.deleteMany();
await prisma.specialization.deleteMany();
await prisma.user.deleteMany();
```

- [ ] **Step 4: Run seed to verify**

```bash
cd backend
npx prisma db seed
```

Expected: "Specializations seeded." in output with no errors.

- [ ] **Step 5: Run tests**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts
git commit -m "feat: add Specialization model and seed Philippine medical specializations (Phase 2.1)"
```

---

## Task 6 — Phase 2.2: Payment Model + Auto-Create on Booking

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/appointments/appointments.service.ts`
- Create: `backend/src/appointments/appointments.service.spec.ts`

- [ ] **Step 1: Write a failing test for payment auto-creation**

Create `backend/src/appointments/appointments.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AppointmentStatus, SlotStatus } from '@prisma/client';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const mockSlot = {
    id: 'slot-1',
    doctorId: 'doctor-1',
    status: SlotStatus.AVAILABLE,
    startTime: new Date(Date.now() + 86400000),
    endTime: new Date(Date.now() + 90000000),
  };

  const mockAppointment = {
    id: 'appt-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    slotId: 'slot-1',
    status: AppointmentStatus.PENDING,
    doctor: {
      fullName: 'Dr. Smith',
      userId: 'user-doctor-1',
      consultationFee: 500,
    },
  };

  const mockPayment = {
    id: 'payment-1',
    appointmentId: 'appt-1',
    amount: 500,
    status: 'PAID',
  };

  const mockTx = {
    availabilitySlot: {
      findUnique: jest.fn().mockResolvedValue(mockSlot),
      update: jest.fn().mockResolvedValue({ ...mockSlot, status: SlotStatus.BOOKED }),
    },
    appointment: {
      create: jest.fn().mockResolvedValue(mockAppointment),
    },
    payment: {
      create: jest.fn().mockResolvedValue(mockPayment),
    },
  };

  const mockPrismaService = {
    patientProfile: {
      findUnique: jest.fn().mockResolvedValue({ id: 'patient-1', fullName: 'Jane Doe' }),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(async (cb) => cb(mockTx));
    mockPrismaService.patientProfile.findUnique.mockResolvedValue({ id: 'patient-1', fullName: 'Jane Doe' });
    mockTx.availabilitySlot.findUnique.mockResolvedValue(mockSlot);
    mockTx.appointment.create.mockResolvedValue(mockAppointment);
    mockTx.payment.create.mockResolvedValue(mockPayment);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should auto-create a PAID payment when consultationFee > 0', async () => {
      await service.create('user-patient-1', { slotId: 'slot-1' });

      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          amount: 500,
          status: 'PAID',
        },
      });
    });

    it('should auto-create a WAIVED payment when consultationFee is null', async () => {
      mockTx.appointment.create.mockResolvedValue({
        ...mockAppointment,
        doctor: { ...mockAppointment.doctor, consultationFee: null },
      });

      await service.create('user-patient-1', { slotId: 'slot-1' });

      expect(mockTx.payment.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appt-1',
          amount: 0,
          status: 'WAIVED',
        },
      });
    });

    it('should throw NotFoundException when patient profile not found', async () => {
      mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-patient-1', { slotId: 'slot-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
npm test -- --testPathPattern=appointments.service
```

Expected: FAIL — `payment.create` is not called yet, and `Payment` model doesn't exist.

- [ ] **Step 3: Add PaymentStatus enum and Payment model to schema**

In `backend/prisma/schema.prisma`, add the `PaymentStatus` enum after `NotificationType`:

```prisma
enum PaymentStatus {
  PENDING
  PAID
  WAIVED
}
```

Add the `Payment` model after `RecommendationLog`:

```prisma
model Payment {
  id            String        @id @default(cuid())
  appointmentId String        @unique @map("appointment_id")
  appointment   Appointment   @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  amount        Float
  currency      String        @default("PHP")
  status        PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@index([appointmentId])
  @@map("payments")
}
```

Inside the existing `Appointment` model, add after `medicalRecord`:

```prisma
payment      Payment?
```

- [ ] **Step 4: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_payment_model
```

Expected: migration created and applied.

- [ ] **Step 5: Auto-create Payment inside the appointment transaction**

In `backend/src/appointments/appointments.service.ts`, update the `create()` method. Inside the `$transaction` callback, add payment creation after `tx.appointment.create`:

```typescript
const newAppointment = await tx.appointment.create({
  data: {
    patientId: patientProfile.id,
    doctorId: slot.doctorId,
    slotId: slot.id,
    reasonForVisit: createAppointmentDto.reasonForVisit,
    status: AppointmentStatus.PENDING,
  },
  include: {
    doctor: {
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    },
  },
});

const fee = newAppointment.doctor.consultationFee ?? 0;
await tx.payment.create({
  data: {
    appointmentId: newAppointment.id,
    amount: fee,
    status: fee > 0 ? 'PAID' : 'WAIVED',
  },
});

return newAppointment;
```

Note: rename the existing `return tx.appointment.create(...)` to `const newAppointment = await tx.appointment.create(...)` and add `return newAppointment` at the end of the transaction callback.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend
npm test -- --testPathPattern=appointments.service
```

Expected: all 4 tests pass.

- [ ] **Step 7: Run full suite**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ src/appointments/
git commit -m "feat: add Payment model and auto-create payment on appointment booking (Phase 2.2)"
```

---

## Task 7 — Phase 2.3: Review Model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add Review model to schema**

In `backend/prisma/schema.prisma`, add after the `Payment` model:

```prisma
model Review {
  id            String         @id @default(cuid())
  appointmentId String         @unique @map("appointment_id")
  appointment   Appointment    @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientId     String         @map("patient_id")
  patient       PatientProfile @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctorId      String         @map("doctor_id")
  doctor        DoctorProfile  @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  rating        Int
  comment       String?
  isVisible     Boolean        @default(true) @map("is_visible")
  createdAt     DateTime       @default(now()) @map("created_at")

  @@index([doctorId])
  @@index([patientId])
  @@map("reviews")
}
```

Add back-relations to existing models:

Inside `Appointment` model (after `payment`):
```prisma
review        Review?
```

Inside `PatientProfile` model (after `recommendationLogs`):
```prisma
reviews       Review[]
```

Inside `DoctorProfile` model (after `medicalRecords`):
```prisma
reviews       Review[]
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_review_model
```

Expected: migration created and applied.

- [ ] **Step 3: Run tests**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Review model (Phase 2.3)"
```

---

## Task 8 — Phase 2.4: PatientMedicalHistory Model + Auto-Create

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/patients/patients.service.ts`
- Modify: `backend/src/patients/patients.service.spec.ts`

- [ ] **Step 1: Write failing test for auto-creation of medical history record**

In `backend/src/patients/patients.service.spec.ts`, add inside the existing `describe('create', ...)` block:

```typescript
it('should create a PatientMedicalHistory record alongside the patient profile', async () => {
  const userId = 'user123';
  const dto = {
    fullName: 'John Doe',
    birthdate: '1990-01-01',
    contactDetails: 'john@example.com',
  };
  const expectedResult = {
    id: 'profile123',
    userId,
    fullName: dto.fullName,
    birthdate: new Date(dto.birthdate),
    medicalHistoryRecord: { id: 'history-1' },
  };
  mockPrismaService.patientProfile.findUnique.mockResolvedValue(null);
  mockPrismaService.patientProfile.create.mockResolvedValue(expectedResult);

  const result = await service.create(userId, dto as any);

  expect(mockPrismaService.patientProfile.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        medicalHistoryRecord: { create: {} },
      }),
    }),
  );
  expect(result).toEqual(expectedResult);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
npm test -- --testPathPattern=patients.service
```

Expected: FAIL — `medicalHistoryRecord` not included in the create call.

- [ ] **Step 3: Add PatientMedicalHistory model to schema**

In `backend/prisma/schema.prisma`, add after the `Review` model:

```prisma
model PatientMedicalHistory {
  id                  String         @id @default(cuid())
  patientId           String         @unique @map("patient_id")
  patient             PatientProfile @relation(fields: [patientId], references: [id], onDelete: Cascade)
  bloodType           String?        @map("blood_type")
  allergies           String[]
  chronicConditions   String[]       @map("chronic_conditions")
  currentMedications  String[]       @map("current_medications")
  pastSurgeries       String?        @map("past_surgeries")
  familyHistory       String?        @map("family_history")
  smokingStatus       String?        @map("smoking_status")
  updatedAt           DateTime       @updatedAt @map("updated_at")

  @@map("patient_medical_histories")
}
```

Inside the `PatientProfile` model, add after `recommendationLogs`:

```prisma
medicalHistoryRecord PatientMedicalHistory?
```

Do NOT remove `medicalHistory String?` from `PatientProfile`.

- [ ] **Step 4: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_patient_medical_history_model
```

Expected: migration created and applied.

- [ ] **Step 5: Auto-create PatientMedicalHistory on patient registration**

In `backend/src/patients/patients.service.ts`, update the `create()` method:

```typescript
async create(userId: string, createPatientDto: CreatePatientDto) {
  const existingProfile = await this.prisma.patientProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    throw new ConflictException('Patient profile already exists for this user');
  }

  return this.prisma.patientProfile.create({
    data: {
      ...createPatientDto,
      birthdate: new Date(createPatientDto.birthdate),
      user: { connect: { id: userId } },
      medicalHistoryRecord: { create: {} },
    },
  });
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
cd backend
npm test -- --testPathPattern=patients.service
```

Expected: all tests pass including the new one.

- [ ] **Step 7: Run full suite**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/ src/patients/
git commit -m "feat: add PatientMedicalHistory model and auto-create on patient registration (Phase 2.4)"
```

---

## Task 9 — Phase 3.1: languagesSpoken String → String[]

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/seed.ts`
- Modify: `backend/src/doctors/dto/create-doctor.dto.ts`
- Modify: `backend/src/doctors/dto/create-doctor-profile.dto.ts`
- Modify: `frontend/src/types/api.ts`
- Modify: `frontend/src/app/doctors/[id]/page.tsx`
- Modify: `frontend/src/app/doctor/profile/page.tsx`
- Modify: `frontend/src/app/onboarding/doctor/4/page.tsx`
- Modify: `frontend/src/components/doctors/use-doctor-discovery.ts`
- Modify: `frontend/src/components/doctors/DoctorCard.tsx`

- [ ] **Step 1: Change languagesSpoken to String[] in schema**

In `backend/prisma/schema.prisma`, inside `DoctorProfile`, replace:
```prisma
languagesSpoken     String?  @map("languages_spoken")
```
With:
```prisma
languagesSpoken     String[] @map("languages_spoken")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name change_languages_spoken_to_array
```

Expected: migration created and applied. (No raw SQL needed — DB was reset in pre-flight, column is empty.)

- [ ] **Step 3: Update backend DTOs**

In `backend/src/doctors/dto/create-doctor.dto.ts`, replace the `languagesSpoken` field:

```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
languagesSpoken?: string[];
```

Add `IsArray` to the import: `import { IsString, IsOptional, IsNumber, Min, MaxLength, IsDateString, IsArray } from 'class-validator';`

In `backend/src/doctors/dto/create-doctor-profile.dto.ts`, replace the `languagesSpoken` field:

```typescript
@IsOptional()
@IsArray()
@IsString({ each: true })
languagesSpoken?: string[];
```

Add `IsArray` to the import: `import { IsString, IsOptional, IsNumber, IsUrl, Min, IsDateString, IsArray } from 'class-validator';`

- [ ] **Step 4: Update seed.ts**

In `backend/prisma/seed.ts`, inside the doctor creation loop, replace:
```typescript
languagesSpoken: faker.helpers.arrayElements(['English', 'Spanish', 'French', 'German', 'Mandarin'], { min: 1, max: 3 }).join(', '),
```
With:
```typescript
languagesSpoken: faker.helpers.arrayElements(['English', 'Spanish', 'French', 'German', 'Mandarin'], { min: 1, max: 3 }),
```

- [ ] **Step 5: Update frontend API type**

In `frontend/src/types/api.ts`, replace:
```typescript
languagesSpoken?: string;
```
With:
```typescript
languagesSpoken?: string[];
```

- [ ] **Step 6: Update DoctorCard component**

In `frontend/src/components/doctors/DoctorCard.tsx`, replace lines 26-27:
```typescript
const languages = doctor.languagesSpoken
  ? doctor.languagesSpoken.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
```
With:
```typescript
const languages = doctor.languagesSpoken ?? [];
```

- [ ] **Step 7: Update use-doctor-discovery hook**

In `frontend/src/components/doctors/use-doctor-discovery.ts`, replace the language set building (around lines 59-60):
```typescript
if (d.languagesSpoken) {
  d.languagesSpoken.split(",").forEach((l) => langs.add(l.trim()));
}
```
With:
```typescript
if (d.languagesSpoken && d.languagesSpoken.length > 0) {
  d.languagesSpoken.forEach((l) => langs.add(l.trim()));
}
```

Replace the language filter (around lines 88-89):
```typescript
if (!d.languagesSpoken) return false;
const dLangs = d.languagesSpoken.split(",").map((l) => l.trim().toLowerCase());
```
With:
```typescript
if (!d.languagesSpoken || d.languagesSpoken.length === 0) return false;
const dLangs = d.languagesSpoken.map((l) => l.toLowerCase());
```

- [ ] **Step 8: Update doctor profile page (existing profile edit)**

In `frontend/src/app/doctor/profile/page.tsx`:

Line 18 — update the type annotation:
```typescript
languagesSpoken?: string[] | null;
```

Line 53 — update the state initialization:
```typescript
setLanguagesSpoken(data.languagesSpoken?.join(', ') ?? '');
```

Line 78 — update the save call to split back to array:
```typescript
languagesSpoken: languagesSpoken.trim()
  ? languagesSpoken.split(',').map((s) => s.trim()).filter(Boolean)
  : [],
```

The local state (`useState<string>`) and the text input stay unchanged — the field accepts comma-separated input.

- [ ] **Step 9: Update doctor onboarding final submission**

In `frontend/src/app/onboarding/doctor/4/page.tsx`, update the `apiRequest` body to convert `languagesSpoken` from comma string to array at submission time:

```typescript
const response = await apiRequest<{ profileComplete: boolean }>('/doctors/profile', {
  method: 'POST',
  body: {
    ...data,
    languagesSpoken: data.languagesSpoken
      ? data.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [],
  },
  token: session.user.accessToken as string,
});
```

- [ ] **Step 10: Update doctors/[id] page rendering**

In `frontend/src/app/doctors/[id]/page.tsx`, replace lines 283-292 (the existing `Languages` section):

```tsx
{doctor.languagesSpoken && (
  <section>
    <h3 className="text-xl font-bold text-text-primary mb-3">
      Languages
    </h3>
    <p className="text-on-surface-variant">
      {doctor.languagesSpoken}
    </p>
  </section>
)}
```

With:

```tsx
{doctor.languagesSpoken && doctor.languagesSpoken.length > 0 && (
  <section>
    <h3 className="text-xl font-bold text-text-primary mb-3">
      Languages
    </h3>
    <p className="text-on-surface-variant">
      {doctor.languagesSpoken.join(', ')}
    </p>
  </section>
)}
```

- [ ] **Step 11: Run backend tests**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 12: Verify frontend TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 13: Commit**

```bash
git add backend/prisma/ backend/src/doctors/dto/ frontend/src/
git commit -m "feat: convert languagesSpoken from String to String[] in schema, DTOs, and frontend (Phase 3.1)"
```

---

## Task 10 — Phase 4: Specialization Data Migration Script

**Files:**
- Create: `backend/scripts/migrate-specializations.ts`
- Modify: `backend/src/doctors/doctors.service.ts`
- Modify: `backend/src/doctors/doctors.service.spec.ts`

> Only run this phase after Phase 2.1 (Specialization table exists) and the seed has been run.

- [ ] **Step 1: Write a failing test for the updated specialization search**

In `backend/src/doctors/doctors.service.spec.ts`, add inside `describe('searchAll', ...)`:

```typescript
it('should filter by specialization via junction table when specialization query given', async () => {
  mockPrismaService.doctorProfile.findMany.mockResolvedValue([]);

  await service.searchAll(undefined, 'cardiology');

  expect(mockPrismaService.doctorProfile.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        specializations: {
          some: {
            specialization: {
              name: { contains: 'cardiology', mode: 'insensitive' },
            },
          },
        },
      }),
    }),
  );
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend
npm test -- --testPathPattern=doctors.service
```

Expected: FAIL — current filter uses `where.specialization = { contains: ... }`.

- [ ] **Step 3: Create the data migration script**

Create `backend/scripts/migrate-specializations.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const doctors = await prisma.doctorProfile.findMany({
    select: { id: true, specialization: true },
  });

  for (const doctor of doctors) {
    if (!doctor.specialization) continue;

    const spec = await prisma.specialization.upsert({
      where: { name: doctor.specialization },
      update: {},
      create: { name: doctor.specialization },
    });

    await prisma.doctorSpecialization.upsert({
      where: {
        doctorId_specializationId: {
          doctorId: doctor.id,
          specializationId: spec.id,
        },
      },
      update: {},
      create: {
        doctorId: doctor.id,
        specializationId: spec.id,
        isPrimary: true,
      },
    });
  }

  console.log(`Migrated ${doctors.length} doctor specializations.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run the data migration script**

```bash
cd backend
npx ts-node scripts/migrate-specializations.ts
```

Expected: "Migrated N doctor specializations." (N = number of seeded doctors, e.g., 20).

- [ ] **Step 5: Update searchAll to use the junction table**

In `backend/src/doctors/doctors.service.ts`, update `searchAll`:

```typescript
async searchAll(search?: string, specialization?: string) {
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

  return this.prisma.doctorProfile.findMany({
    where,
    include: {
      availabilitySlots: true,
    },
  });
}
```

- [ ] **Step 6: Mark the old specialization field as deprecated in schema**

In `backend/prisma/schema.prisma`, inside `DoctorProfile`, add a comment above `specialization String`:

```prisma
// @deprecated — use DoctorSpecialization relation instead.
specialization      String
```

No migration needed — this is a schema comment only.

- [ ] **Step 7: Run tests to confirm they pass**

```bash
cd backend
npm test -- --testPathPattern=doctors.service
```

Expected: all tests pass including the junction table filter test.

- [ ] **Step 8: Run full suite**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
cd backend
git add scripts/migrate-specializations.ts prisma/schema.prisma src/doctors/
git commit -m "feat: migrate specializations to junction table and update discovery filter (Phase 4)"
```

---

## Task 11 — Phase 5.1: Prescription Model

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add Prescription model to schema**

In `backend/prisma/schema.prisma`, add after `PatientMedicalHistory`:

```prisma
model Prescription {
  id              String        @id @default(cuid())
  medicalRecordId String        @map("medical_record_id")
  medicalRecord   MedicalRecord @relation(fields: [medicalRecordId], references: [id], onDelete: Cascade)
  drugName        String        @map("drug_name")
  dosage          String
  frequency       String
  durationDays    Int?          @map("duration_days")
  instructions    String?
  issuedAt        DateTime      @default(now()) @map("issued_at")

  @@index([medicalRecordId])
  @@map("prescriptions")
}
```

Inside the `MedicalRecord` model, add after `followUpAdvice`:

```prisma
prescriptions   Prescription[]
```

Keep `MedicalRecord.prescription String?` — do not remove it.

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_prescription_model
```

Expected: migration created and applied.

- [ ] **Step 3: Run tests**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add structured Prescription model (Phase 5.1)"
```

---

## Task 12 — Phase 5.2: Follow-up Appointment Link

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add follow-up link fields to MedicalRecord and Appointment**

In `backend/prisma/schema.prisma`, inside `MedicalRecord`, add after `followUpAdvice`:

```prisma
followUpAppointmentId String?      @map("follow_up_appointment_id")
followUpAppointment   Appointment? @relation("FollowUpAppointment", fields: [followUpAppointmentId], references: [id], onDelete: SetNull)
```

Inside `Appointment`, add after `review`:

```prisma
followUpFor   MedicalRecord? @relation("FollowUpAppointment")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_followup_appointment_link
```

Expected: migration created and applied.

- [ ] **Step 3: Run full test suite**

```bash
cd backend
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Verify Prisma generate is clean**

```bash
cd backend
npx prisma generate
npx prisma migrate status
```

Expected: zero errors, all migrations Applied.

- [ ] **Step 5: Final seed verification**

```bash
cd backend
npx prisma db seed
```

Expected: all seed steps complete without errors.

- [ ] **Step 6: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add follow-up appointment link to MedicalRecord (Phase 5.2)"
```

---

## Final Checklist

- [ ] `npx prisma generate` — zero errors
- [ ] `npx prisma migrate status` — all migrations Applied
- [ ] `npm test` — all tests pass
- [ ] `npx tsc --noEmit` (frontend) — zero type errors
- [ ] `isActive: true, isVerified: true` present in `doctors.service.ts searchAll()` where clause
- [ ] `PatientMedicalHistory` auto-created on new patient registration
- [ ] `Payment` auto-created inside appointment transaction
- [ ] `NotificationType` enum used in all three notification call sites
- [ ] `languagesSpoken` is `String[]` in schema, DTOs, and all frontend files
- [ ] `specializations` junction table filter active in `searchAll()`
- [ ] Specialization data migration script run and `doctor_specializations` table populated
