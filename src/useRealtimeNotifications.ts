import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import notificationSound from "@/assets/notification.mp3";
import { BellRing } from "lucide-react";
import { getNotificationTarget } from "@/lib/notifications";

export interface AppNotification {
  id: string;
  formType: string;
  employeeName: string;
  createdAt: string;
  read: boolean;
  url: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load existing notifications from localStorage on mount
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`notifications_${user.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n: AppNotification) => !n.read).length);
        } catch (e) {
          console.error("Failed to parse stored notifications", e);
        }
      }
    }
  }, [user?.id]);

  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    const supportedRoles = ["hod", "hos", "hr_admin", "finance_admin", "super_admin", "security_guard", "head_of_purchasing", "head_of_finance"];
    const isApprover = supportedRoles.includes(user.role) || (user as any)?.secondary_roles?.some((role: string) => supportedRoles.includes(role));
    if (!isApprover) return;

    const handleSubmissionChange = (payload: any) => {
      const newSubmission = payload.new;
      const { formType, employeeName, data, submittedBy } = newSubmission;

      if (submittedBy === user.id) return;

      const excludedForms = ['inventory_addition', 'ppe_request', 'waste_inventory', 'mixing_chemical_stages', 'final_discharge', 'daily_operation_monitoring'];
      if (excludedForms.includes(formType)) return;

      const notificationTarget = getNotificationTarget(
        { role: user.role, secondary_roles: (user as any)?.secondary_roles || [], name: user.name },
        { formType, status: newSubmission.status, data }
      );

      const shouldNotify = Boolean(notificationTarget);
      const redirectUrl = notificationTarget?.path || "/home";

      if (!shouldNotify) return;

      const newNotif: AppNotification = {
        id: newSubmission.id || Date.now().toString(),
        formType,
        employeeName,
        createdAt: new Date().toISOString(),
        read: false,
        url: redirectUrl,
      };

      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      setUnreadCount(prev => prev + 1);

      const audio = new Audio(notificationSound);
      audio.play().catch(error => console.log("Audio playback blocked by browser:", error));

      const formLabel = formType === "leave" ? "PASS EXIT" : formType.replace("_", " ").toUpperCase();
      const description = notificationTarget?.recipientType === "security_guard"
        ? `${employeeName}'s gate pass is ready for security action.`
        : notificationTarget?.recipientType === "hr_admin"
          ? `${employeeName}'s form requires HR action.`
          : notificationTarget?.recipientType === "finance_admin"
            ? `${employeeName}'s petty cash claim is ready for finance review.`
            : `${employeeName} has just submitted a new form.`;

      toast(`New ${formLabel} Request`, {
        icon: React.createElement(BellRing, { className: "h-5 w-5 text-primary mt-0.5" }),
        description,
        duration: 10000,
        className: "font-sans rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-primary/10 bg-background/80 backdrop-blur-xl text-foreground items-start",
        descriptionClassName: "text-muted-foreground opacity-90 mt-0.5",
        style: {
          padding: "20px 24px",
          fontSize: "1.05rem",
          fontWeight: "bold",
          alignItems: "flex-start",
        },
        actionButtonStyle: {
          padding: "6px 16px",
          fontSize: "0.85rem",
          fontWeight: "600",
          borderRadius: "8px",
          marginTop: "2px",
        },
        action: {
          label: "Review",
          onClick: () => window.location.assign(redirectUrl),
        },
      });
    };

    const channel = supabase
      .channel("realtime-submissions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        handleSubmissionChange
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions" },
        handleSubmissionChange
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.role, user?.name]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      if (user?.id) localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, [user?.id]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user?.id) localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
      setUnreadCount(0);
      return updated;
    });
  }, [user?.id]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    if (user?.id) localStorage.removeItem(`notifications_${user.id}`);
  }, [user?.id]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications };
}