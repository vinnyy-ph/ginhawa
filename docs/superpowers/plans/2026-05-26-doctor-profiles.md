# Doctor Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend module for Doctor Profiles, enabling both self-management for doctors and public discovery for patients.

**Architecture:** A standard NestJS module with a controller and service interacting with the existing Prisma `DoctorProfile` schema. A mapping function guarantees sensitive data stripping on discovery routes.

**Tech Stack:** NestJS, TypeScript, Prisma, Jest, class-validator

---

### Task 1: DTOs and Data Mapping

**Files:**
- Create: `backend/src/doctors/dto/create-doctor.dto.ts`
- Create: `backend/src/doctors/dto/update-doctor.dto.ts`
- Create: `backend/src/doctors/dto/public-doctor.dto.ts`

- [ ] **Step 1: Write CreateDoctorDto**

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  fullName: string;

  @IsString()
  professionalTitle: string;

  @IsString()
  specialization: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  availabilitySummary?: string;

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  languagesSpoken?: string;

  @IsOptional()
  @IsString()
  consultationFocusAreas?: string;

  @IsOptional()
  @IsNumber()
  consultationFee?: number;
}
```

- [ ] **Step 2: Write UpdateDoctorDto**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}
```

- [ ] **Step 3: Write Public mapping function**

```typescript
import { DoctorProfile } from '@prisma/client';

export function toPublicDoctorProfile(profile: DoctorProfile) {
  const {
    userId,
    createdAt,
    updatedAt,
    ...publicFields
  } = profile;
  
  return publicFields;
}
```

- [ ] **Step 4: Commit DTOs**

```bash
git add backend/src/doctors/dto
git commit -m "feat: add doctor profile DTOs and mapping"
```

---

### Task 2: DoctorsService and Tests

**Files:**
- Create: `backend/src/doctors/doctors.service.ts`
- Create: `backend/src/doctors/doctors.service.spec.ts`

- [ ] **Step 1: Write Service tests**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: PrismaService,
          useValue: {
            doctorProfile: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run Service test**

Run: `npm run test -- doctors.service.spec.ts` in `backend` directory.
Expected: PASS (or fail if service not found yet)

- [ ] **Step 3: Write DoctorsService implementation**

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: CreateDoctorDto) {
    const existing = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Doctor profile already exists');
    }
    return this.prisma.doctorProfile.create({
      data: { ...data, userId },
    });
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }

  async update(userId: string, data: UpdateDoctorDto) {
    await this.findByUserId(userId);
    return this.prisma.doctorProfile.update({
      where: { userId },
      data,
    });
  }

  async findAllPublic(search?: string, specialization?: string) {
    const where: any = {};
    
    if (search) {
      where.fullName = { contains: search, mode: 'insensitive' };
    }
    
    if (specialization) {
      where.specialization = { contains: specialization, mode: 'insensitive' };
    }

    return this.prisma.doctorProfile.findMany({ where });
  }

  async findOnePublic(id: string) {
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }
}
```

- [ ] **Step 4: Verify test passes**

Run: `npm run test -- doctors.service.spec.ts` in `backend` directory.
Expected: PASS

- [ ] **Step 5: Commit Service**

```bash
git add backend/src/doctors/doctors.service*
git commit -m "feat: implement doctors service"
```

---

### Task 3: DoctorsController

**Files:**
- Create: `backend/src/doctors/doctors.controller.ts`

- [ ] **Step 1: Write Controller implementation**

```typescript
import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { toPublicDoctorProfile } from './dto/public-doctor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('profile')
  @Roles('DOCTOR')
  create(@Request() req: any, @Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(req.user.id, createDoctorDto);
  }

  @Get('profile')
  @Roles('DOCTOR')
  getProfile(@Request() req: any) {
    return this.doctorsService.findByUserId(req.user.id);
  }

  @Patch('profile')
  @Roles('DOCTOR')
  update(@Request() req: any, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(req.user.id, updateDoctorDto);
  }

  @Get()
  async findAll(@Query('search') search?: string, @Query('specialization') specialization?: string) {
    const profiles = await this.doctorsService.findAllPublic(search, specialization);
    return profiles.map(toPublicDoctorProfile);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const profile = await this.doctorsService.findOnePublic(id);
    return toPublicDoctorProfile(profile);
  }
}
```

- [ ] **Step 2: Commit Controller**

```bash
git add backend/src/doctors/doctors.controller.ts
git commit -m "feat: implement doctors controller"
```

---

### Task 4: DoctorsModule Integration

**Files:**
- Create: `backend/src/doctors/doctors.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write DoctorsModule**

```typescript
import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
```

- [ ] **Step 2: Update AppModule**

Modify `backend/src/app.module.ts` to import `DoctorsModule`. Ensure you add the import at the top, and put `DoctorsModule` inside the `imports` array of the `@Module` decorator.

- [ ] **Step 3: Run full backend build/tests**

Run: `npm run build` and `npm run test` inside `backend`.
Expected: Both complete without errors.

- [ ] **Step 4: Final commit**

```bash
git add backend/src/doctors/doctors.module.ts backend/src/app.module.ts
git commit -m "feat: integrate doctors module into app"
```
