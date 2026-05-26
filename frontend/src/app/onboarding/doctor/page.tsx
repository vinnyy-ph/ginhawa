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
    // Use the stored JWT token (we'll fetch it from localStorage or next-auth depending on setup, 
    // assuming localStorage as per the basic MVP implementation plan)
    const token = localStorage.getItem('token'); 
    
    // In a Next.js app, usually we route through our own API or direct to backend depending on architecture.
    // The previous frontend auth routes used a helper 'apiRequest'. Let's fetch using standard fetch for now as planned.
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
