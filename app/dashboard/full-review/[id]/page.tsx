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
  ArrowLeft,
  ExternalLink,
  Download,
  Share2,
  CheckCircle2,
  Bot,
} from "lucide-react";
import { getRepositoryReviewById } from "@/module/review/actions";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FullReviewDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const {
    data: review,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["repository-review", id],
    queryFn: () => getRepositoryReviewById(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-150 w-full" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/full-review">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reviews
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Review not found or you don&apos;t have access to it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agentResults = review.agentResults as {
    classifier?: { projectSummary: string; techStack: string[] };
    agents?: Array<{
      role: string;
      scope: string;
      score: number;
      summary: string;
      findingsCount: number;
    }>;
    aggregated?: {
      overallScore: number;
      verdict: string;
      keyFindingsCount: number;
    };
  } | null;

  const handleDownload = () => {
    const blob = new Blob([review.review], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${review.repository.fullName.replace("/", "-")}-review.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Code Review: ${review.repository.fullName}`,
        text: `Full repository review for ${review.repository.fullName}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/full-review">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {review.repository.fullName}
            </h1>
            <p className="text-muted-foreground">
              Full repository review •{" "}
              {formatDistanceToNow(new Date(review.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={review.repository.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Repo
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {agentResults && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {agentResults.aggregated && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {agentResults.aggregated.overallScore}/100
                </div>
                <Badge
                  variant={
                    agentResults.aggregated.verdict === "excellent"
                      ? "default"
                      : agentResults.aggregated.verdict === "good"
                        ? "secondary"
                        : agentResults.aggregated.verdict ===
                            "needs_improvement"
                          ? "outline"
                          : "destructive"
                  }
                  className="mt-2"
                >
                  {agentResults.aggregated.verdict.replace(/_/g, " ")}
                </Badge>
              </CardContent>
            </Card>
          )}

          {agentResults.agents && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI Agents Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  <Bot className="h-6 w-6" />
                  {agentResults.agents.length}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Specialized reviewers
                </p>
              </CardContent>
            </Card>
          )}

          {agentResults.aggregated && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {agentResults.aggregated.keyFindingsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Issues identified
                </p>
              </CardContent>
            </Card>
          )}

          {agentResults.classifier && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {agentResults.classifier.techStack
                    .slice(0, 4)
                    .map((tech, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  {agentResults.classifier.techStack.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{agentResults.classifier.techStack.length - 4}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Agent Breakdown */}
      {agentResults?.agents && agentResults.agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Review Breakdown
            </CardTitle>
            <CardDescription>
              Each specialized AI agent reviewed a specific area of your
              codebase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agentResults.agents.map((agent, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{agent.role}</h4>
                    <Badge variant="outline">{agent.score}/100</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {agent.scope}
                  </p>
                  <p className="text-sm">{agent.summary}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {agent.findingsCount} finding
                    {agent.findingsCount !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Review Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Full Review Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div
              className="bg-muted p-6 rounded-lg overflow-x-auto"
              dangerouslySetInnerHTML={{
                __html: review.review
                  .replace(/^# /gm, '<h1 class="text-2xl font-bold mt-6 mb-4">')
                  .replace(
                    /^## /gm,
                    '<h2 class="text-xl font-bold mt-6 mb-3 border-b pb-2">',
                  )
                  .replace(
                    /^### /gm,
                    '<h3 class="text-lg font-semibold mt-4 mb-2">',
                  )
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(
                    /`([^`]+)`/g,
                    '<code class="bg-background px-1.5 py-0.5 rounded text-sm">$1</code>',
                  )
                  .replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
