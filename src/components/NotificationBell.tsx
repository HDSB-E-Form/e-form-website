import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";

interface AppNotification {
  id: string;
  formType: string;
  employeeName: string;
  createdAt: string;
  read: boolean;
  url: string;
  type: 'action' | 'self';
  status?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read/hidden memory from local storage
  useEffect(() => {
    if (user) {
      const storedRead = localStorage.getItem(`hdsb_read_notifs_${user.id}`);
      const storedHidden = localStorage.getItem(`hdsb_hidden_notifs_${user.id}`);
      if (storedRead) setReadIds(JSON.parse(storedRead));
      if (storedHidden) setHiddenIds(JSON.parse(storedHidden));
    }
  }, [user]);

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
      const excludedForms = ['inventory_addition', 'ppe_request', 'waste_inventory', 'mixing_chemical_stages', 'final_discharge', 'daily_operation_monitoring'];
      if (excludedForms.includes(s.formType)) return;

      let isRelevant = false;
      let path = "";
      
      // Check if user is required to take Action
      if (user.role === 'hos' && s.status === 'pending' && (s.data.hosName === user.name || s.data.hos === user.name)) {
        isRelevant = true; path = "/admin/approvals";
      } else if (user.role === 'hod' && s.status === 'approved_hos' && (s.data.hodName === user.name || s.data.hod === user.name)) {
        isRelevant = true; path = "/admin/approvals";
      } else if (user.role === 'hr_admin' && ['car_rental', 'leave'].includes(s.formType) && s.status === 'approved_hod') {
        isRelevant = true; path = "/admin/hr";
      } else if (user.role === 'finance_admin' && s.formType === 'claim' && s.status === 'approved_hod') {
        isRelevant = true; path = "/admin/finance";
      } 
      // Check if the user is the original submitter getting approved/rejected
      else if (s.submittedBy === user.id && (s.status === 'approved' || s.status === 'rejected')) {
         notifs.push({ id: `${s.id}-${s.status}`, formType: s.formType, employeeName: "You", createdAt: s.updatedAt || s.submittedAt, read: readIds.includes(`${s.id}-${s.status}`), url: "/submissions", type: 'self', status: s.status });
         return;
      }

      // Add action notification
      if (isRelevant) {
        notifs.push({ id: `${s.id}-${s.status}`, formType: s.formType, employeeName: s.employeeName, createdAt: s.submittedAt, read: readIds.includes(`${s.id}-${s.status}`), url: path, type: 'action' });
      }
    });
    
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [submissions, user, readIds]);

  // Filter out the ones the user manually cleared
  const notifications = allNotifications.filter(n => !hiddenIds.includes(n.id));
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: AppNotification) => {
    if (!hiddenIds.includes(notif.id)) {
      const newHiddenIds = [...hiddenIds, notif.id];
      setHiddenIds(newHiddenIds);
      if (user) localStorage.setItem(`hdsb_hidden_notifs_${user.id}`, JSON.stringify(newHiddenIds));
    }
    setIsOpen(false);
    navigate(notif.url);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newReadIds);
    if (user) localStorage.setItem(`hdsb_read_notifs_${user.id}`, JSON.stringify(newReadIds));
  };

  const clearNotifications = () => {
    const allIds = notifications.map(n => n.id);
    const newHiddenIds = Array.from(new Set([...hiddenIds, ...allIds]));
    setHiddenIds(newHiddenIds);
    if (user) localStorage.setItem(`hdsb_hidden_notifs_${user.id}`, JSON.stringify(newHiddenIds));
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
        <div className="absolute -right-[3rem] sm:right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 bg-background/95 backdrop-blur-xl rounded-2xl sm:rounded-xl shadow-2xl border border-border/50 z-50 flex flex-col max-h-[80vh] sm:max-h-[32rem] overflow-hidden animate-in fade-in slide-in-from-top-2">
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
                  const label = notif.formType === "leave" ? "Pass Exit" : notif.formType.replace("_", " ");
                  return (
                    <li key={notif.id}>
                      <button
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3 transition-all duration-200 hover:bg-muted/50 ${!notif.read ? 'bg-primary/5' : 'bg-transparent opacity-80 hover:opacity-100'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium capitalize ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>New {label} Request</span>
                          <span className="text-xs text-muted-foreground/70 whitespace-nowrap ml-2">{formatTime(notif.createdAt)}</span>
                        </div>
                        <p className={`text-sm ${!notif.read ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                          {notif.type === 'self' ? (
                            <>Your form was <span className={`font-bold uppercase ${notif.status === 'rejected' ? 'text-destructive' : 'text-emerald-500'}`}>{notif.status}</span>.</>
                          ) : (
                            <><span className="font-semibold">{notif.employeeName}</span> has submitted a new form for review.</>
                          )}
                        </p>
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