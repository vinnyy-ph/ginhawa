import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import DoctorProfilePage from './page';

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <DoctorProfilePage params={Promise.resolve({ id: 'doc1' })} />
      </Suspense>,
    );
  });
}

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'PATIENT' } }, status: 'authenticated' }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/doctors/doc1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const doctorFixture = {
  id: 'doc1',
  fullName: 'Maria Santos',
  professionalTitle: 'Dr.',
  specialization: 'Cardiology',
  isVerified: true,
  avgRating: 4.8,
  reviewCount: 24,
  yearsOfExperience: 12,
  consultationFee: 1500,
  city: 'Manila',
  region: 'NCR',
  profilePictureUrl: null,
  availabilitySlots: [],
};

function stubFetch(doctorOk = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.includes('/slots')) return jsonResponse([]);
      if (url.includes('/reviews/doctor/')) return jsonResponse([]);
      if (url.includes('/doctors/')) return jsonResponse(doctorFixture, doctorOk);
      return jsonResponse([]);
    }),
  );
}

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 404,
    json: () => Promise.resolve(data),
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DoctorProfilePage', () => {
  beforeEach(() => stubFetch());

  it('renders the doctor hero with name, specialization and stats', async () => {
    await renderPage();
    expect(await screen.findByRole('heading', { name: /Maria Santos/i })).toBeInTheDocument();
    expect(screen.getByText(/Cardiology/)).toBeInTheDocument();
    expect(screen.getByText('★ 4.8')).toBeInTheDocument();
    expect(screen.getByText('12+ yrs')).toBeInTheDocument();
    expect(screen.getByText('₱1,500')).toBeInTheDocument();
  });

  it('renders the booking panel heading for an authenticated patient', async () => {
    await renderPage();
    expect(await screen.findByRole('heading', { name: /Book Appointment/i })).toBeInTheDocument();
  });

  it('renders the error state when the doctor fails to load', async () => {
    vi.unstubAllGlobals();
    stubFetch(false);
    await renderPage();
    expect(await screen.findByText('Profile Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Directory/i })).toBeInTheDocument();
  });
});
