import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PatientProfilePage from './page';

function patchCallFor(path: string) {
  const calls = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit?][] } }).mock.calls;
  return calls.find(([url, opts]) => String(url).includes(path) && opts?.method === 'PATCH');
}

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'PATIENT' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const profileFixture = {
  fullName: 'Juan Dela Cruz',
  birthdate: '1990-05-15T00:00:00.000Z',
  contactDetails: '09171234567',
  weight: 70,
  height: 175,
  profilePictureUrl: null,
  address: '123 Rizal St',
  city: 'Makati',
  region: 'NCR',
  philhealthId: '',
  hmoProvider: 'Maxicare',
  hmoCardNo: '',
  medicalHistoryRecord: {
    bloodType: 'O+',
    smokingStatus: 'Never',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
    currentMedications: ['Losartan'],
    pastSurgeries: '',
    familyHistory: '',
  },
};

function routeFetch(url: string) {
  if (url.includes('/patients/profile')) return profileFixture;
  if (url.includes('/appointments/patient')) return [];
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

describe('PatientProfilePage', () => {
  it('renders all three sections once the profile loads', async () => {
    render(<PatientProfilePage />);
    expect(await screen.findByText('My Profile')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Location & Insurance/)).toBeInTheDocument());
    expect(screen.getByText('Medical History')).toBeInTheDocument();
  });

  it('shows fetched values in read-only view mode', async () => {
    render(<PatientProfilePage />);
    await screen.findByText(/Location & Insurance/);
    expect(screen.getByText('+63 917 123 4567')).toBeInTheDocument(); // identity contact
    expect(screen.getByText('Maxicare')).toBeInTheDocument(); // insurance
    expect(screen.getByText('O+')).toBeInTheDocument(); // blood type pill
    expect(screen.getByText('Hypertension')).toBeInTheDocument(); // chronic condition
    expect(screen.getByText('Penicillin')).toBeInTheDocument(); // allergy
  });

  it('edits a field and PATCHes both profile and medical-history on save', async () => {
    render(<PatientProfilePage />);
    await screen.findByText(/Location & Insurance/);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Maria Edited' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Cebu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(screen.getByText('Profile updated successfully.')).toBeInTheDocument());

    const profilePatch = patchCallFor('/patients/profile');
    expect(profilePatch).toBeTruthy();
    const body = JSON.parse(String(profilePatch![1]!.body));
    expect(body.fullName).toBe('Maria Edited');
    expect(body.city).toBe('Cebu');
    expect(patchCallFor('/patients/medical-history')).toBeTruthy();
  });

  it('reverts edits when Discard is clicked', async () => {
    render(<PatientProfilePage />);
    await screen.findByText(/Location & Insurance/);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Temp Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard Changes' }));

    // Back in read mode, and re-entering edit shows the original value.
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Juan Dela Cruz');
  });
});
