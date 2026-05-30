import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ActivityLogIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import type { RecommendationLog } from "@/types/api";

export function HistoryList({ history }: { history: RecommendationLog[] }) {
  return (
    <div className="pt-8 border-t border-outline-variant/30">
      <h2 className="font-serif text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
        <ActivityLogIcon className="w-5 h-5 text-primary" />
        Your past symptom checks
      </h2>
      <div className="space-y-4">
        {history.map((item) => (
          <Card
            key={item.id}
            className="p-5 bg-surface-white border border-outline-variant/30 rounded-2xl shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-surface-variant line-clamp-2 italic mb-1">
                  &ldquo;{item.symptomInput}&rdquo;
                </p>
                {item.aiExplanation && (
                  <p className="text-xs text-on-surface-variant line-clamp-1 italic opacity-70">
                    {item.aiExplanation}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-semibold">
                  {item.matchedSpecialization}
                </span>
                <Link
                  href="/doctors"
                  className="text-primary hover:text-primary/80 transition-colors"
                  aria-label={`Find doctors for ${item.matchedSpecialization}`}
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
