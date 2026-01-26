"use client";

import React from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  GitBranch,
  MessageSquare,
  FileSearch,
  Star,
  Shield,
  Calendar,
  Mail,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserDetails } from "@/module/admin/actions";
import Link from "next/link";

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  analyzing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  reviewing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  indexed: <CheckCircle className="h-4 w-4 text-green-500" />,
  indexing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
};

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => getUserDetails(userId),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/admin/users">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalReviews = user.repositories.reduce(
    (acc, repo) => acc + repo._count.reviews,
    0,
  );
  const totalFullReviews = user.repositories.reduce(
    (acc, repo) => acc + repo._count.repositoryReviews,
    0,
  );

  return (
    <div className="space-y-6 w-full">
      {/* Back button */}
      <Link href="/dashboard/admin/users">
        <Button variant="ghost" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </Link>

      {/* User profile header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and basic info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || ""} alt={user.name} />
                <AvatarFallback className="text-2xl">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-medium">{user.name}</h1>
                  {user.role === "ADMIN" && (
                    <Badge variant="destructive" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto md:max-w-md">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <GitBranch className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-medium">
                  {user.repositories.length}
                </p>
                <p className="text-xs text-muted-foreground">Repositories</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-medium">{totalReviews}</p>
                <p className="text-xs text-muted-foreground">PR Reviews</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <FileSearch className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-medium">{totalFullReviews}</p>
                <p className="text-xs text-muted-foreground">Full Reviews</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-2xl font-medium">
                  {user.starredRepo ? "Yes" : "No"}
                </p>
                <p className="text-xs text-muted-foreground">Starred</p>
              </div>
            </div>
          </div>

          {/* Subscription info */}
          <div className="mt-6 pt-6 border-t flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Subscription:
              </span>
              <Badge
                variant={
                  user.subscriptionTier === "PRO" ? "default" : "secondary"
                }
              >
                {user.subscriptionTier}
              </Badge>
            </div>
            {user.subscriptionStatus && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="outline">{user.subscriptionStatus}</Badge>
              </div>
            )}
            {user.starCheckedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Star last checked:</span>
                <span>{new Date(user.starCheckedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="repositories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="repositories" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Repositories ({user.repositories.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Reviews ({user.recentReviews.length})
          </TabsTrigger>
          <TabsTrigger value="full-reviews" className="gap-2">
            <FileSearch className="h-4 w-4" />
            Full Reviews ({user.recentFullReviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Repositories tab */}
        <TabsContent value="repositories">
          <Card>
            <CardHeader>
              <CardTitle>Connected Repositories</CardTitle>
              <CardDescription>
                All GitHub repositories connected by this user
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Index Status</TableHead>
                    <TableHead className="text-center">PR Reviews</TableHead>
                    <TableHead className="text-center">Full Reviews</TableHead>
                    <TableHead>Connected</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.repositories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">
                          No repositories connected
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    user.repositories.map((repo) => (
                      <TableRow key={repo.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{repo.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {repo.fullName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcons[repo.indexStatus] || (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="capitalize">
                              {repo.indexStatus}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {repo._count.reviews}
                        </TableCell>
                        <TableCell className="text-center">
                          {repo._count.repositoryReviews}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(repo.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="gap-1">
                              GitHub
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PR Reviews tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Recent PR Reviews</CardTitle>
              <CardDescription>
                Latest pull request reviews for this user
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.recentReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">No reviews yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    user.recentReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">#{review.prNumber}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {review.prTitle}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {review.repository.fullName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcons[review.status] || (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="capitalize">{review.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={review.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="gap-1">
                              View PR
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Reviews tab */}
        <TabsContent value="full-reviews">
          <Card>
            <CardHeader>
              <CardTitle>Recent Full Repository Reviews</CardTitle>
              <CardDescription>
                Multi-agent repository reviews for this user
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user.recentFullReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <p className="text-muted-foreground">
                          No full reviews yet
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    user.recentFullReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <span className="font-medium">
                            {review.repository.fullName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcons[review.status] || (
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="capitalize">{review.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
