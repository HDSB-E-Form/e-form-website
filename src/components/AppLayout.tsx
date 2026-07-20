import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

const AppLayout = () => {
  const { pathname } = useLocation();
  const [backPressCount, setBackPressCount] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const handleBackButton = useCallback((event: PopStateEvent) => {
    // This logic is primarily for mobile PWA-like behavior.
    // It prevents accidental closing of the app from the home screen.
    if (pathname === "/home") {
      if (backPressCount === 0) {
        setBackPressCount(1);
        toast.info("Press back again to exit.");
        // Push a state to "catch" the next back press.
        window.history.pushState(null, "", window.location.href);
        setTimeout(() => setBackPressCount(0), 2000); // Reset after 2 seconds
      } else {
        // Allow the default behavior (which might be to close the app)
        window.history.back();
      }
    }
  }, [pathname, backPressCount]);

  useEffect(() => {
    window.addEventListener("popstate", handleBackButton);
    return () => window.removeEventListener("popstate", handleBackButton);
  }, [handleBackButton]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Safe & Modern Glassy Sticky Top Header */}
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 shadow-sm print:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center [&_svg]:w-6 [&_svg]:h-6 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-all active:scale-95 focus:outline-none" />
              <div className="font-bold text-sm sm:text-base ml-2 tracking-wide">
                HDSB Management System
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          
          <main className="flex-1 relative">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
