import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DoctorProfilePage from './page';

function patchCallFor(path: string) {
  const calls = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
  return calls.find(([url, opts]) => String(url).includes(path) && opts?.method === 'PATCH');
}

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

  it('edits fields and PATCHes the doctor profile on save', async () => {
    render(<DoctorProfilePage />);
    await screen.findByText('Practice Details');

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Dr. Maria Edited' } });
    fireEvent.change(screen.getByLabelText('Consultation fee (₱)'), { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument());

    const patch = patchCallFor('/doctors/profile');
    expect(patch).toBeTruthy();
    const body = JSON.parse(String(patch![1]!.body));
    expect(body.fullName).toBe('Dr. Maria Edited');
    expect(body.consultationFee).toBe(750);
  });

  it('reverts edits when Discard is clicked', async () => {
    render(<DoctorProfilePage />);
    await screen.findByText('Practice Details');

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Temp Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }));

    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Dr. Maria Santos');
  });
});
