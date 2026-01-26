"use client";

import {
  Github,
  BookOpen,
  Settings,
  Moon,
  Sun,
  LogOut,
  FileSearch,
  HelpCircle,
  LayoutDashboard,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Logout from "@/module/auth/components/logout";

/**
 * AppSidebar Component - Design System
 *
 * Navigation Sidebar:
 * - Vertical nav with square active states
 * - Monochrome icons with darker shade on active
 * - User identity section at bottom (pill or capsule)
 * - Neutral dividers for grouping
 */
export const AppSidebar = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigationItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Repository", url: "/dashboard/repository", icon: Github },
    { title: "Reviews", url: "/dashboard/reviews", icon: BookOpen },
    {
      title: "Full Repo Review",
      url: "/dashboard/full-review",
      icon: FileSearch,
    },
    { title: "Subscriptions", url: "/dashboard/subscriptions", icon: Star },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
    { title: "How to Use", url: "/dashboard/docs", icon: HelpCircle },
  ];

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === url;
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  if (!mounted) return <Sidebar />;
  if (!session) return null;

  const user = session.user;
  const userName = user.name || "GUEST";
  const userEmail = user.email || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const userAvatar = user.image || "";

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col gap-4 px-4 py-6">
          {/* Connected account badge */}
          <div className="flex items-center gap-3 px-3 py-3 bg-sidebar-accent transition-colors">
            <div className="flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground shrink-0 overflow-hidden">
              <Image
                src="/GitHub.png"
                alt="GitHub"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                Connected
              </p>
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                @{userName}
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6 flex flex-col gap-1">
        {/* Menu label */}
        <p className="text-[10px] font-medium text-sidebar-foreground/40 px-3 mb-3 uppercase tracking-widest">
          Menu
        </p>

        <SidebarMenu className="gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={active}
                  size="lg"
                  className="h-10 px-3 transition-all duration-150"
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-3 w-full"
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active
                          ? "text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/60"
                      }`}
                      strokeWidth={active ? 2 : 1.5}
                    />
                    <span className="text-sm font-medium">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 px-3 data-[state=open]:bg-sidebar-accent transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="text-xs bg-muted">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-relaxed min-w-0">
                      <span className="truncate font-medium text-sm">
                        {userName}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/50">
                        {userEmail}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 p-0 overflow-hidden"
                align="end"
                side="right"
                sideOffset={8}
              >
                {/* User header */}
                <div className="flex items-center gap-3 px-4 py-4 bg-muted/50 border-b border-border">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage
                      src={userAvatar || "/placeholder.svg"}
                      alt={userName}
                    />
                    <AvatarFallback className="text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {userEmail}
                    </p>
                  </div>
                </div>

                <div className="p-1">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Logout className="flex items-center w-full cursor-pointer px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </Logout>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
