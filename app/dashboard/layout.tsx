import React, { Suspense } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { requiredAuth } from "@/module/auth/utils/auth-utils";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { DashboardPageTitle } from "@/components/dashboard-page-title";

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
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-6 bg-background">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="-ml-2" />
            <Separator orientation="vertical" className="mx-2 h-4" />
            <DashboardPageTitle />
          </div>

          {/* Pro subscription prompt */}
          <Link href="/dashboard/subscriptions">
            <div className="group relative flex items-center justify-center rounded-full px-4 py-2 text-xs shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]">
              <span
                className="animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]"
                style={{
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "destination-out",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "subtract",
                }}
              />
              <span className="mr-1">⭐</span>
              <span className="mx-1.5 h-3 w-px shrink-0 bg-neutral-300 dark:bg-neutral-600" />
              <AnimatedGradientText className="text-xs font-medium">
                Get Pro Free
              </AnimatedGradientText>
              <ChevronRight className="ml-1 size-3 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            </div>
          </Link>
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
