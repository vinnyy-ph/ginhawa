import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CalendarIcon, BellIcon } from "@radix-ui/react-icons";

export function DoctorStatsRow({
  total,
  pending,
  confirmedToday,
}: {
  total: number;
  pending: number;
  confirmedToday: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link href="/doctor/appointments" className="block">
        <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
          <div>
            <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Total Appointments</p>
            <h3 className="text-3xl font-bold text-text-primary">{total}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-on-surface-variant" />
          </div>
        </Card>
      </Link>

      <Link href="/doctor/appointments?status=Pending" className="block">
        <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
          <div>
            <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Pending Requests</p>
            <h3 className="text-3xl font-bold text-warning">{pending}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
            <BellIcon className="w-6 h-6 text-warning" />
          </div>
        </Card>
      </Link>

      <Link href="/doctor/appointments?status=Confirmed" className="block">
        <Card className="p-6 flex items-center justify-between border-0 shadow-soft hover:shadow-lifted transition-shadow">
          <div>
            <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Confirmed Today</p>
            <h3 className="text-3xl font-bold text-primary">{confirmedToday}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircledIcon className="w-6 h-6 text-primary" />
          </div>
        </Card>
      </Link>
    </div>
  );
}

function CheckCircledIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}
