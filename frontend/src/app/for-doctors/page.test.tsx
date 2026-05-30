import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForDoctorsPage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/for-doctors',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ForDoctorsPage', () => {
  it('renders the hero with headline and primary CTAs', () => {
    render(<ForDoctorsPage />);
    expect(screen.getByText('breathing room')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /join as a doctor/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /see how it works/i })).toBeInTheDocument();
  });

  it('renders the capability cards', () => {
    render(<ForDoctorsPage />);
    expect(screen.getByText('Schedule that stays sane')).toBeInTheDocument();
    expect(screen.getByText('Patient context, ready')).toBeInTheDocument();
    expect(screen.getByText('Notes & prescriptions, streamlined')).toBeInTheDocument();
    expect(screen.getByText('Privacy-first by default')).toBeInTheDocument();
  });

  it('renders the workflow steps', () => {
    render(<ForDoctorsPage />);
    expect(screen.getByText('Create your doctor profile')).toBeInTheDocument();
    expect(screen.getByText('Set availability once')).toBeInTheDocument();
    expect(screen.getByText('Consult with confidence')).toBeInTheDocument();
    expect(screen.getByText('Document fast, follow up cleanly')).toBeInTheDocument();
  });

  it('renders the closing call-to-action', () => {
    render(<ForDoctorsPage />);
    expect(screen.getByRole('link', { name: /request a demo/i })).toBeInTheDocument();
  });
});
