import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  count,
  className,
}: {
  rating: number;
  count: number;
  className?: string;
}) {
  if (!count) {
    return <span className={cn("text-xs text-on-surface-variant italic", className)}>No reviews yet</span>;
  }
  const rounded = Math.round(rating);
  return (
    <span
      role="img"
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} review${count === 1 ? '' : 's'}`}
    >
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) =>
          i <= rounded ? (
            <StarFilledIcon key={i} className="w-4 h-4 text-[#f59e0b]" />
          ) : (
            <StarIcon key={i} className="w-4 h-4 text-outline-variant" />
          ),
        )}
      </span>
      <span className="text-sm font-semibold text-text-primary">{rating.toFixed(1)}</span>
      <span className="text-xs text-on-surface-variant">({count})</span>
    </span>
  );
}
