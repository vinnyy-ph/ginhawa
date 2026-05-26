import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Doctor Dashboard — Ginhawa',
  description: 'Doctor portal dashboard for Ginhawa telehealth.',
};

export default function DoctorDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <Card className="rounded-2xl border border-outline-variant bg-surface-white">
        <CardHeader>
          <CardTitle>Doctor Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-on-surface-variant">
            You’re signed in as a doctor. The full scheduling and consultation workflow is being built.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-full">
              <Link href="/for-doctors">Back to For Doctors</Link>
            </Button>
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/dashboard">Go to patient dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
