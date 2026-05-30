import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentCard } from './appointment-card';
import type { Appointment, AppointmentStatus } from '@/types/api';

const start = new Date(Date.now() + 2 * 86400000);
const end = new Date(start.getTime() + 3600000);

function makeAppt(status: AppointmentStatus = 'CONFIRMED'): Appointment {
  return {
    id: 'appt-1',
    patientId: 'p1',
    doctorId: 'd1',
    slotId: 's1',
    status,
    reasonForVisit: 'Persistent cough',
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
}

describe('AppointmentCard (patient view)', () => {
  it('shows the doctor, specialization and status in the header', () => {
    render(<AppointmentCard appointment={makeAppt()} role="patient" isExpanded={false} />);
    expect(screen.getByText(/Maria Santos/)).toBeInTheDocument();
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('calls onToggleExpand when the header is clicked', () => {
    const onToggle = vi.fn();
    render(
      <AppointmentCard appointment={makeAppt()} role="patient" isExpanded={false} onToggleExpand={onToggle} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Maria Santos/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('exposes the reason + reschedule action when expanded', () => {
    render(<AppointmentCard appointment={makeAppt()} role="patient" isExpanded />);
    expect(screen.getByText('Reason for Visit')).toBeInTheDocument();
    expect(screen.getByText('Persistent cough')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reschedule/i })).toBeInTheDocument();
  });
});

describe('AppointmentCard (doctor view)', () => {
  it('shows the patient and status', () => {
    render(<AppointmentCard appointment={makeAppt()} role="doctor" />);
    expect(screen.getByText(/Juan Dela Cruz/)).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('offers confirm + decline for a pending request', () => {
    render(<AppointmentCard appointment={makeAppt('PENDING')} role="doctor" />);
    expect(screen.getByRole('button', { name: /confirm request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
  });

  it('offers reschedule for a confirmed appointment', () => {
    render(<AppointmentCard appointment={makeAppt('CONFIRMED')} role="doctor" />);
    expect(screen.getByRole('button', { name: /reschedule/i })).toBeInTheDocument();
  });
});
