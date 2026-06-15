import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Bell, CheckCircle, XCircle, FileText, AlertCircle } from "lucide-react";

const formTypeLabels: Record<string, string> = {
  car_rental: "Company Car Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE/Uniform Request",
  waste_inventory: "Waste Inventory",
  mixing_chemical_stages: "Mixing Log",
  final_discharge: "Discharge Log"
};

interface Notification {
  id: string;
  submissionId: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  path: string;
  type: 'action' | 'success' | 'error' | 'info';
}

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { submissions } = useSubmissions();
  const navigate = useNavigate();
  const [readIds, setReadIds] = useState<string[]>([]);

  // Load read notifications from local storage on mount
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`hdsb_notifications_${user.id}`);
      if (stored) setReadIds(JSON.parse(stored));
    }
  }, [user]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate relevant notifications dynamically based on role and submissions
  const notifications = useMemo(() => {
    if (!user) return [];
    const notifs: Notification[] = [];
    
    // Look at recent submissions (last 14 days) to avoid performance issues
    const excludedForms = ["inventory_addition", "ppe_request", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
    const recentSubmissions = submissions.filter(s => !excludedForms.includes(s.formType)).filter(s => {
      const daysOld = (new Date().getTime() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysOld < 14;
    });

    recentSubmissions.forEach(s => {
      let isRelevant = false;
      let message = "";
      let path = "";
      
      // 1. Approvers (HOS)
      if (user.role === 'hos' && s.status === 'pending' && (s.data.hosName === user.name || s.data.hos === user.name)) {
        isRelevant = true;
        message = `${s.employeeName} submitted a new form for your review.`;
        path = "/admin/approvals";
      }
      // 2. Approvers (HOD)
      else if (user.role === 'hod' && s.status === 'approved_hos' && (s.data.hodName === user.name || s.data.hod === user.name)) {
        isRelevant = true;
        message = `${s.employeeName}'s form requires HOD approval.`;
        path = "/admin/approvals";
      }
      // 3. HR Admin
      else if (user.role === 'hr_admin') {
        if (['car_rental', 'leave'].includes(s.formType) && s.status === 'approved_hod') {
          isRelevant = true;
          message = `New ${formTypeLabels[s.formType] || s.formType} requires HR action.`;
          path = "/admin/hr";
        }
      }
      // 4. Finance Admin
      else if (user.role === 'finance_admin' && s.formType === 'claim' && s.status === 'approved_hod') {
        isRelevant = true;
        message = `New Petty Cash Claim requires Finance action.`;
        path = "/admin/finance";
      }
      // 5. Security Guard
      else if (user.role === 'security_guard' && s.formType === 'leave' && s.status === 'approved_hod') {
        isRelevant = true;
        message = `Approved Gate Pass for ${s.employeeName} is ready.`;
        path = "/admin/security";
      }

      // Add notification for admins/approvers
      if (isRelevant) {
        notifs.push({
          id: `${s.id}-${s.status}-action`,
          submissionId: s.id,
          title: formTypeLabels[s.formType] || s.formType.toUpperCase(),
          message,
          date: s.submittedAt,
          isRead: readIds.includes(`${s.id}-${s.status}-action`),
          path,
          type: 'action'
        });
      }
      
      // 6. Submitter (Employee) - Notify if their OWN form status changed
      if (s.submittedBy === user.id) {
        if (s.status === 'approved') {
          notifs.push({ id: `${s.id}-approved`, submissionId: s.id, title: formTypeLabels[s.formType] || s.formType, message: `Your form has been fully approved!`, date: s.submittedAt, isRead: readIds.includes(`${s.id}-approved`), path: "/submissions", type: 'success' });
        } else if (s.status === 'rejected') {
          notifs.push({ id: `${s.id}-rejected`, submissionId: s.id, title: formTypeLabels[s.formType] || s.formType, message: `Your form has been rejected.`, date: s.submittedAt, isRead: readIds.includes(`${s.id}-rejected`), path: "/submissions", type: 'error' });
        }
      }
    });
    
    return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [submissions, user, readIds]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string, path: string) => {
    if (!readIds.includes(id)) {
      const newReadIds = [...readIds, id];
      setReadIds(newReadIds);
      localStorage.setItem(`hdsb_notifications_${user?.id}`, JSON.stringify(newReadIds));
    }
    navigate(path);
    setIsOpen(false);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newReadIds);
    localStorage.setItem(`hdsb_notifications_${user?.id}`, JSON.stringify(newReadIds));
  };

  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors focus:outline-none">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background animate-pulse" />}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
           <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
             <h3 className="font-bold text-sm text-foreground">Notifications</h3>
             {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs font-bold text-primary hover:underline">Mark all as read</button>}
           </div>
           <div className="max-h-[400px] overflow-y-auto">
             {notifications.length === 0 ? <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center"><Bell className="h-8 w-8 mb-2 opacity-20"/> No new notifications</div> : notifications.map(n => (
               <div key={n.id} onClick={() => markAsRead(n.id, n.path)} className={`p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors flex gap-3 ${n.isRead ? 'opacity-60 bg-transparent' : 'bg-primary/5'}`}>
                 <div className="mt-0.5 shrink-0">{n.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : n.type === 'error' ? <XCircle className="h-4 w-4 text-red-500" /> : n.type === 'action' ? <AlertCircle className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-primary" />}</div>
                 <div className="flex-1 min-w-0"><p className="text-xs font-bold text-foreground uppercase tracking-wider truncate mb-1">{n.title}</p><p className="text-sm text-muted-foreground leading-snug">{n.message}</p><p className="text-[10px] font-semibold text-muted-foreground/60 mt-1">{timeAgo(n.date)}</p></div>
                 {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />}
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};