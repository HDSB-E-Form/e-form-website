import { useEffect, useState } from "react";
import { Clock3, Headset, Mail, MessageCircle, Phone, X } from "lucide-react";

const HELP_PHONE_DISPLAY = "+60 11-3392 4081";
const HELP_PHONE_LINK = "+601133924081";
const HELP_WHATSAPP_LINK = "https://wa.me/601133924081";
const HELP_EMAIL = "yusri.muhaimin@hidsb.com";

const isWithinSupportHours = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || "";
  const weekday = value("weekday");
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday) && minutes >= 8 * 60 && minutes < 17 * 60 + 30;
};

const ITHelpDeskWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(isWithinSupportHours);

  useEffect(() => {
    const updateAvailability = () => setIsOnline(isWithinSupportHours());
    updateAvailability();
    const interval = window.setInterval(updateAvailability, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 print:hidden">
      {isOpen && (
        <div id="it-help-desk-panel" className="mb-3 w-[calc(100vw-2rem)] max-w-[320px] overflow-hidden rounded-2xl border border-[#40358f]/20 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 dark:border-[#766bc2]/25">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#40358f] to-[#594bb0] p-5 text-white">
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/15" />
            <div className="relative flex items-start gap-3 pr-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Headset className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">Need help signing in?</p>
                <p className="mt-1 text-xs leading-relaxed text-white/80">Contact the IT Help Desk for login or registration assistance.</p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>Mon–Fri, 8:00 AM–5:30 PM</span>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white"><span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-300"}`} />{isOnline ? "IT Help Desk is available" : "Currently outside support hours"}</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close IT Help Desk" className="absolute right-3 top-3 rounded-full p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 p-3">
            <a href={`tel:${HELP_PHONE_LINK}`} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 p-3 transition-all hover:border-[#40358f]/25 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40358f]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><Phone className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-xs text-muted-foreground">Call IT Help Desk</span><span className="block text-sm font-semibold text-foreground">{HELP_PHONE_DISPLAY}</span></span>
            </a>
            <a href={`mailto:${HELP_EMAIL}?subject=${encodeURIComponent("HDSB Management System Assistance")}`} className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 p-3 transition-all hover:border-[#40358f]/25 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40358f]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#40358f] text-white shadow-sm"><Mail className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-xs text-muted-foreground">Email Support</span><span className="block truncate text-sm font-semibold text-foreground">{HELP_EMAIL}</span></span>
            </a>
            <a href={HELP_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 p-3 transition-all hover:border-[#40358f]/25 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40358f]" aria-label="Contact IT Help Desk on WhatsApp">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm"><MessageCircle className="h-4 w-4" /></span>
              <span><span className="block text-xs text-muted-foreground">WhatsApp</span><span className="block text-sm font-semibold text-foreground">Chat with IT Help Desk</span></span>
            </a>
          </div>
        </div>
      )}

      <button type="button" onClick={() => setIsOpen(value => !value)} aria-label={isOpen ? "Close IT Help Desk" : "Contact IT Help Desk"} title="Contact IT Help Desk" aria-expanded={isOpen} aria-controls="it-help-desk-panel" className="group relative ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#40358f] to-[#594bb0] text-white shadow-xl shadow-[#40358f]/30 transition-all hover:-translate-y-0.5 hover:from-[#372d80] hover:to-[#4d409f] hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d61bd] focus-visible:ring-offset-2 active:scale-95">
        {isOpen ? <X className="h-5 w-5" /> : <Headset className="h-6 w-6" />}
        {!isOpen && <span className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#40358f] ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />}
        {!isOpen && <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">Contact IT Help Desk</span>}
      </button>
    </div>
  );
};

export default ITHelpDeskWidget;
