"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/repository": "Repositories",
  "/dashboard/reviews": "Reviews",
  "/dashboard/settings": "Settings",
  "/dashboard/subscriptions": "Subscriptions",
  "/dashboard/docs": "How to Use",
  "/dashboard/full-review": "Full Repo Review",
};

export function DashboardPageTitle() {
  const pathname = usePathname();

  // Find the matching title, default to "Dashboard"
  const title = PAGE_TITLES[pathname] || "Dashboard";

  return (
    <h1 className="text-sm font-medium text-foreground tracking-tight">
      {title}
    </h1>
  );
}
