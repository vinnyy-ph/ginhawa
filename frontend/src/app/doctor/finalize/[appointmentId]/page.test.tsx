import { describe, it, expect, vi, afterEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import FinalizeConsultationPage from './page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { accessToken: 'tok', role: 'DOCTOR', name: 'Maria', email: 'maria@x.com' } },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/doctor/finalize/ap1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const appointmentFixture = {
  id: 'ap1',
  patient: { fullName: 'Juan Cruz' },
  slot: { startTime: '2026-05-20T03:00:00.000Z' },
  reasonForVisit: 'Persistent cough',
};

const aiSummary = {
  doctorSummary: 'AI doctor notes',
  patientSummary: 'AI patient summary',
  prescriptions: 'AI prescription',
  followUp: 'AI follow up',
};

const existingRecord = {
  id: 'rec1',
  appointmentId: 'ap1',
  notes: 'BP stable on meds',
  recommendations: 'Rest and hydrate',
  followUpAdvice: 'Return in two weeks',
  prescription: 'Paracetamol 500mg',
  prescriptions: [],
};

function stubFetch({ records = [] as unknown[], apptOk = true } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL) => {
      const url = String(input);
      let body: unknown = {};
      if (url.includes('/medical-records/doctor')) body = records;
      else if (url.includes('/summarize')) body = aiSummary;
      else if (url.includes('/appointments/')) body = appointmentFixture;
      return Promise.resolve({
        ok: url.includes('/appointments/') ? apptOk : true,
        status: url.includes('/appointments/') && !apptOk ? 404 : 200,
        json: () => Promise.resolve(body),
      } as Response);
    }),
  );
}

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <FinalizeConsultationPage params={Promise.resolve({ appointmentId: 'ap1' })} />
      </Suspense>,
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FinalizeConsultationPage', () => {
  it('renders the editable form with AI-prefilled fields when no record exists', async () => {
    stubFetch({ records: [] });
    await renderPage();
    expect(await screen.findByRole('heading', { name: /Finalize Consultation/i })).toBeInTheDocument();
    expect(screen.getByText('Juan Cruz')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('AI doctor notes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AI prescription')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Publish to Patient Record/i })).toBeInTheDocument();
  });

  it('renders the read-only published record when a record exists', async () => {
    stubFetch({ records: [existingRecord] });
    await renderPage();
    expect(await screen.findByRole('heading', { name: /Medical Record/i })).toBeInTheDocument();
    expect(screen.getByText('Consultation Notes')).toBeInTheDocument();
    expect(screen.getByText('BP stable on meds')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Amend record/i })).toBeInTheDocument();
  });

  it('renders the error state when the appointment fails to load', async () => {
    stubFetch({ apptOk: false });
    await renderPage();
    expect(await screen.findByText('Error Loading Data')).toBeInTheDocument();
  });
});
