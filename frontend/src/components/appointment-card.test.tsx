import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentCard } from './appointment-card';
import type { Appointment } from '@/types/api';

const start = new Date(Date.now() + 2 * 86400000);
const end = new Date(start.getTime() + 3600000);

const appt: Appointment = {
  id: 'appt-1',
  patientId: 'p1',
  doctorId: 'd1',
  slotId: 's1',
  status: 'CONFIRMED',
  reasonForVisit: 'Checkup',
  bookedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  doctor: { id: 'd1', fullName: 'Maria Santos', professionalTitle: 'Dr.', specialization: 'Cardiology' },
  patient: { id: 'p1', fullName: 'Juan Dela Cruz' },
  slot: {
    id: 's1',
    doctorId: 'd1',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: 'BOOKED',
    createdAt: '',
    updatedAt: '',
  },
};

describe('AppointmentCard (patient view)', () => {
  it('shows the doctor, specialization and status', () => {
    render(<AppointmentCard appointment={appt} role="patient" isExpanded={false} />);
    expect(screen.getByText(/Maria Santos/)).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('calls onToggleExpand when the header is clicked', () => {
    const onToggle = vi.fn();
    render(
      <AppointmentCard appointment={appt} role="patient" isExpanded={false} onToggleExpand={onToggle} />,
    );
    // The collapsible header is the button whose accessible name carries the doctor.
    fireEvent.click(screen.getByRole('button', { name: /Maria Santos/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('AppointmentCard (doctor view)', () => {
  it('renders without crashing', () => {
    const { container } = render(<AppointmentCard appointment={appt} role="doctor" />);
    expect(container).not.toBeEmptyDOMElement();
  });
});
