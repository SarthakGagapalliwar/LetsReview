import React, { Suspense } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { requiredAuth } from "@/module/auth/utils/auth-utils";

export const dynamic = "force-dynamic";

/**
 * Dashboard Layout - Design System
 *
 * Top-Level App Shell:
 * - Persistent top bar with title, search, and action buttons
 * - Left-aligned sidebar for navigation
 * - Large, open content canvas with heavy spacing
 * - High-whitespace layouts
 */
async function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  await requiredAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar - persistent header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-6 bg-background">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-sm font-medium text-foreground tracking-tight">
            Dashboard
          </h1>
        </header>

        {/* Main content canvas - large open space with heavy spacing */}
        <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-12 animate-fade-in">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
};

export default DashboardLayout;
