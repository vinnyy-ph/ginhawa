import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AvailabilitySlot } from '@/types/api';

interface SlotPickerProps {
  slots: AvailabilitySlot[];
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot) => void;
}

export function SlotPicker({ slots, selectedSlot, onSelectSlot }: SlotPickerProps) {
  // Group slots by date
  const slotsByDate = useMemo(() => {
    const groups: Record<string, AvailabilitySlot[]> = {};
    slots.forEach(slot => {
      const dateStr = new Date(slot.startTime).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(slot);
    });
    return groups;
  }, [slots]);

  if (slots.length === 0) {
    return (
      <div className="bg-surface py-6 px-4 rounded-lg text-center">
        <p className="text-on-surface-variant text-sm">No available slots at the moment.</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
      {Object.entries(slotsByDate).map(([date, daySlots]) => (
        <div key={date}>
          <p className="text-xs font-bold text-outline uppercase mb-2 sticky top-0 bg-surface-white py-1">{date}</p>
          <div className="grid grid-cols-2 gap-2">
            {daySlots.map(slot => {
              const timeStr = new Date(slot.startTime).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
              const isSelected = selectedSlot?.id === slot.id;
              return (
                <button
                  type="button"
                  key={slot.id}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    "py-2 px-1 text-xs font-medium rounded-md transition-all border text-center",
                    isSelected 
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface hover:border-primary/50 text-on-surface-variant border-outline-variant hover:text-primary"
                  )}
                >
                  {timeStr}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
