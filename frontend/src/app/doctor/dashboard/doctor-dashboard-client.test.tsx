import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DoctorDashboardClient } from './doctor-dashboard-client';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'DOCTOR', name: 'Maria Santos', email: 'maria@x.com' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/doctor/dashboard',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const todayNoon = new Date();
todayNoon.setHours(12, 0, 0, 0);
const start = todayNoon.toISOString();
const end = new Date(todayNoon.getTime() + 30 * 60 * 1000).toISOString();

const appointmentsFixture = [
  { id: 'ap1', status: 'CONFIRMED', slot: { startTime: start, endTime: end }, patient: { fullName: 'Juan Cruz' } },
  { id: 'ap2', status: 'PENDING', slot: { startTime: start, endTime: end }, patient: { fullName: 'Ana Lopez' } },
];

function stubFetch(data: unknown[] = appointmentsFixture) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      const body = url.includes('/appointments/doctor') ? data : [];
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
    }),
  );
}

beforeEach(() => stubFetch());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DoctorDashboardClient', () => {
  it('greets the signed-in doctor', async () => {
    render(<DoctorDashboardClient />);
    expect(await screen.findByRole('heading', { name: /Welcome back, Dr\. Maria Santos/i })).toBeInTheDocument();
  });

  it('shows the appointment stat cards', async () => {
    render(<DoctorDashboardClient />);
    expect(await screen.findByText('Total Appointments')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    expect(screen.getByText('Confirmed Today')).toBeInTheDocument();
  });

  it('lists quick actions', async () => {
    render(<DoctorDashboardClient />);
    expect(await screen.findByText('Manage your availability slots')).toBeInTheDocument();
    expect(screen.getByText('View and manage your patients')).toBeInTheDocument();
    expect(screen.getByText('System alerts & updates')).toBeInTheDocument();
  });

  it("renders today's schedule with patient names", async () => {
    render(<DoctorDashboardClient />);
    expect(await screen.findByRole('heading', { name: /Today's Schedule/i })).toBeInTheDocument();
    expect(screen.getByText('Juan Cruz')).toBeInTheDocument();
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
  });

  it('shows the empty state when no appointments today', async () => {
    vi.unstubAllGlobals();
    stubFetch([]);
    render(<DoctorDashboardClient />);
    expect(await screen.findByText('No appointments today')).toBeInTheDocument();
  });
});
