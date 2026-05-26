"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BellIcon, CheckIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/api";

export default function DoctorNotificationsPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.accessToken;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!token) {
      setLoading(false);
      return;
    }
    fetchNotifications();
  }, [token, status]);

  async function fetchNotifications() {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiRequest<Notification[]>("/notifications", { token });
      setNotifications(data);
    } catch (err: any) {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    if (!token) return;
    try {
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
      );
      
      await apiRequest(`/notifications/${id}/read`, { 
        method: 'PATCH',
        token 
      });
    } catch (err) {
      console.error("Failed to mark as read", err);
      // Revert on failure
      fetchNotifications();
    }
  }

  async function markAllAsRead() {
    const unread = notifications.filter(n => !n.readAt);
    if (unread.length === 0) return;
    
    for (const n of unread) {
      await markAsRead(n.id);
    }
  }

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500 max-w-3xl mx-auto">
        
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
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-error p-6 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-surface-white rounded-xl shadow-soft p-12 text-center border border-outline-variant/30">
            <div className="w-20 h-20 rounded-full bg-surface-container mx-auto mb-6 flex items-center justify-center">
              <BellIcon className="w-10 h-10 text-on-surface-variant/50" />
            </div>
            <h3 className="font-bold font-serif text-2xl text-text-primary mb-3">All caught up!</h3>
            <p className="text-on-surface-variant">
              You don't have any new alerts or updates right now.
            </p>
          </div>
        ) : (
          <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
            <div className="divide-y divide-outline-variant/20">
              {notifications.map(notif => {
                const isUnread = !notif.readAt;
                
                const date = new Date(notif.createdAt);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                
                let timeStr = "";
                if (diffMins < 1) timeStr = "Just now";
                else if (diffMins < 60) timeStr = `${diffMins}m ago`;
                else if (diffHours < 24) timeStr = `${diffHours}h ago`;
                else if (diffDays === 1) timeStr = "Yesterday";
                else timeStr = date.toLocaleDateString();

                return (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "p-5 transition-colors cursor-pointer group flex gap-4 items-start",
                      isUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-surface-white hover:bg-surface"
                    )}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
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
