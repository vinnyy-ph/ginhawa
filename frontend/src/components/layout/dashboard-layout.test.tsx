import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLayout } from './dashboard-layout';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', name: 'Ana Cruz', email: 'ana@x.com' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const patientProfile = {
  fullName: 'Ana Cruz',
  birthdate: '1990-01-01',
  contactDetails: '09171234567',
  profilePictureUrl: null,
  address: '123 Mabini St',
  city: 'Manila',
  region: 'NCR',
};

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      let body: unknown = [];
      if (url.includes('/patients/profile')) body = patientProfile;
      else if (url.includes('/appointments/patient')) body = [{ status: 'CONFIRMED' }, { status: 'PENDING' }];
      else if (url.includes('/notifications')) body = [{ readAt: null }, { readAt: '2026-01-01' }];
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
    }),
  );
}

beforeEach(() => stubFetch());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DashboardLayout', () => {
  it('renders the patient sidebar with identity, profile completion and nav', async () => {
    render(
      <DashboardLayout role="patient">
        <div>PATIENT_CHILD</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('PATIENT_CHILD')).toBeInTheDocument();
    expect(screen.getByText('Patient Portal')).toBeInTheDocument();
    expect(await screen.findByText('Ana Cruz')).toBeInTheDocument();
    expect(screen.getByText('86%')).toBeInTheDocument();
    expect(screen.getByText('AI Checker')).toBeInTheDocument();
  });

  it('renders the doctor sidebar with the doctor portal badge and nav', () => {
    render(
      <DashboardLayout role="doctor">
        <div>DOCTOR_CHILD</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('DOCTOR_CHILD')).toBeInTheDocument();
    expect(screen.getByText('Doctor Portal')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Overview/i }).length).toBeGreaterThan(0);
  });
});
