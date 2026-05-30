/**
 * ScheduleToast — transient success notification for schedule mutations.
 *
 * Fixed to the top-centre of the viewport with a slide-in animation. Displayed
 * by the doctor schedule page after slot creation, bulk generation, status
 * changes, or deletions succeed. The parent is responsible for unmounting it
 * after an appropriate delay.
 */

import { CheckCircledIcon } from "@radix-ui/react-icons";

export function ScheduleToast({ message }: { message: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-success text-white px-6 py-3 rounded-lg shadow-lifted flex items-center gap-3">
        <CheckCircledIcon className="w-5 h-5" />
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}
