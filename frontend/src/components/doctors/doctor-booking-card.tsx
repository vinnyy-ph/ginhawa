import { CalendarIcon } from "@radix-ui/react-icons";
import { DoctorBookingPanel } from "@/components/booking/doctor-booking-panel";
import type { AvailabilitySlot } from "@/types/api";

export function DoctorBookingCard({
  isAuthenticated,
  isDoctor,
  slots,
}: {
  isAuthenticated: boolean;
  isDoctor: boolean;
  slots: AvailabilitySlot[];
}) {
  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden sticky top-24">
      <div className="bg-gradient-to-r from-brand-light/10 to-brand/10 px-6 py-4 border-b border-outline-variant/30">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          Book Appointment
        </h3>
      </div>
      <div className="p-6">
        {isDoctor ? (
          <div className="text-center py-4 bg-surface rounded-lg p-4">
            <p className="text-on-surface-variant text-sm">
              You are logged in as a doctor. Switch to a patient account to book consultations.
            </p>
          </div>
        ) : (
          <DoctorBookingPanel slots={slots} isAuthenticated={isAuthenticated} />
        )}
      </div>
    </div>
  );
}
