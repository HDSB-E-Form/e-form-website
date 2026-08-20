import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmissions } from "@/contexts/SubmissionsContext";
import { Bell, CheckCircle, XCircle, FileText, AlertCircle, HandCoins } from "lucide-react";
import notificationSound from "@/assets/notification.mp3";

const formTypeLabels: Record<string, string> = {
  car_rental: "Vehicle Request",
  leave: "Gate Pass",
  claim: "Petty Cash Claim",
  ppe_request: "PPE | Uniform | Office Supplies",
  waste_inventory: "Waste Inventory",
  mixing_chemical_stages: "Mixing Log",
  final_discharge: "Discharge Log",
  ppe_purchase: "PPE | Uniform | Office Supplies",
  cctv_access_request: "CCTV Access Request",
  it_help_desk: "IT Help Desk Ticket",
  material_requisition_slip: "Material Requisition Slip (MRS)",
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
  status?: string;
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
    const excludedForms = ["inventory_addition", "waste_inventory", "mixing_chemical_stages", "final_discharge", "daily_operation_monitoring"];
    const recentSubmissions = submissions.filter(s => !excludedForms.includes(s.formType)).filter(s => {
      const isPendingSecurityAction =
        (user.role === 'security_guard' || user.secondary_roles?.includes('security_guard')) &&
        s.formType === 'leave' &&
        s.status === 'approved_manco';
      if (isPendingSecurityAction) return true;

      const daysOld = (new Date().getTime() - new Date(s.submittedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysOld < 14;
    });

    recentSubmissions.forEach(s => {
      let isRelevant = false;
      let message = "";
      let path = "";
      
      // Employees confirm IT responses before a ticket or facilities request is closed
      if (['it_help_desk', 'it_admin_request', 'it_application_request', 'it_facilities_requisition'].includes(s.formType) && s.status === 'awaiting_confirmation' && s.submittedBy === user.id) {
        isRelevant = true;
        message = s.formType !== 'it_help_desk' ? `IT has responded to your request. Please review and accept or return it with remarks.` : `IT has resolved your Help Desk ticket. Please confirm that the solution is working.`;
        path = "/submissions";
      }
      // 2. Approvers (HOS)
      else if (user.role === 'hos' && s.status === 'pending' && (s.data.hosName === user.name || s.data.hos === user.name)) {
        isRelevant = true;
        message = `${s.employeeName} submitted a new form for your review.`;
        path = "/admin/approvals";
      }
      // 3. Approvers (HOD)
      else if (user.role === 'hod' && s.status === 'approved_hos' && (s.data.hodName === user.name || s.data.hod === user.name)) {
        isRelevant = true;
        message = `${s.employeeName}'s form requires your approval.`;
        path = "/admin/approvals";
      }
      // Approvers (HOP)
      else if ((user.role === 'manco_member' || user.secondary_roles?.includes('manco_member')) && s.formType === 'leave' && s.status === 'approved_hod' && (s.data.mancoMemberUserId ? s.data.mancoMemberUserId === user.id : s.data.mancoMemberName === user.name)) {
        isRelevant = true;
        message = `A Gate Pass from ${s.employeeName} requires your approval.`;
        path = "/admin/approvals";
      }
      // Approvers (HOP)
      else if ((user.role === 'head_of_purchasing' || user.secondary_roles?.includes('head_of_purchasing')) && s.formType === 'claim' && s.status === 'approved_hod' && (s.data.hopName === user.name)) {
        isRelevant = true;
        message = `A Petty Cash Claim from ${s.employeeName} requires your approval.`;
        path = "/admin/approvals";
      }
      // Approvers (HOF)
      else if ((user.role === 'head_of_finance' || user.secondary_roles?.includes('head_of_finance')) && s.formType === 'claim' && s.status === 'approved_hop' && (s.data.hofName === user.name)) {
        isRelevant = true;
        message = `A Petty Cash Claim from ${s.employeeName} requires your approval.`;
        path = "/admin/approvals";
      }
      // 4. HR Admin
      else if (user.role === 'hr_admin' && s.formType === 'car_rental' && s.status === 'approved_hod') {
        isRelevant = true;
        message = `New ${formTypeLabels[s.formType] || s.formType} requires HR action.`;
        path = "/admin/hr";
      }
      // 5. Finance Admin (Review & Payment)
      else if (user.role === 'finance_admin' && s.formType === 'claim') {
        if (s.status === 'pending_finance_review') {
          isRelevant = true;
          message = `A Petty Cash Claim from ${s.employeeName} requires your review.`;
          path = "/admin/finance";
        } else if (s.status === 'approved_hof') {
        isRelevant = true;
        message = `New Petty Cash Claim requires Finance action.`;
        path = "/admin/finance";
        }
      }
      // IT Admin receives CCTV requests after HOD approval and Help Desk tickets immediately
      else if ((user.role === 'it_admin' || user.secondary_roles?.includes('it_admin')) && (
        (s.formType === 'cctv_access_request' && s.status === 'approved_hod') ||
        (['it_admin_request', 'it_application_request', 'it_facilities_requisition'].includes(s.formType) && ['approved_hod', 'reopened'].includes(s.status)) ||
        (s.formType === 'it_help_desk' && ['pending', 'reopened'].includes(s.status))
      )) {
        isRelevant = true;
        message = s.formType === 'it_help_desk'
          ? s.status === 'reopened'
            ? `${s.employeeName} reopened an IT Help Desk ticket.`
            : `A new IT Help Desk ticket from ${s.employeeName} requires action.`
          : ['it_admin_request', 'it_application_request', 'it_facilities_requisition'].includes(s.formType)
            ? `An IT request from ${s.employeeName} requires IT review.`
            : `A CCTV Access Request from ${s.employeeName} requires IT review.`;
        path = s.formType === 'it_help_desk' ? "/admin/it/help-desk" : ['it_admin_request', 'it_application_request', 'it_facilities_requisition'].includes(s.formType) ? "/admin/it/facilities" : "/admin/it";
      }
      // 6. Security Guard
      else if ((user.role === 'security_guard' || user.secondary_roles?.includes('security_guard')) && s.formType === 'leave' && s.status === 'approved_manco') {
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
      
      // 7. Submitter (Employee) - Notify if their OWN form status changed
      if (s.submittedBy === user.id) {
        if (s.status === 'approved' || s.status === 'rejected' || s.status === 'paid') {
          let type: 'success' | 'error' | 'info' = 'info';
          let message = `Your form status has been updated.`;
          if (s.status === 'approved') {
            type = 'success';
            message = 'Your form has been fully approved!';
          } else if (s.status === 'rejected') {
            type = 'error';
            message = 'Your form has been rejected.';
          } else if (s.status === 'paid') {
            type = 'info';
            message = 'Your claim has been paid. Please acknowledge receipt.';
          }

          notifs.push({ 
            id: `${s.id}-${s.status}`, submissionId: s.id, title: formTypeLabels[s.formType] || s.formType, 
            message, date: (s as any).updatedAt || s.submittedAt, isRead: readIds.includes(`${s.id}-${s.status}`), 
            path: "/submissions", type, status: s.status 
          });
        }
      }
    });
    
    return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [submissions, user, readIds]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const prevUnreadCountRef = useRef(unreadCount);

  // Play sound when new unread notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      const audio = new Audio(notificationSound);
      audio.play().catch(error => {
        console.log("Notification sound playback blocked by browser:", error.message);
      });
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

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
