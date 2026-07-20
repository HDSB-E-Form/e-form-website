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

    const handleSubmissionChange = (payload: any) => {
      const newSubmission = payload.new;
      const { formType, employeeName, data, submittedBy } = newSubmission;

      // Ignore metadata-only updates so opening/reviewing a request does not
      // repeatedly alert the same recipient at an unchanged approval stage.
      if (payload.eventType === "UPDATE" && payload.old?.status === newSubmission.status) return;

      const isOwnSubmission = submittedBy === user.id;
      const isHelpDeskConfirmation = formType === 'it_help_desk' && newSubmission.status === 'awaiting_confirmation';
      const isFinalUserUpdate = ['approved', 'rejected', 'paid', 'completed'].includes(newSubmission.status) || isHelpDeskConfirmation;

      const excludedForms = ['inventory_addition', 'ppe_request', 'ppe_purchase', 'waste_inventory', 'mixing_chemical_stages', 'final_discharge', 'daily_operation_monitoring'];
      if (excludedForms.includes(formType)) return;

      const notificationTarget = isOwnSubmission
        ? (isFinalUserUpdate ? { path: '/submissions', recipientType: 'submitter' as const } : null)
        : getNotificationTarget(
            { id: user.id, role: user.role, secondary_roles: (user as any)?.secondary_roles || [], name: user.name },
            { formType, status: newSubmission.status, data }
          );

      const shouldNotify = Boolean(notificationTarget);
      const redirectUrl = notificationTarget?.path || "/home";

      if (!shouldNotify) return;

      const newNotif: AppNotification = {
        id: newSubmission.id ? `${newSubmission.id}-${newSubmission.status}` : Date.now().toString(),
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

      const formLabel = formType === "leave" ? "PASS EXIT" : formType === "it_help_desk" ? "IT HELP DESK" : formType.replace(/_/g, " ").toUpperCase();
      const description = notificationTarget?.recipientType === "security_guard"
        ? `${employeeName}'s gate pass is ready for security action.`
        : notificationTarget?.recipientType === "it_admin"
          ? formType === "it_help_desk"
            ? `${employeeName}'s IT Help Desk ticket requires action.`
            : `${employeeName}'s CCTV access request is ready for IT review.`
        : notificationTarget?.recipientType === "hr_admin"
          ? `${employeeName}'s form requires HR action.`
        : notificationTarget?.recipientType === "finance_admin"
          ? `${employeeName}'s petty cash claim is ready for finance review.`
          : notificationTarget?.recipientType === "submitter"
            ? isHelpDeskConfirmation
              ? "IT has provided a resolution. Please confirm whether the issue is resolved."
              : `Your request status is now ${newSubmission.status.replace(/_/g, ' ')}.`
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
  }, [user?.id, user?.role, user?.name, user?.secondary_roles]);

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
