import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, HandCoins, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { getNotificationTarget } from "@/lib/notifications";
import { supabase } from "@/supabase";

interface AppNotification {
  id: string;
  formType: string;
  employeeName: string;
  createdAt: string;
  read: boolean;
  url: string;
  type: 'action' | 'self';
  status?: string;
  recipientType?: NonNullable<ReturnType<typeof getNotificationTarget>>['recipientType'];
}

const formTypeLabels: Record<string, string> = {
  leave: "Gate Pass",
  car_rental: "Vehicle Request",
  claim: "Petty Cash Claim",
  cctv_access_request: "CCTV Access Request",
  it_help_desk: "IT Help Desk Ticket",
  it_admin_request: "IT Request (Admin)",
  it_application_request: "IT Request (Application)",
  it_facilities_requisition: "IT Facilities Request",
};

const getActionCopy = (notification: AppNotification) => {
  const formLabel = formTypeLabels[notification.formType] || notification.formType.replace(/_/g, " ");
  const employee = notification.employeeName;

  switch (notification.recipientType) {
    case "hos":
      return { title: `${formLabel} Approval`, message: `${employee}'s submission requires HOS approval.` };
    case "hod":
      return { title: `${formLabel} Approval`, message: `${employee}'s submission requires HOD approval.` };
    case "manco_member":
      return { title: "Gate Pass Approval", message: `${employee}'s Gate Pass requires MANCO approval.` };
    case "head_of_purchasing":
      return { title: "Petty Cash Approval", message: `${employee}'s claim requires Head of Purchasing approval.` };
    case "head_of_finance":
      return { title: "Petty Cash Approval", message: `${employee}'s claim requires Head of Finance approval.` };
    case "finance_admin":
      return notification.status === "approved_hof"
        ? { title: "Payment Required", message: `${employee}'s approved claim is ready for payment.` }
        : { title: "Finance Review Required", message: `${employee}'s claim is ready for Finance review.` };
    case "hr_admin":
      return { title: "Vehicle Request Action", message: `${employee}'s approved vehicle request requires HR action.` };
    case "it_admin":
      return { title: `${formLabel} Action`, message: `${employee}'s request requires IT action.` };
    case "security_guard":
      return { title: "Gate Pass Ready for Exit", message: `${employee}'s MANCO-approved Gate Pass is ready for Security.` };
    default:
      return { title: `${formLabel} Action`, message: `${employee}'s submission requires your action.` };
  }
};

