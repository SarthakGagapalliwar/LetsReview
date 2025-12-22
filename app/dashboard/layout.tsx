import React from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { requiredAuth } from "@/module/auth/utils/auth-utils";

const DashboardLayout = async({ children }: { children: React.ReactNode }) => {

    await requiredAuth()

  return <SidebarProvider>
        <AppSidebar/>
        <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1"/>
                <Separator orientation="vertical" className="mx-2 h-4"/>
                <h1  className="text-xl font-semibold text-foreground">
                    Dashboard
                </h1>
                <main className="flex-1 overflow-auto p-4 md:p-6">

                </main>
            </header>
        </SidebarInset>
    {children}</SidebarProvider>;
};

export default DashboardLayout;
