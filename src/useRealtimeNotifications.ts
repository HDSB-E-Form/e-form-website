import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/supabase";
import { useAuth } from "@/contexts/AuthContext";
import notificationSound from "@/assets/notification.mp3";
import { BellRing } from "lucide-react";

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

    // Only allow approvers and admins to listen for these notifications
    const isApprover = ["hod", "hos", "hr_admin", "finance_admin", "super_admin"].includes(user.role);
    if (!isApprover) return;

    // Subscribe to new rows being inserted into the submissions table
    const channel = supabase
      .channel("realtime-submissions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          const newSubmission = payload.new;
          const { formType, employeeName, data, submittedBy } = newSubmission;
          
          // Don't notify the person who actually submitted the form
          if (submittedBy === user.id) return;

          let shouldNotify = false;

          // 1. Notify HOS if their name was selected
          if (user.role === "hos" && data?.hosName === user.name) shouldNotify = true;
          
          // 2. Notify HOD if their name was selected
          if (user.role === "hod" && data?.hodName === user.name) shouldNotify = true;

          // 3. Notify HR Admin for Pass Exit & Car Rental forms
          if (user.role === "hr_admin" && ["leave", "car_rental"].includes(formType)) shouldNotify = true;

          // 4. Notify Finance Admin for Claims
          if (user.role === "finance_admin" && formType === "claim") shouldNotify = true;

          // Determine where the user should be redirected when they click the notification
          const getRedirectUrl = () => {
            if (["hos", "hod"].includes(user.role)) return "/admin/approvals";
            if (user.role === "finance_admin") return "/admin/finance";
            if (user.role === "hr_admin") return "/admin/hr";
            return "/home";
          };

          const redirectUrl = getRedirectUrl();

          // Trigger the popup if conditions are met
          if (shouldNotify) {
            // Store the new notification
            const newNotif: AppNotification = {
              id: payload.new.id || Date.now().toString(),
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

            // Play the notification sound
            const audio = new Audio(notificationSound);
            audio.play().catch(error => console.log("Audio playback blocked by browser:", error));

            const formLabel = formType === "leave" ? "PASS EXIT" : formType.replace("_", " ").toUpperCase();
            toast(`New ${formLabel} Request`, {
              icon: React.createElement(BellRing, { className: "h-5 w-5 text-primary mt-0.5" }),
              description: `${employeeName} has just submitted a new form.`,
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
          }
        }
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