export function NotificationBell() {
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isStateReady, setIsStateReady] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotificationStates = useCallback(async () => {
    if (!user?.id) return;

    // One-time migration of the previous browser-only state into Supabase.
    const readStorageKey = `hdsb_read_notifs_${user.id}`;
    const hiddenStorageKey = `hdsb_hidden_notifs_${user.id}`;
    try {
      const legacyRead = JSON.parse(localStorage.getItem(readStorageKey) || "[]") as string[];
      const legacyHidden = JSON.parse(localStorage.getItem(hiddenStorageKey) || "[]") as string[];
      const legacyIds = Array.from(new Set([...legacyRead, ...legacyHidden]));
      if (legacyIds.length > 0) {
        const now = new Date().toISOString();
        const { error: migrationError } = await supabase.from("notification_user_states").upsert(
          legacyIds.map(notificationId => ({
            user_id: user.id,
            notification_id: notificationId,
            read_at: now,
            ...(legacyHidden.includes(notificationId) ? { hidden_at: now } : {}),
            updated_at: now,
          })),
          { onConflict: "user_id,notification_id", ignoreDuplicates: true },
        );
        if (!migrationError) {
          localStorage.removeItem(readStorageKey);
          localStorage.removeItem(hiddenStorageKey);
        }
      }
    } catch (error) {
      console.warn("Could not migrate legacy notification state:", error);
    }

    const { data, error } = await supabase
      .from("notification_user_states")
      .select("notification_id, read_at, hidden_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("Could not load notification states:", error);
    } else {
      setReadIds((data || []).filter(item => item.read_at).map(item => item.notification_id));
      setHiddenIds((data || []).filter(item => item.hidden_at).map(item => item.notification_id));
    }
    setIsStateReady(true);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setReadIds([]);
      setHiddenIds([]);
      setIsStateReady(false);
      return;
    }

    void loadNotificationStates();
    const channel = supabase
      .channel(`notification-states-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_user_states", filter: `user_id=eq.${user.id}` },
        () => { void loadNotificationStates(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, loadNotificationStates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate Persistent Notifications directly from the Submissions Database
  const allNotifications = useMemo(() => {
    if (!user) return [];
    const notifs: AppNotification[] = [];
    
    submissions.forEach(s => {
      // Exclude inventory and safety log actions from notifications entirely
      const excludedForms = ['inventory_addition', 'ppe_request', 'ppe_purchase', 'waste_inventory', 'mixing_chemical_stages', 'final_discharge', 'daily_operation_monitoring'];
      if (excludedForms.includes(s.formType)) return;

      const targetedRoute = getNotificationTarget(
        { id: user.id, role: user.role, secondary_roles: user.secondary_roles || [], name: user.name },
        { formType: s.formType, status: s.status, data: s.data }
      );
      const daysOld = (new Date().getTime() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      const isRecent = daysOld < 14;

      // Keep every currently actionable item visible, even if its original
      // submission date is older than the general notification window.
      if (!isRecent && !targetedRoute) return;

      // --- Submitter Notifications ---
      if (s.submittedBy === user.id) {
        if (s.status === 'approved' || s.status === 'rejected' || s.status === 'paid') {
          notifs.push({ 
            id: `${s.id}-${s.status}`, 
            formType: s.formType, 
            employeeName: "You", 
            createdAt: s.data?.lastUpdatedAt || s.submittedAt,
            read: readIds.includes(`${s.id}-${s.status}`), 
            url: "/submissions", type: 'self', status: s.status 
          });
        }
      }

      // Add action notification
      if (targetedRoute && s.submittedBy !== user.id) {
        notifs.push({
          id: `${s.id}-${s.status}`,
          formType: s.formType,
          employeeName: s.employeeName,
          createdAt: s.data?.lastUpdatedAt || s.submittedAt,
          read: readIds.includes(`${s.id}-${s.status}`),
          url: targetedRoute.path,
          type: 'action',
          status: s.status,
          recipientType: targetedRoute.recipientType,
        });
      }
    });
    
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [submissions, user, readIds]);

  // Filter out the ones the user manually cleared
  const notifications = allNotifications.filter(n => !hiddenIds.includes(n.id));
  const unreadCount = isStateReady ? notifications.filter(n => !n.read).length : 0;

  const saveNotificationStates = async (ids: string[], hidden = false) => {
    if (!user?.id || ids.length === 0) return;
    const now = new Date().toISOString();
    const rows = ids.map(notificationId => ({
      user_id: user.id,
      notification_id: notificationId,
      read_at: now,
      ...(hidden ? { hidden_at: now } : {}),
      updated_at: now,
    }));
    const { error } = await supabase.from("notification_user_states").upsert(rows, { onConflict: "user_id,notification_id" });
    if (error) console.error("Could not save notification state:", error);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setReadIds(current => current.includes(notif.id) ? current : [...current, notif.id]);
    void saveNotificationStates([notif.id]);
    setIsOpen(false);
    navigate(notif.url);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newReadIds);
    void saveNotificationStates(allIds);
  };

  const clearNotifications = () => {
    const allIds = notifications.map(n => n.id);
    const newHiddenIds = Array.from(new Set([...hiddenIds, ...allIds]));
    setHiddenIds(newHiddenIds);
    setReadIds(current => Array.from(new Set([...current, ...allIds])));
    void saveNotificationStates(allIds, true);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return isToday
      ? `Today, ${date.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}`
      : date.toLocaleString("en-MY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-2 text-muted-foreground hover:text-foreground transition-all focus:outline-none rounded-full hover:bg-muted/80 active:scale-95"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-destructive rounded-full shadow-sm border-2 border-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div role="dialog" aria-label="Notifications" className="fixed left-3 right-3 top-[4.5rem] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-background/95 backdrop-blur-xl rounded-2xl sm:rounded-xl shadow-2xl border border-border/50 z-50 flex flex-col max-h-[calc(100vh-5.5rem)] sm:max-h-[32rem] overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1" title="Mark all as read">
                  <Check className="w-3 h-3" /> Read All
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors" title="Clear all">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-0 m-0">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground flex flex-col items-center">
                <Bell className="w-8 h-8 mb-2 opacity-20" />
                No new notifications
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {notifications.map((notif) => {
                  const label = formTypeLabels[notif.formType] || notif.formType.replace(/_/g, " ");
                  const actionCopy = notif.type === "action" ? getActionCopy(notif) : null;
                  return (
                    <li key={notif.id}>
                      <button
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3.5 transition-all duration-200 hover:bg-muted/50 ${!notif.read ? 'bg-primary/5' : 'bg-transparent'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${notif.type === "action" ? "border border-border/60 bg-muted/70 text-muted-foreground shadow-sm backdrop-blur-sm" : notif.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                            {notif.type === "action" ? <AlertCircle className="h-4 w-4" /> : notif.status === "rejected" ? <XCircle className="h-4 w-4" /> : notif.status === "paid" ? <HandCoins className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className={`min-w-0 flex-1 text-sm font-semibold ${!notif.read ? 'text-foreground' : 'text-foreground/80'}`}>
                                {notif.type === 'self' ? `${label} Update` : actionCopy?.title}
                              </span>
                              {!notif.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                            </div>
                            <p className="mt-1 text-sm leading-snug text-muted-foreground">
                              {notif.type === 'self' ? (
                                notif.status === 'paid' ? (
                                  <>Your claim has been paid. Please acknowledge receipt.</>
                                ) : (
                                  <>Your form was <span className={`font-bold uppercase ${notif.status === 'rejected' ? 'text-destructive' : 'text-emerald-500'}`}>{notif.status}</span>.</>
                                )
                              ) : actionCopy?.message}
                            </p>
                            <p className="mt-1.5 text-[11px] font-medium text-muted-foreground/70">{formatTime(notif.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
