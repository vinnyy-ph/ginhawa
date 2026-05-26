# Auth Architecture Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate two competing auth systems in the frontend by creating middleware, rewriting doctor onboarding to use NextAuth, and removing duplicate/legacy code.

**Architecture:** Use NextAuth with Next.js middleware for route protection. Ensure all API calls route through the standardized `apiRequest` utility with the NextAuth session token, removing any legacy `localStorage` usage.

**Tech Stack:** Next.js 16 (App Router), TypeScript, NextAuth v4, Tailwind CSS v4, Radix UI

---

### Task 1: Create `frontend/src/middleware.ts`

**Files:**
- Create: `frontend/src/middleware.ts`

- [ ] **Step 1: Write the middleware implementation**

```typescript
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Public routes
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/signup/doctor' ||
    pathname === '/for-doctors' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // Not authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = token.role;

  // Doctor-only routes
  const isDoctorRoute = pathname === '/doctor/dashboard' || pathname.startsWith('/doctor/');
  
  // Patient-only routes
  const isPatientRoute = 
    pathname === '/dashboard' || 
    pathname.startsWith('/dashboard/') || 
    pathname.startsWith('/onboarding/') || 
    pathname.startsWith('/book/') || 
    pathname === '/doctors' || 
    pathname.startsWith('/doctors/') || 
    pathname.startsWith('/recommendations');

  if (role === 'PATIENT' && isDoctorRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (role === 'DOCTOR' && isPatientRoute) {
    return NextResponse.redirect(new URL('/doctor/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### Task 2: Rewrite Doctor Onboarding (`/onboarding/doctor`)

**Files:**
- Modify: `frontend/src/app/onboarding/doctor/page.tsx`

- [ ] **Step 1: Replace the entire contents of the onboarding page with the NextAuth and design system compliant version**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiRequest } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Toast } from '@/components/ui/toast';

export default function DoctorOnboarding() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [formData, setFormData] = useState({
    fullName: '',
    professionalTitle: '',
    specialization: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'error' | 'success' } | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.professionalTitle.trim()) newErrors.professionalTitle = 'Professional Title is required';
    if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
    if (!formData.bio.trim()) newErrors.bio = 'Short Bio is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await apiRequest<{ profileComplete: boolean }>('/api/doctors/profile', {
        method: 'POST',
        body: formData,
        token: session?.accessToken as string,
      });

      if (response.profileComplete) {
        router.push('/doctor/dashboard');
      }
    } catch (error) {
      console.error('Failed to save profile', error);
      setToast({ message: 'Failed to save profile. Please try again.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Doctor Profile</CardTitle>
          <CardDescription>Tell us about your professional background.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField id="fullName" label="Full Name" error={errors.fullName} required>
              <input 
                id="fullName"
                placeholder="Full Name" 
                className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error"
                value={formData.fullName} 
                onChange={e => setFormData({...formData, fullName: e.target.value})} 
              />
            </FormField>
            <FormField id="professionalTitle" label="Professional Title (e.g. MD)" error={errors.professionalTitle} required>
              <input 
                id="professionalTitle"
                placeholder="Professional Title" 
                className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error"
                value={formData.professionalTitle} 
                onChange={e => setFormData({...formData, professionalTitle: e.target.value})} 
              />
            </FormField>
            <FormField id="specialization" label="Specialization" error={errors.specialization} required>
              <input 
                id="specialization"
                placeholder="Specialization" 
                className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error"
                value={formData.specialization} 
                onChange={e => setFormData({...formData, specialization: e.target.value})} 
              />
            </FormField>
            <FormField id="bio" label="Short Bio" error={errors.bio} required>
              <textarea 
                id="bio"
                placeholder="Short Bio" 
                className="w-full rounded-md border border-outline-variant bg-surface-white px-3 py-2.5 text-sm text-on-surface font-manrope placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error"
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
              />
            </FormField>
            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Saving...
                </span>
              ) : (
                'Save Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      {toast && (
        <Toast 
          message={toast.message} 
          variant={toast.variant} 
          onDismiss={() => setToast(null)} 
        />
      )}
    </div>
  );
}
```

---

### Task 3: Fix Doctor Signup API Path (`/signup/doctor`)

**Files:**
- Modify: `frontend/src/app/signup/doctor/page.tsx`

- [ ] **Step 1: Update API call path**
Update `frontend/src/app/signup/doctor/page.tsx`. Find the `apiRequest` call that hits `/auth/register` and replace it with `/api/auth/register`.

```typescript
// Replace this block starting around line 33:
      await apiRequest<{ access_token: string; user: { id: string; email: string; role: string } }>(
        '/auth/register',
        {
          method: 'POST',
          body: { email: values.email, password: values.password, role: 'DOCTOR' },
        },
      );

// With:
      await apiRequest<{ access_token: string; user: { id: string; email: string; role: string } }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: { email: values.email, password: values.password, role: 'DOCTOR' },
        },
      );
```

---

### Task 4: Delete Duplicate Doctor Dashboard

**Files:**
- Delete: `frontend/src/app/dashboard/doctor/`

- [ ] **Step 1: Delete the duplicate doctor dashboard directory**
```bash
rm -rf frontend/src/app/dashboard/doctor/
```
