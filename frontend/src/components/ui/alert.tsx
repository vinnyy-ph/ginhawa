/**
 * Alert — inline status banner with error / success / warning variants.
 * Renders the appropriate Radix icon and an optional dismiss button.
 */
import { cn } from "@/lib/utils";
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";

type AlertVariant = "error" | "success" | "warning";

const VARIANTS: Record<AlertVariant, { className: string; Icon: typeof CheckCircledIcon }> = {
  error: { className: "bg-error/10 text-error border-error/20", Icon: ExclamationTriangleIcon },
  success: { className: "bg-success/10 text-success border-success/20", Icon: CheckCircledIcon },
  warning: { className: "bg-yellow-50 text-yellow-800 border-yellow-200", Icon: InfoCircledIcon },
};

export function Alert({
  variant = "error",
  children,
  onDismiss,
  className,
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const { className: variantClass, Icon } = VARIANTS[variant];
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", variantClass, className)}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 font-semibold hover:opacity-70">
          ✕
        </button>
      )}
    </div>
  );
}
