import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import DoctorPatientDetailPage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'DOCTOR', name: 'Maria', email: 'maria@x.com' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/doctor/patients/p1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const historyFixture = {
  patient: {
    fullName: 'Juan Dela Cruz',
    birthdate: '1990-01-01',
    phoneNumber: '09171234567',
    city: 'Manila',
    region: 'NCR',
    medicalHistory: 'Hypertension since 2018',
  },
  appointments: [
    {
      id: 'ap1',
      status: 'COMPLETED',
      slot: { startTime: '2026-05-20T03:00:00.000Z' },
      reasonForVisit: 'Chest pain follow-up',
      medicalRecord: {
        notes: 'BP stable, continue meds',
        recommendations: 'Low sodium diet',
        prescriptions: [],
      },
    },
    {
      id: 'ap2',
      status: 'PENDING',
      slot: { startTime: '2026-06-01T03:00:00.000Z' },
      reasonForVisit: 'Routine checkup',
    },
  ],
};

function stubFetch(ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      const body = url.includes('/appointments/doctor/patients/') ? historyFixture : [];
      return Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        json: () => Promise.resolve(ok ? body : { message: 'no' }),
      } as Response);
    }),
  );
}

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <DoctorPatientDetailPage params={Promise.resolve({ id: 'p1' })} />
      </Suspense>,
    );
  });
}

beforeEach(() => stubFetch());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DoctorPatientDetailPage', () => {
  it('renders the patient header and medical history', async () => {
    await renderPage();
    expect(await screen.findByRole('heading', { name: /Juan Dela Cruz/i })).toBeInTheDocument();
    expect(screen.getByText('Medical history')).toBeInTheDocument();
    expect(screen.getByText('Hypertension since 2018')).toBeInTheDocument();
  });

  it('renders the appointment history with filters and search', async () => {
    await renderPage();
    expect(await screen.findByText(/Appointment history/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search visits…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All/ })).toBeInTheDocument();
  });

  it('renders consultation details for completed visits', async () => {
    await renderPage();
    expect(await screen.findByText('Chest pain follow-up')).toBeInTheDocument();
    expect(screen.getByText("Doctor's notes")).toBeInTheDocument();
    expect(screen.getByText('BP stable, continue meds')).toBeInTheDocument();
  });

  it('renders the error state when the patient cannot be loaded', async () => {
    vi.unstubAllGlobals();
    stubFetch(false);
    await renderPage();
    expect(await screen.findByText(/Could not load this patient/)).toBeInTheDocument();
  });
});
