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
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  GitBranch,
  MessageSquare,
  FileSearch,
  Star,
  TrendingUp,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminStats,
  getReviewTrends,
  getUserGrowthTrends,
  getSubscriptionBreakdown,
  getReviewStatusBreakdown,
  getRepoIndexStatusBreakdown,
  getTopUsersByActivity,
} from "@/module/admin/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
  });

  const { data: reviewTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ["admin-review-trends"],
    queryFn: () => getReviewTrends(30),
  });

  const { data: userGrowth, isLoading: userGrowthLoading } = useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: () => getUserGrowthTrends(30),
  });

  const { data: subscriptionBreakdown } = useQuery({
    queryKey: ["admin-subscription-breakdown"],
    queryFn: getSubscriptionBreakdown,
  });

  const { data: reviewStatusBreakdown } = useQuery({
    queryKey: ["admin-review-status-breakdown"],
    queryFn: getReviewStatusBreakdown,
  });

  const { data: repoIndexStatus } = useQuery({
    queryKey: ["admin-repo-index-status"],
    queryFn: getRepoIndexStatusBreakdown,
  });

  const { data: topUsers } = useQuery({
    queryKey: ["admin-top-users"],
    queryFn: () => getTopUsersByActivity(5),
  });

  return (
    <div className="space-y-8 w-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-medium tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Platform analytics and user management
          </p>
        </div>
        <Link href="/dashboard/admin/users">
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            View All Users
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Users
            </CardTitle>
            <Users
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {statsLoading ? "—" : stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats?.usersThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
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
              {statsLoading ? "—" : stats?.totalRepositories || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connected repositories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PR Reviews
            </CardTitle>
            <MessageSquare
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {statsLoading ? "—" : stats?.totalReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats?.reviewsThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Full Repo Reviews
            </CardTitle>
            <FileSearch
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {statsLoading ? "—" : stats?.totalFullReviews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Multi-agent reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PRO Users
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" strokeWidth={1.5} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {statsLoading ? "—" : stats?.proUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Premium subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Free Users
            </CardTitle>
            <Users
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {statsLoading ? "—" : stats?.freeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Free tier users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Starred Repo
            </CardTitle>
            <Star
              className="h-4 w-4 text-yellow-500"
              fill="currentColor"
              strokeWidth={1.5}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium tracking-tight">
              {statsLoading ? "—" : stats?.starredUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Users who starred LetsReview
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">User Growth</CardTitle>
            <CardDescription>
              New user registrations over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {userGrowthLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userGrowth || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      name="Total Users"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      name="New Users"
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.2}
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Review Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Review Activity
            </CardTitle>
            <CardDescription>
              PR and full repo reviews over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reviewTrends || []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleDateString()
                      }
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar
                      dataKey="reviews"
                      name="PR Reviews"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="fullReviews"
                      name="Full Repo Reviews"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 - Pie charts and top users */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Subscription Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Subscription Tiers
            </CardTitle>
            <CardDescription>Distribution of user plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="tier"
                    label={({ tier, percentage }) => `${tier}: ${percentage}%`}
                  >
                    {(subscriptionBreakdown || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Review Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Review Status</CardTitle>
            <CardDescription>Status distribution of PR reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reviewStatusBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percentage }) =>
                      `${status}: ${percentage}%`
                    }
                  >
                    {(reviewStatusBreakdown || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Repo Index Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Repository Index Status
            </CardTitle>
            <CardDescription>Indexing status of repositories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={repoIndexStatus || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percentage }) =>
                      `${status}: ${percentage}%`
                    }
                  >
                    {(repoIndexStatus || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users by Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">
                Top Users by Activity
              </CardTitle>
              <CardDescription>
                Most active users on the platform
              </CardDescription>
            </div>
            <Link href="/dashboard/admin/users">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <TrendingUp className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topUsers?.map((user, index) => (
              <Link
                key={user.id}
                href={`/dashboard/admin/users/${user.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  #{index + 1}
                </span>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image || ""} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{user.repositoryCount}</p>
                    <p className="text-xs text-muted-foreground">Repos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{user.reviewCount}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{user.fullReviewCount}</p>
                    <p className="text-xs text-muted-foreground">Full</p>
                  </div>
                </div>
                <Badge
                  variant={
                    user.subscriptionTier === "PRO" ? "default" : "secondary"
                  }
                >
                  {user.subscriptionTier}
                </Badge>
              </Link>
            ))}
            {(!topUsers || topUsers.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
