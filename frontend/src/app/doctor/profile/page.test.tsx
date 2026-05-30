import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DoctorProfilePage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'DOCTOR' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/doctor/profile',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const doctorFixture = {
  fullName: 'Dr. Maria Santos',
  professionalTitle: 'MD, FPCP',
  specialization: 'Cardiology',
  bio: 'Heart specialist with a patient-first approach',
  yearsOfExperience: 8,
  consultationFee: 500,
  languagesSpoken: ['English', 'Tagalog'],
  consultationFocusAreas: 'Hypertension, Preventive care',
  availabilitySummary: 'Weekdays 9 to 5',
  profilePictureUrl: null,
  prcLicenseNo: '0123456',
  prcLicenseExpiry: null,
  ptrNo: '12345678',
  region: 'NCR',
  city: 'Makati',
};

function routeFetch(url: string) {
  if (url.includes('/doctors/profile')) return doctorFixture;
  if (url.includes('/specializations')) return [{ id: '1', name: 'Cardiology' }, { id: '2', name: 'Pediatrics' }];
  if (url.includes('/appointments')) return [];
  if (url.includes('/notifications')) return [];
  return {};
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(routeFetch(String(input))),
      } as Response),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DoctorProfilePage', () => {
  it('renders all three sections once the profile loads', async () => {
    render(<DoctorProfilePage />);
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Practice Details')).toBeInTheDocument());
    expect(screen.getByText(/Credentials & Location/)).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('shows fetched professional details in read-only view mode', async () => {
    render(<DoctorProfilePage />);
    await screen.findByText('Practice Details');
    expect(screen.getByText('Heart specialist with a patient-first approach')).toBeInTheDocument();
    expect(screen.getByText('₱500')).toBeInTheDocument();
    expect(screen.getByText('8 years')).toBeInTheDocument();
    expect(screen.getByText('0123456')).toBeInTheDocument(); // PRC
    expect(screen.getByText('12345678')).toBeInTheDocument(); // PTR
    expect(screen.getByText('Makati')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Hypertension')).toBeInTheDocument(); // focus area
  });
});
