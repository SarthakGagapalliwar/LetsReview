"use client";
import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  GitCommit,
  GitPullRequest,
  MessageSquare,
  GitBranch,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStats,
  getMonthlyActivity,
} from "@/module/dashboard/actions";
import ContibutionGraph from "@/module/dashboard/components/contibution-graph";

/**
 * Dashboard Page - Design System
 *
 * Layout & Structure:
 * - High-whitespace layouts
 * - Responsive grid patterns
 * - Consistent spacing rhythm (8/16/24)
 * - Staggered entrance animations for grids
 */
function Page() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => await getDashboardStats(),
    refetchOnWindowFocus: false,
  });

  const { data: monthlyActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["monthly-activity"],
    queryFn: async () => await getMonthlyActivity(),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-8 w-full">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your coding activity and AI reviews
        </p>
      </div>

      {/* Stats grid - staggered animation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-stagger-in stagger-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Repositories
            </CardTitle>
            <GitBranch
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {isLoading ? "—" : stats?.totalRespos || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected repositories
            </p>
          </CardContent>
        </Card>

        <Card className="animate-stagger-in stagger-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Commits
            </CardTitle>
            <GitCommit
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {isLoading ? "—" : (stats?.totalCommits || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In the last year
            </p>
          </CardContent>
        </Card>

        <Card className="animate-stagger-in stagger-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pull Requests
            </CardTitle>
            <GitPullRequest
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {isLoading ? "—" : stats?.totalPrs || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="animate-stagger-in stagger-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Reviews
            </CardTitle>
            <MessageSquare
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {isLoading ? "—" : stats?.totalReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Generated reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution graph */}
      <Card className="animate-stagger-in stagger-5">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Contribution Activity
          </CardTitle>
          <CardDescription className="text-xs">
            Visualizing your coding frequency over the last year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContibutionGraph />
        </CardContent>
      </Card>

      {/* Monthly activity chart */}
      <Card className="animate-stagger-in stagger-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Monthly Activity
          </CardTitle>
          <CardDescription className="text-xs">
            Commits, PRs, and AI reviews (last 6 months)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {isLoadingActivity ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="animate-pulse-subtle">Loading activity...</div>
              </div>
            ) : monthlyActivity?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivity} barCategoryGap="20%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "grey",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 0,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      fontSize: 12,
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                      fontWeight: 500,
                    }}
                    itemStyle={{
                      color: "hsl(var(--background))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconType="square"
                    iconSize={8}
                  />
                  <Bar
                    dataKey="commits"
                    fill="var(--chart-1)"
                    name="Commits"
                    radius={0}
                  />
                  <Bar
                    dataKey="prs"
                    fill="var(--chart-2)"
                    name="PRs"
                    radius={0}
                  />
                  <Bar
                    dataKey="reviews"
                    fill="var(--chart-4)"
                    name="AI Reviews"
                    radius={0}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No activity data available.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Page;
