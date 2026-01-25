"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Play,
  Loader2,
  FileSearch,
  AlertCircle,
  Bot,
  RefreshCw,
  StopCircle,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import {
  getRepositoryReviews,
  getRepositoriesForReview,
  requestFullRepoReview,
  connectRepositoryForReview,
  cancelRepositoryReview,
  deleteRepositoryReview,
} from "@/module/review/actions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FullReviewPage() {
  const queryClient = useQueryClient();
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["repository-reviews"],
    queryFn: getRepositoryReviews,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });

  const { data: repositories, isLoading: reposLoading } = useQuery({
    queryKey: ["repositories-for-review"],
    queryFn: getRepositoriesForReview,
  });

  // Connect repository mutation
  const connectRepoMutation = useMutation({
    mutationFn: async (repo: {
      githubId: number;
      name: string;
      owner: string;
      fullName: string;
      url: string;
    }) => {
      return await connectRepositoryForReview(
        repo.githubId,
        repo.name,
        repo.owner,
        repo.fullName,
        repo.url,
      );
    },
    onSuccess: (data) => {
      if (data.alreadyConnected) {
        toast.info("Repository already connected");
      } else {
        toast.success("Repository connected and indexing started");
      }
      queryClient.invalidateQueries({ queryKey: ["repositories-for-review"] });
      // Now start the review with the repositoryId
      if (data.repositoryId) {
        requestReviewMutation.mutate(data.repositoryId);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const requestReviewMutation = useMutation({
    mutationFn: requestFullRepoReview,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["repository-reviews"] });
      setSelectedRepo("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelReviewMutation = useMutation({
    mutationFn: cancelRepositoryReview,
    onSuccess: () => {
      toast.success("Review cancelled");
      queryClient.invalidateQueries({ queryKey: ["repository-reviews"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: deleteRepositoryReview,
    onSuccess: () => {
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["repository-reviews"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleRequestReview = () => {
    if (!selectedRepo) {
      toast.error("Please select a repository");
      return;
    }

    // Find the selected repo
    const repo = repositories?.find(
      (r) => r.id === selectedRepo || r.githubId.toString() === selectedRepo,
    );

    if (!repo) {
      toast.error("Repository not found");
      return;
    }

    // If not connected, connect first then review
    if (!repo.isConnected) {
      connectRepoMutation.mutate({
        githubId: repo.githubId,
        name: repo.name,
        owner: repo.owner,
        fullName: repo.fullName,
        url: repo.url,
      });
    } else {
      // Already connected, start review directly
      requestReviewMutation.mutate(repo.id!);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="gap-1 text-amber-500 border-amber-500/20"
          >
            <StopCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "analyzing":
        return (
          <Badge className="gap-1 bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing
          </Badge>
        );
      case "reviewing":
        return (
          <Badge className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
            <Bot className="h-3 w-3 animate-pulse" />
            AI Reviewing
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIndexStatusBadge = (status: string) => {
    switch (status) {
      case "indexed":
        return (
          <Badge variant="outline" className="gap-1 text-xs text-green-500">
            <CheckCircle2 className="h-2 w-2" />
            Indexed
          </Badge>
        );
      case "indexing":
        return (
          <Badge variant="outline" className="gap-1 text-xs text-blue-500">
            <Loader2 className="h-2 w-2 animate-spin" />
            Indexing
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1 text-xs text-amber-500">
            <AlertCircle className="h-2 w-2" />
            Not Indexed
          </Badge>
        );
      case "not_connected":
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs text-muted-foreground"
          >
            <LinkIcon className="h-2 w-2" />
            Not Connected
          </Badge>
        );
      default:
        return null;
    }
  };

  const isReviewInProgress = (status: string) => {
    return ["pending", "analyzing", "reviewing"].includes(status);
  };

  const canRetryReview = (status: string) => {
    return ["failed", "cancelled"].includes(status);
  };

  if (reviewsLoading || reposLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Full Repository Review
        </h1>
        <p className="text-muted-foreground">
          Get comprehensive AI-powered code reviews for your entire codebase
        </p>
      </div>

      {/* Request Review Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Request New Review
          </CardTitle>
          <CardDescription>
            Select a repository to get a full codebase review from our
            multi-agent AI system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Repository</label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a repository..." />
                </SelectTrigger>
                <SelectContent>
                  {repositories?.map((repo) => (
                    <SelectItem
                      key={repo.githubId}
                      value={
                        repo.isConnected ? repo.id! : repo.githubId.toString()
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span>{repo.fullName}</span>
                        {getIndexStatusBadge(repo.indexStatus)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleRequestReview}
              disabled={
                !selectedRepo ||
                requestReviewMutation.isPending ||
                connectRepoMutation.isPending
              }
            >
              {requestReviewMutation.isPending ||
              connectRepoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Review
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: If the repository is not connected yet, it will be connected
            and indexed automatically before the review.
          </p>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Review History</h2>

        {reviews?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No full repository reviews yet. Select a repository above to
                  get started.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reviews?.map((review) => (
              <Card
                key={review.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {review.repository.fullName}
                        </CardTitle>
                        {getStatusBadge(review.status)}
                      </div>
                      <CardDescription>
                        {review.triggerType === "manual"
                          ? "Manual review"
                          : "Scheduled review"}{" "}
                        •{" "}
                        {formatDistanceToNow(new Date(review.createdAt), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>

                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={review.repository.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {review.status === "completed" && review.agentResults && (
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const results = review.agentResults as {
                            agents?: Array<{ role: string; score: number }>;
                            aggregated?: {
                              overallScore: number;
                              verdict: string;
                            };
                          };
                          return (
                            <>
                              {results.aggregated && (
                                <Badge variant="outline" className="text-sm">
                                  Score: {results.aggregated.overallScore}/100
                                </Badge>
                              )}
                              {results.agents?.map((agent, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {agent.role}: {agent.score}
                                </Badge>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {review.status === "failed" && review.errorMessage && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                        {review.errorMessage}
                      </div>
                    )}

                    {review.status === "cancelled" && (
                      <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg text-sm">
                        Review was cancelled. Click retry to start again.
                      </div>
                    )}

                    {isReviewInProgress(review.status) && (
                      <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {review.status === "pending"
                          ? "Preparing review..."
                          : review.status === "analyzing"
                            ? "Analyzing codebase structure and assigning review agents..."
                            : "AI agents are reviewing your codebase..."}
                      </div>
                    )}

                    {review.status === "completed" && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="whitespace-pre-wrap text-xs">
                            {review.review.substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {review.status === "completed" && (
                        <Button variant="outline" asChild>
                          <Link href={`/dashboard/full-review/${review.id}`}>
                            View Full Review
                          </Link>
                        </Button>
                      )}

                      {canRetryReview(review.status) && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            requestReviewMutation.mutate(review.repository.id)
                          }
                          disabled={requestReviewMutation.isPending}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry Review
                        </Button>
                      )}

                      {isReviewInProgress(review.status) && (
                        <Button
                          variant="outline"
                          onClick={() => cancelReviewMutation.mutate(review.id)}
                          disabled={cancelReviewMutation.isPending}
                        >
                          <StopCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      )}

                      {(review.status === "completed" ||
                        canRetryReview(review.status)) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReviewMutation.mutate(review.id)}
                          disabled={deleteReviewMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
