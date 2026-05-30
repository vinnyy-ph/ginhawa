export function DoctorDetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-br from-[#004d43] via-brand to-brand-light py-10">
        <div className="max-w-5xl mx-auto px-4 animate-pulse">
          <div className="h-4 bg-white/20 w-24 rounded mb-8" />
          <div className="flex gap-6 items-start">
            <div className="w-24 h-24 rounded-full bg-white/20 shrink-0" />
            <div className="space-y-4 flex-1">
              <div className="h-8 bg-white/20 rounded w-1/3" />
              <div className="h-4 bg-white/20 rounded w-1/4" />
              <div className="h-20 bg-white/10 rounded-2xl mt-4" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 bg-surface-container rounded w-32 mb-4" />
          <div className="h-4 bg-surface-container rounded w-full" />
          <div className="h-4 bg-surface-container rounded w-5/6" />
        </div>
        <div className="lg:col-span-1">
          <div className="h-64 bg-surface-white rounded-xl shadow-soft" />
        </div>
      </div>
    </div>
  );
}
