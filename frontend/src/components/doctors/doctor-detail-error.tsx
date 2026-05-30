import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

export function DoctorDetailError({ message }: { message?: string | null }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-br from-[#004d43] via-brand to-brand-light py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Doctors
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="bg-surface-white rounded-xl shadow-soft p-8 text-center max-w-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Profile Unavailable</h2>
          <p className="text-on-surface-variant mb-6">{message || "Doctor not found."}</p>
          <Button asChild>
            <Link href="/doctors">Return to Directory</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
