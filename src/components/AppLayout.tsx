import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

const AppLayout = ({ children }: { children: React.ReactNode }) => {

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Safe & Modern Glassy Sticky Top Header */}
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 shadow-sm print:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full transition-all active:scale-95 focus:outline-none" />
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
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;