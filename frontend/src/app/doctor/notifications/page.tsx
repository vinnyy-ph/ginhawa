"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { notificationHref } from "@/lib/notification-links";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { BellIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from '@/lib/datetime';
import { useNotifications } from "@/providers/notification-provider";

export default function DoctorNotificationsPage() {
  const router = useRouter();
  const { notifications, markAsRead } = useNotifications();

  async function markAllAsRead() {
    const unread = notifications.filter(n => !n.readAt);
    if (unread.length === 0) return;
    await Promise.all(unread.map(n => markAsRead(n.id)));
  }

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500 mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold font-serif text-text-primary">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-error text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-on-surface-variant font-sans">
              System alerts, appointment updates, and reminders.
            </p>
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="shrink-0">
              <CheckIcon className="w-4 h-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Content */}
        {notifications.length === 0 ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30">
            <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-6 flex items-center justify-center">
              <BellIcon className="w-10 h-10 text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">All caught up!</h3>
            <p className="text-on-surface-variant">
              You don&apos;t have any new alerts or updates right now.
            </p>
          </div>
        ) : (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
            <div className="divide-y divide-outline-variant/20">
              {notifications.map(notif => {
                const isUnread = !notif.readAt;
                const href = notificationHref(notif.type, "doctor");

                const timeStr = formatRelativeTime(notif.createdAt);

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "p-5 transition-colors flex gap-4 items-start",
                      href ? "cursor-pointer group" : "cursor-default",
                      isUnread ? "bg-primary/5" : "bg-surface-white",
                      href && (isUnread ? "hover:bg-primary/10" : "hover:bg-surface")
                    )}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                      if (href) router.push(href);
                    }}
                  >
                    <div className="shrink-0 mt-1 relative">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        isUnread ? "bg-primary text-white shadow-sm" : "bg-surface-container text-on-surface-variant"
                      )}>
                        <BellIcon className="w-5 h-5" />
                      </div>
                      {isUnread && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-error border-2 border-surface-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className={cn("font-semibold text-text-primary", isUnread && "font-bold")}>
                          {notif.title}
                        </h4>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap shrink-0 mt-0.5">
                          {timeStr}
                        </span>
                      </div>
                      <p className={cn("text-sm text-on-surface-variant leading-relaxed", isUnread && "text-on-surface")}>
                        {notif.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
