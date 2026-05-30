import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingProvider } from '@/context/onboarding-context';
import OnboardingStep6 from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { accessToken: 'tok', role: 'PATIENT' } }, status: 'authenticated' }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/onboarding/6',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const seed = {
  fullName: 'Juan Dela Cruz',
  birthdate: '1990-01-01',
  contactDetails: '9171234567',
  weightKg: 70,
  heightCm: 175,
  city: 'Manila',
  bloodType: 'O+',
  allergies: 'Penicillin',
};

beforeEach(() => {
  window.sessionStorage.setItem('ginhawa.onboarding.patient', JSON.stringify(seed));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) } as Response)),
  );
});

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <OnboardingProvider>
      <OnboardingStep6 />
    </OnboardingProvider>,
  );
}

describe('OnboardingStep6', () => {
  it('renders the review header and digital ID card', () => {
    renderPage();
    expect(screen.getByText('One last check')).toBeInTheDocument();
    expect(screen.getByText('Digital Patient ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate ID Card/i })).toBeInTheDocument();
  });

  it('renders the always-present identity rows', () => {
    renderPage();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Contact Info')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });

  it('renders the location/insurance group when those fields are present', () => {
    renderPage();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('PhilHealth ID')).toBeInTheDocument();
    expect(screen.getByText('HMO')).toBeInTheDocument();
  });

  it('renders the medical group when those fields are present', () => {
    renderPage();
    expect(screen.getByText('Blood Type')).toBeInTheDocument();
    expect(screen.getByText('Smoking')).toBeInTheDocument();
    expect(screen.getByText('Allergies')).toBeInTheDocument();
    expect(screen.getByText('Chronic Conditions')).toBeInTheDocument();
    expect(screen.getByText('Current Medications')).toBeInTheDocument();
  });
});
