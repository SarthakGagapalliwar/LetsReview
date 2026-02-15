"use client";

import { Rocket, Sparkles, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function FullReviewPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[70vh] p-6">
      <Card className="max-w-lg w-full border-dashed border-2 shadow-none bg-background/50">
        <CardContent className="flex flex-col items-center text-center gap-6 pt-10 pb-10">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Launching Soon
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Full Repository Review is getting a major upgrade. We&apos;re
              working hard to bring you an even better AI-powered code review
              experience. Stay tuned!
            </p>
          </div>

          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

/*
// ============================================
// OLD FULL REVIEW PAGE — COMMENTED OUT
// ============================================

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
  Star,
  Sparkles,
  Github,
} from "lucide-react";
import {
  getRepositoryReviews,
  getRepositoriesForReview,
  requestFullRepoReview,
  connectRepositoryForReview,
  cancelRepositoryReview,
  deleteRepositoryReview,
} from "@/module/review/actions";
import {
  syncSubscriptionStatus,
  getSubscriptionData,
} from "@/module/payment/action";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FullReviewPage() {
  const queryClient = useQueryClient();
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [showStarDialog, setShowStarDialog] = useState(false);
  const [starRepoUrl, setStarRepoUrl] = useState<string>("");
  const [isCheckingStar, setIsCheckingStar] = useState(false);

  // Fetch subscription/star status
  const { data: subscriptionData, refetch: refetchSubscription } = useQuery({
    queryKey: ["subscription-data"],
    queryFn: getSubscriptionData,
  });

  const hasStarred = subscriptionData?.user?.starredRepo ?? false;

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
      // Check if this is a star required error
      if (error.message.startsWith("STAR_REQUIRED:")) {
        const parts = error.message.split(":");
        const repoUrl = parts[1];
        setStarRepoUrl(repoUrl);
        setShowStarDialog(true);
      } else {
        toast.error(error.message);
      }
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

  // Handle "I've starred" button click
  const handleCheckStar = async () => {
    setIsCheckingStar(true);
    try {
      const result = await syncSubscriptionStatus();
      if (result.hasStarred) {
        toast.success(
          "🎉 Thank you for starring! You now have access to Full Repository Reviews.",
        );
        setShowStarDialog(false);
        refetchSubscription();
        // Retry the review request
        if (selectedRepo) {
          const repo = repositories?.find(
            (r) =>
              r.id === selectedRepo || r.githubId.toString() === selectedRepo,
          );
          if (repo) {
            if (!repo.isConnected) {
              connectRepoMutation.mutate({
                githubId: repo.githubId,
                name: repo.name,
                owner: repo.owner,
                fullName: repo.fullName,
                url: repo.url,
              });
            } else {
              requestReviewMutation.mutate(repo.id!);
            }
          }
        }
      } else {
        toast.error(
          "We couldn't detect your star yet. Please make sure you've starred the repository and try again.",
        );
      }
    } catch {
      toast.error("Failed to check star status. Please try again.");
    } finally {
      setIsCheckingStar(false);
    }
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
      {/* Header * /}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Full Repository Review
          </h1>
          <p className="text-muted-foreground">
            Get comprehensive AI-powered code reviews for your entire codebase
          </p>
        </div>
        {hasStarred ? (
          <Badge className="gap-1.5 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/30">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            Pro Access
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            onClick={() => {
              setStarRepoUrl(subscriptionData?.repoUrl || "");
              setShowStarDialog(true);
            }}
          >
            <Star className="h-3.5 w-3.5" />
            Star to Unlock
          </Button>
        )}
      </div>

      {/* Request Review Section * /}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Request New Review
              </CardTitle>
              <CardDescription>
                Select a repository to get a full codebase review from our
                multi-agent AI system
              </CardDescription>
            </div>
            {!hasStarred && (
              <Badge
                variant="outline"
                className="gap-1 text-amber-600 border-amber-500/30"
              >
                <Star className="h-3 w-3" />
                Requires Star
              </Badge>
            )}
          </div>
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

      {/* Reviews List * /}
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

      {/* Star Required Dialog * /}
      <Dialog open={showStarDialog} onOpenChange={setShowStarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
              <Star className="h-8 w-8 text-white fill-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              Unlock Full Repository Reviews
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Star our repository on GitHub to unlock this powerful feature —
              completely free!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Benefits * /}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <Sparkles className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Multi-Agent AI Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Specialized AI agents review your entire codebase
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                  <Bot className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Deep Code Insights</p>
                  <p className="text-xs text-muted-foreground">
                    Security, performance, and architecture analysis
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Actionable Recommendations
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prioritized fixes with code suggestions
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons * /}
            <div className="flex flex-col gap-3">
              <Button
                className="w-full gap-2 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-600 hover:via-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
                asChild
              >
                <a
                  href={
                    "https://github.com/SarthakGagapalliwar/LetsReview"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  Star on GitHub
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleCheckStar}
                disabled={isCheckingStar}
              >
                {isCheckingStar ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    I&apos;ve Starred — Check Now
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Your star helps us grow and continue providing free AI code
              reviews. Thank you! 💛
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
*/
