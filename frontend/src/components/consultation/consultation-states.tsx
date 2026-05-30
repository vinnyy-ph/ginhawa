import { Spinner } from "@/components/ui/spinner";

export function ConsultationLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <Spinner size="lg" />
    </div>
  );
}

export function ConsultationError({ message }: { message?: string | null }) {
  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <p className="text-error">{message ?? "Room not available."}</p>
    </div>
  );
}
