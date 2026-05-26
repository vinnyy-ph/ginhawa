import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDownIcon, ClockIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types/api";

export type Role = "patient" | "doctor";

export interface AppointmentCardProps {
  appointment: Appointment;
  role: Role;
  
  // Patient specific props
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  
  // Doctor specific props
  isUpdating?: boolean;
  onUpdateStatus?: (id: string, status: AppointmentStatus) => void;
}

const statusConfig: Record<string, { variant: "secondary" | "success" | "destructive" | "info" | "outline", border: string }> = {
  PENDING: { variant: "secondary", border: "border-l-[#f59e0b]" },
  CONFIRMED: { variant: "success", border: "border-l-primary" },
  CANCELLED: { variant: "destructive", border: "border-l-error" },
  COMPLETED: { variant: "info", border: "border-l-info" },
  RESCHEDULED: { variant: "outline", border: "border-l-outline" },
};

export function AppointmentCard({
  appointment: appt,
  role,
  isExpanded = false,
  onToggleExpand,
  isUpdating = false,
  onUpdateStatus
}: AppointmentCardProps) {
  const slot = appt.slot;
  const config = statusConfig[appt.status] || { variant: "outline", border: "border-l-outline" };

  if (role === "patient") {
    const doc = appt.doctor;
    const dateStr = slot ? new Date(slot.startTime).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
    const timeStr = slot ? `${new Date(slot.startTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })} - ${new Date(slot.endTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : '';

    return (
      <div className={cn("bg-surface-white rounded-xl shadow-soft overflow-hidden border-l-4 transition-all duration-200", config.border)}>
        {/* Card Header (Always visible) */}
        <div 
          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container/30"
          onClick={onToggleExpand}
        >
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary font-serif font-bold text-xl shrink-0">
              {doc?.fullName.charAt(0) || 'D'}
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg leading-tight">
                {doc?.professionalTitle ? `${doc.professionalTitle} ` : ''}{doc?.fullName}
              </h3>
              <p className="text-sm text-on-surface-variant mb-1">{doc?.specialization}</p>
              <div className="flex items-center gap-4 text-xs font-semibold text-text-primary mt-2">
                <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  {dateStr}
                </span>
                <span className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
                  <ClockIcon className="w-3.5 h-3.5 text-primary" />
                  {timeStr}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end sm:w-auto w-full gap-4">
            <Badge variant={config.variant} className="capitalize px-3 py-1 text-xs">
              {appt.status.toLowerCase()}
            </Badge>
            <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
              <ChevronDownIcon className={cn("w-5 h-5 transition-transform duration-200", isExpanded && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        <div 
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="p-5 pt-0 border-t border-outline-variant/30 mt-2">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Reason for Visit</p>
                <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg min-h-[60px]">
                  {appt.reasonForVisit || "No reason provided."}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Booking Reference</p>
                  <p className="text-sm font-mono text-on-surface-variant">{appt.id}</p>
                </div>
                
                {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Actions</p>
                    <div className="flex gap-2">
                      <Button disabled variant="outline" size="sm" className="opacity-50 cursor-not-allowed">
                        Reschedule
                      </Button>
                      <Button disabled variant="destructive" size="sm" className="opacity-50 cursor-not-allowed bg-error/10 text-error border-0">
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2 italic">* Online cancellation coming soon. Please contact the clinic.</p>
                  </div>
                )}
                
                {appt.status === "COMPLETED" && (
                  <div>
                    <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                      <Link href="/dashboard/records">View Medical Record</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === "doctor") {
    const pat = appt.patient;
    const dateStr = slot ? new Date(slot.startTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date';
    const timeStr = slot ? `${new Date(slot.startTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}` : '';

    return (
      <div className={cn(
        "bg-surface-white rounded-xl shadow-soft overflow-hidden border-l-4 transition-all duration-200 flex flex-col h-full", 
        config.border,
        isUpdating ? "opacity-70 pointer-events-none" : ""
      )}>
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-text-primary font-serif font-bold text-lg shrink-0">
                {pat?.fullName.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="font-bold text-text-primary leading-tight">
                  {pat?.fullName || 'Patient'}
                </h3>
                <p className="text-xs text-on-surface-variant">Patient ID: {pat?.id.slice(0,8)}</p>
              </div>
            </div>
            <Badge variant={config.variant} className="capitalize px-2.5 py-0.5 text-[10px]">
              {appt.status.toLowerCase()}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-text-primary mb-4">
            <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-md">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-md">
              <ClockIcon className="w-3.5 h-3.5 text-primary" />
              {timeStr}
            </span>
          </div>

          <div className="flex-1">
            <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Reason for Visit</p>
            <p className="text-sm text-on-surface-variant bg-surface p-3 rounded-lg line-clamp-3 min-h-[60px]">
              {appt.reasonForVisit || "No reason provided."}
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-surface-container/30 border-t border-outline-variant/20 flex gap-2 justify-end">
          {appt.status === "PENDING" && (
            <>
              <Button variant="destructive" size="sm" onClick={() => onUpdateStatus?.(appt.id, "CANCELLED")} className="bg-error/10 text-error hover:bg-error/20 border-0">
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={() => onUpdateStatus?.(appt.id, "CONFIRMED")}>
                Confirm Request
              </Button>
            </>
          )}
          
          {appt.status === "CONFIRMED" && (
            <>
              <Button variant="destructive" size="sm" onClick={() => onUpdateStatus?.(appt.id, "CANCELLED")} className="bg-error/10 text-error hover:bg-error/20 border-0 mr-auto">
                Cancel
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/doctor/notes/${appt.id}`}>Add Notes</Link>
              </Button>
              <Button size="sm" onClick={() => onUpdateStatus?.(appt.id, "COMPLETED")} className="bg-[#31a795] text-white hover:bg-[#006b5e]">
                Mark Complete
              </Button>
            </>
          )}
          
          {appt.status === "COMPLETED" && (
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/doctor/notes/${appt.id}`}>View / Edit Notes</Link>
            </Button>
          )}
          
          {appt.status === "CANCELLED" && (
            <p className="text-xs text-on-surface-variant italic w-full text-center py-1.5">No actions available</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
