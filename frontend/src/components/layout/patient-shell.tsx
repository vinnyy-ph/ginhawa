import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header />
      <main className="flex-grow w-full">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
