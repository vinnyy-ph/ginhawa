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
  const { data: session, status } = useSession();
  
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
        token: session?.user?.accessToken as string,
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

  if (status === 'loading') {
    return (
      <div className="flex justify-center mt-20">
        <Spinner />
      </div>
    );
  }

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
