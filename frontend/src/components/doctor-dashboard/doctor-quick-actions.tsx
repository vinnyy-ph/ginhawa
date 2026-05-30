/**
 * DoctorQuickActions — sidebar widget on the doctor dashboard with navigation shortcuts.
 *
 * Renders four clickable cards linking to My Schedule, All Appointments,
 * Notifications, and Patients. Placed in the right column of the dashboard
 * layout alongside DoctorTodaySchedule.
 */

import Link from "next/link";
import { CalendarIcon, BellIcon, ClockIcon } from "@radix-ui/react-icons";

export function DoctorQuickActions() {
  return (
    <div className="lg:col-span-1 space-y-4">
      <h2 className="text-xl font-bold font-serif text-text-primary mb-4">Quick Actions</h2>

      <Link href="/doctor/schedule" className="block group">
        <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">My Schedule</h4>
            <p className="text-xs text-on-surface-variant">Manage your availability slots</p>
          </div>
        </div>
      </Link>

      <Link href="/doctor/appointments" className="block group">
        <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">All Appointments</h4>
            <p className="text-xs text-on-surface-variant">View and manage requests</p>
          </div>
        </div>
      </Link>

      <Link href="/doctor/notifications" className="block group">
        <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
            <BellIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">Notifications</h4>
            <p className="text-xs text-on-surface-variant">System alerts & updates</p>
          </div>
        </div>
      </Link>

      <Link href="/doctor/patients" className="block group">
        <div className="bg-surface-white p-4 rounded-xl shadow-sm hover:shadow-lifted transition-all flex items-center gap-4 border border-transparent hover:border-primary/20">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-light to-brand flex items-center justify-center shrink-0">
            <PersonIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-text-primary group-hover:text-primary transition-colors">Patients</h4>
            <p className="text-xs text-on-surface-variant">View and manage your patients</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}
