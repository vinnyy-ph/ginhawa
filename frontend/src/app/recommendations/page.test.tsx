import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecommendationsPage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'PATIENT' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/recommendations',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const historyFixture = [
  {
    id: 'r1',
    symptomInput: 'Persistent headache and nausea',
    matchedSpecialization: 'Neurology',
    aiExplanation: 'Possible migraine pattern.',
    createdAt: new Date().toISOString(),
  },
];

function routeFetch(url: string) {
  if (url.includes('/recommendations')) return historyFixture;
  return [];
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

describe('RecommendationsPage', () => {
  it('renders the welcome step with disclaimer and start CTA', async () => {
    render(<RecommendationsPage />);
    expect(await screen.findByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start symptom check/i })).toBeInTheDocument();
    expect(screen.getByText('Medical Disclaimer')).toBeInTheDocument();
  });

  it('lists past symptom checks fetched for the signed-in user', async () => {
    render(<RecommendationsPage />);
    expect(await screen.findByText('Your past symptom checks')).toBeInTheDocument();
    expect(screen.getByText('Neurology')).toBeInTheDocument();
  });
});
