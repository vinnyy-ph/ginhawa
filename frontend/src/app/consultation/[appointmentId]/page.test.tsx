import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import ConsultationPage from './page';

const mockSession = vi.hoisted(() => ({ role: 'DOCTOR' }));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: mockSession.role } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/consultation/a1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@daily-co/daily-js', () => ({
  default: {
    createFrame: () => ({
      join: () => Promise.resolve(),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
      sendAppMessage: vi.fn(),
    }),
  },
}));

const roomFixture = {
  roomUrl: 'https://daily.co/room',
  userName: 'Dr. Cruz',
  patientContext: {
    fullName: 'Juan Dela Cruz',
    medicalHistory: 'Asthma',
    weight: 70,
    height: 175,
    birthdate: '1990-01-01',
  },
};

function stubFetch(ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok,
        status: ok ? 200 : 500,
        json: () => Promise.resolve(ok ? roomFixture : { message: 'fail' }),
      } as Response),
    ),
  );
}

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <ConsultationPage params={Promise.resolve({ appointmentId: 'a1' })} />
      </Suspense>,
    );
  });
}

beforeEach(() => {
  mockSession.role = 'DOCTOR';
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ConsultationPage', () => {
  it('shows the doctor sidebar with notes, patient tab and finalize action', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: /Live Notes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Patient$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /End & Finalize/i })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Document findings, symptoms, observations/i),
    ).toBeInTheDocument();
  });

  it('hides the doctor sidebar for patients', async () => {
    mockSession.role = 'PATIENT';
    await renderPage();
    expect(screen.queryByRole('button', { name: /End & Finalize/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Live Notes/i })).not.toBeInTheDocument();
  });

  it('renders the error state when the room fails to load', async () => {
    vi.unstubAllGlobals();
    stubFetch(false);
    await renderPage();
    expect(screen.getByText('Could not load consultation room.')).toBeInTheDocument();
  });
});
