"use client";

import {
  Github,
  GitPullRequest,
  Clock,
  Link2,
  Sparkles,
  CheckCircle2,
  Zap,
  Shield,
  Eye,
  FileSearch,
  ArrowRight,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          How to Use LetsReview
        </h1>
        <p className="text-muted-foreground text-lg">
          Get started with AI-powered code reviews in just a few simple steps.
        </p>
      </div>

      {/* Quick Start Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Start Guide
        </h2>

        <div className="grid gap-6">
          {/* Step 1 */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                    STEP 1
                  </span>
                  Connect Your Repository
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Navigate to the <strong>Repository</strong> section in the
                sidebar and connect your GitHub repository.
              </p>
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm">
                  <strong className="text-amber-600">Wait 3-4 minutes</strong>{" "}
                  for the indexing process to complete. We analyze your codebase
                  to provide context-aware reviews.
                </p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Select the repositories you want to enable
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Our AI will index your code structure
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  You&apos;ll see a confirmation when ready
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                  <GitPullRequest className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                    STEP 2
                  </span>
                  Create a Pull Request
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Create a new pull request on your connected GitHub repository.
                Our AI will automatically detect and review it.
              </p>
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm">
                  <strong className="text-amber-600">Wait 2-3 minutes</strong>{" "}
                  for the AI to analyze your changes and generate a
                  comprehensive review.
                </p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Push your changes to a branch
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Open a PR on GitHub as usual
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  AI review will appear automatically
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
                    STEP 3
                  </span>
                  View Your Reviews
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Go to the <strong>Reviews</strong> section to see all
                AI-generated code reviews with detailed suggestions and
                improvements.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  View detailed code analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Get actionable suggestions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  See security and performance insights
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Full Repo Review Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-primary" />
          Full Repository Review
        </h2>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              Comprehensive Codebase Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Use the <strong>Full Repo Review</strong> feature to get an
              in-depth analysis of your entire codebase. This is perfect for:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg">
                <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Security Analysis</p>
                  <p className="text-xs text-muted-foreground">
                    Identify potential vulnerabilities and security issues
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg">
                <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Performance Insights</p>
                  <p className="text-xs text-muted-foreground">
                    Find performance bottlenecks and optimization opportunities
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg">
                <Github className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Best Practices</p>
                  <p className="text-xs text-muted-foreground">
                    Ensure your code follows industry standards
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-background/50 rounded-lg">
                <FileSearch className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Architecture Review</p>
                  <p className="text-xs text-muted-foreground">
                    Get insights on your project structure and patterns
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pro Tips Section */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Pro Tips
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-green-500/10 rounded-lg shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm mb-1">
                    Smaller PRs = Better Reviews
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Keep your pull requests focused and small for more detailed
                    and accurate reviews.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500/10 rounded-lg shrink-0">
                  <Zap className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm mb-1">Keep Repos Indexed</p>
                  <p className="text-xs text-muted-foreground">
                    Indexed repositories get instant reviews. We Re-Index 
                    after every commit and PR merge.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/10 rounded-lg shrink-0">
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium text-sm mb-1">
                    Star for Free Subscription
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Star our GitHub repository to get a free subscription and
                    support the project!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-amber-500/10 rounded-lg shrink-0">
                  <GitPullRequest className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm mb-1">
                    Descriptive PR Titles
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clear PR titles and descriptions help AI provide more
                    relevant feedback.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Getting Help */}
      <section>
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold mb-1">Need More Help?</h3>
                <p className="text-sm text-muted-foreground">
                  If you have any questions or run into issues, feel free to
                  reach out to our support team.
                </p>
              </div>
              <a
              target="_blank"
                href="https://github.com/SarthakGagapalliwar/LetsReview/issues/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
