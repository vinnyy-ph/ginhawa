import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DoctorSchedulePage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'DOCTOR', name: 'Maria', email: 'maria@x.com' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/doctor/schedule',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const profileFixture = { id: 'd1', fullName: 'Maria Santos', specialization: 'Cardiology' };

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      let body: unknown = [];
      if (url.includes('/doctors/profile')) body = profileFixture;
      else if (url.includes('/slots')) body = [];
      else if (url.includes('/appointments/doctor')) body = [];
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
    }),
  );
}

beforeEach(() => stubFetch());

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DoctorSchedulePage', () => {
  it('renders the schedule header and calendar after loading', async () => {
    render(<DoctorSchedulePage />);
    expect(await screen.findByRole('heading', { name: /My Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set recurring/i })).toBeInTheDocument();
  });

  it('reveals the weekly template form when "Set recurring" is toggled', async () => {
    render(<DoctorSchedulePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Set recurring/i }));
    expect(screen.getByText('Days of week')).toBeInTheDocument();
    expect(screen.getByText('Day start')).toBeInTheDocument();
    expect(screen.getByText('Day end')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate slots/i })).toBeInTheDocument();
    expect(screen.getByText('Pick a start date to preview.')).toBeInTheDocument();
  });
});
