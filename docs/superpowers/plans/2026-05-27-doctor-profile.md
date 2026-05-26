# Doctor Profile & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up signup routes and implement the doctor profile creation flow with idempotency and deferred availability setup.

**Architecture:** The frontend register route will be removed in favor of a clean "signup" terminology. The backend will expose a POST endpoint for doctor profile creation. Onboarding is a two-step flow: signup (account) -> onboarding (profile) -> dashboard (availability).

**Tech Stack:** Next.js (React), Tailwind CSS, NestJS, Prisma

---

### Task 1: Clean Up Frontend Routing & Terminology

**Files:**
- Delete: `frontend/src/app/auth/register`
- Modify: `frontend/src/components/` (any components using "Register")

- [ ] **Step 1: Delete the register directory**

```bash
rm -rf frontend/src/app/auth/register
```

- [ ] **Step 2: Find "Register" text in frontend components and replace with "Sign Up"**

Search the frontend for components with "Register". E.g., `grep -rn "Register" frontend/src/`. Replace the UI text with "Sign Up" and any hrefs pointing to `/auth/register` to `/signup`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src
git commit -m "refactor(frontend): replace register with sign up routing"
```

### Task 2: Backend Doctor Profile DTO & Service

**Files:**
- Create: `backend/src/doctors/dto/create-doctor-profile.dto.ts`
- Modify: `backend/src/doctors/doctors.service.ts`
- Modify: `backend/src/doctors/doctors.service.spec.ts`

- [ ] **Step 1: Write DTO**

```typescript
// backend/src/doctors/dto/create-doctor-profile.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class CreateDoctorProfileDto {
  @IsString()
  fullName: string;

  @IsString()
  professionalTitle: string;

  @IsString()
  specialization: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
```

- [ ] **Step 2: Write failing test in doctors.service.spec.ts**

Update `backend/src/doctors/doctors.service.spec.ts` to test `upsertProfile`.

```typescript
// Add inside describe('DoctorsService')
describe('upsertProfile', () => {
  it('should create or return existing profile and set profileComplete', async () => {
    const userId = 'user-1';
    const dto = { fullName: 'Dr. John', professionalTitle: 'MD', specialization: 'General', bio: 'Hello' };
    
    // Mock prisma.doctorProfile.upsert
    prismaService.doctorProfile.upsert = jest.fn().mockResolvedValue({ ...dto, userId, id: 'profile-1' });

    const result = await service.upsertProfile(userId, dto);
    
    expect(result.profileComplete).toBe(true);
    expect(result.profile.fullName).toBe('Dr. John');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm run test -- doctors.service.spec.ts`
Expected: FAIL (upsertProfile is not a function)

- [ ] **Step 4: Implement upsertProfile in doctors.service.ts**

```typescript
// Add to backend/src/doctors/doctors.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async upsertProfile(userId: string, dto: CreateDoctorProfileDto) {
    const profile = await this.prisma.doctorProfile.upsert({
      where: { userId },
      update: {}, // idempotent
      create: {
        userId,
        fullName: dto.fullName,
        professionalTitle: dto.professionalTitle,
        specialization: dto.specialization,
        bio: dto.bio,
      },
    });

    return {
      profileComplete: true,
      profile,
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm run test -- doctors.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/doctors
git commit -m "feat(backend): add doctors service logic for profile upsert"
```

### Task 3: Backend Doctor Profile Controller

**Files:**
- Modify: `backend/src/doctors/doctors.controller.ts`
- Modify: `backend/src/doctors/doctors.controller.spec.ts`

- [ ] **Step 1: Write failing test for controller**

```typescript
// Add to backend/src/doctors/doctors.controller.spec.ts
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';

describe('createProfile', () => {
  it('should call service and return result', async () => {
    const dto: CreateDoctorProfileDto = { fullName: 'Jane', professionalTitle: 'DO', specialization: 'Pediatrics' };
    const req = { user: { userId: 'user-1' } };

    doctorsService.upsertProfile = jest.fn().mockResolvedValue({ profileComplete: true });

    const result = await controller.createProfile(req, dto);
    expect(result.profileComplete).toBe(true);
    expect(doctorsService.upsertProfile).toHaveBeenCalledWith('user-1', dto);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm run test -- doctors.controller.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement controller endpoint**

```typescript
// Add to backend/src/doctors/doctors.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assume this exists

@Controller('api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async createProfile(@Request() req, @Body() dto: CreateDoctorProfileDto) {
    return this.doctorsService.upsertProfile(req.user.userId, dto);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm run test -- doctors.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/doctors
git commit -m "feat(backend): expose POST /api/doctors/profile endpoint"
```

### Task 4: Frontend Onboarding Page

**Files:**
- Create: `frontend/src/app/onboarding/doctor/page.tsx`

- [ ] **Step 1: Create the onboarding page**

```tsx
// frontend/src/app/onboarding/doctor/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DoctorOnboarding() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    professionalTitle: '',
    specialization: '',
    bio: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use the stored JWT token
    const token = localStorage.getItem('token'); 
    
    const res = await fetch('http://localhost:3001/api/doctors/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.profileComplete) {
        router.push('/dashboard/doctor');
      }
    } else {
      console.error('Failed to save profile');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">Complete Your Doctor Profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          placeholder="Full Name" 
          required 
          className="border p-2 rounded"
          value={formData.fullName} 
          onChange={e => setFormData({...formData, fullName: e.target.value})} 
        />
        <input 
          placeholder="Professional Title (e.g. MD)" 
          required 
          className="border p-2 rounded"
          value={formData.professionalTitle} 
          onChange={e => setFormData({...formData, professionalTitle: e.target.value})} 
        />
        <input 
          placeholder="Specialization" 
          required 
          className="border p-2 rounded"
          value={formData.specialization} 
          onChange={e => setFormData({...formData, specialization: e.target.value})} 
        />
        <textarea 
          placeholder="Short Bio" 
          className="border p-2 rounded"
          value={formData.bio} 
          onChange={e => setFormData({...formData, bio: e.target.value})} 
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded">
          Save Profile
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/onboarding
git commit -m "feat(frontend): add doctor onboarding profile form"
```

### Task 5: Dashboard Availability Nudge

**Files:**
- Modify: `frontend/src/app/dashboard/doctor/page.tsx`

- [ ] **Step 1: Update dashboard to check profileComplete and nudge**

```tsx
// Modify frontend/src/app/dashboard/doctor/page.tsx
'use client';
import { useEffect, useState } from 'react';

export default function DoctorDashboard() {
  const [needsAvailability, setNeedsAvailability] = useState(true);

  // In a real implementation you would check actual availability slot count from backend
  // For now, we simulate the post-onboarding state.
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Doctor Dashboard</h1>
      {needsAvailability && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p className="font-bold">Set your availability</p>
          <p>You cannot be booked by patients until you add available time slots.</p>
          <button className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded">Set Up Now</button>
        </div>
      )}
      <p>Dashboard content...</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/dashboard/doctor
git commit -m "feat(frontend): add availability nudge to doctor dashboard"
```
