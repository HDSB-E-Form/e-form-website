import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { useRealtimeNotifications, AppNotification } from "@/useRealtimeNotifications";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useRealtimeNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    window.location.assign(notif.url);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-primary transition-colors focus:outline-none rounded-full hover:bg-gray-100"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 flex flex-col max-h-[32rem]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1" title="Mark all as read">
                  <Check className="w-3 h-3" /> Read All
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1" title="Clear all">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-0 m-0">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No new notifications
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notif) => {
                  const label = notif.formType === "leave" ? "Pass Exit" : notif.formType.replace("_", " ");
                  return (
                    <li key={notif.id}>
                      <button
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium capitalize ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>New {label} Request</span>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatTime(notif.createdAt)}</span>
                        </div>
                        <p className={`text-sm ${!notif.read ? 'text-gray-800' : 'text-gray-500'}`}>
                          <span className="font-semibold">{notif.employeeName}</span> has submitted a new form for review.
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