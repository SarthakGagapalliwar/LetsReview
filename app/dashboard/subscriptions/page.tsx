"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Loader2,
  ExternalLink,
  RefreshCw,
  Star,
  Github,
} from "lucide-react";

import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  getSubscriptionData,
  syncSubscriptionStatus,
} from "@/module/payment/action";
import { Spinner } from "@/components/ui/spinner";
import { fireStarConfetti } from "@/components/ui/confetti";
import { Highlighter } from "@/components/ui/highlighter";

const PLAN_FEATURES = {
  free: [
    { name: "Up to 5 repositories", included: true },
    { name: "Up to 5 reviews per repository", included: true },
    { name: "Basic code reviews", included: true },
    { name: "Community support", included: true },
    { name: "Advanced analytics", included: false },
    { name: "Priority support", included: false },
  ],
  pro: [
    { name: "Unlimited repositories", included: true },
    { name: "Unlimited reviews", included: true },
    { name: "Advanced code reviews", included: true },
    { name: "Email support", included: true },
    { name: "Advanced analytics", included: true },
    { name: "Priority support", included: true },
  ],
};

export default function SubscriptionPage() {
  const [syncLoading, setSyncLoading] = useState(false);
  const [previouslyStarred, setPreviouslyStarred] = useState<boolean | null>(
    null,
  );
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["subscription-data"],
    queryFn: getSubscriptionData,
    refetchOnWindowFocus: true,
  });

  // Track if user was previously starred to detect new stars
  useEffect(() => {
    if (data?.user && previouslyStarred === null) {
      setPreviouslyStarred(data.user.starredRepo);
    }
  }, [data, previouslyStarred]);

  // Auto-sync on page load to check latest star status
  useEffect(() => {
    const sync = async () => {
      try {
        await syncSubscriptionStatus();
        refetch();
      } catch (e) {
        console.error("Failed to sync star status on load", e);
      }
    };
    sync();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground">
            Failed to load subscription data
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load subscription data. Please try again.
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground">
            Please sign in to view subscription options
          </p>
        </div>
      </div>
    );
  }

  const currentTier = data.user.subscriptionTier as "FREE" | "PRO";
  const isPro = currentTier === "PRO";
  const hasStarred = data.user.starredRepo;

  const handleSync = async () => {
    try {
      setSyncLoading(true);
      const result = await syncSubscriptionStatus();

      if (result.success) {
        if (result.hasStarred) {
          // Fire confetti if this is a new star (wasn't starred before)
          if (!previouslyStarred) {
            fireStarConfetti();
          }
          setPreviouslyStarred(true);
          toast.success("⭐ Thank you for starring! Pro access activated.");
        } else {
          setPreviouslyStarred(false);
          toast.info("Star our repo to unlock Pro features!");
        }
        refetch();
      } else {
        toast.error(result.message || "Failed to check star status");
      }
    } catch (error) {
      toast.error("Failed to sync subscription");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleStarRepo = () => {
    window.open(data.repoUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground">
            Star our repository to unlock{" "}
            <Highlighter action="highlight" color="#FFD700">
              Pro features for free
            </Highlighter>{" "}
            - no credit card required!
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncLoading}
        >
          {syncLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Check Star Status
        </Button>
      </div>

      {success === "true" && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Your subscription has been updated successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Star CTA Banner */}
      {!hasStarred && (
        <Card className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
          <CardContent className="flex items-center justify-between ">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-full">
                <Star className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  Get{" "}
                  <Highlighter action="underline" color="#F59E0B">
                    $10/month Pro Plan
                  </Highlighter>{" "}
                  for FREE!
                </h3>
                <p className="text-muted-foreground text-xs">
                  Star our GitHub repository to unlock all Pro features.
                </p>
              </div>
            </div>
            <Button onClick={handleStarRepo} size="sm" className="gap-1.5">
              <Github className="h-3.5 w-3.5" />
              Star on GitHub
            </Button>
          </CardContent>
        </Card>
      )}

      {hasStarred && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <AlertTitle>Thank you for starring! ⭐</AlertTitle>
          <AlertDescription>
            You have Pro access. Keep the star to maintain your Pro benefits. If
            you unstar, you&apos;ll be downgraded to the Free plan.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Usage */}
      {data.limits && (
        <Card>
          <CardHeader>
            <CardTitle>Current Usage</CardTitle>
            <CardDescription>
              Your current plan limits and usage
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Repositories</span>
                  <Badge
                    variant={
                      data.limits.repositories.canAdd
                        ? "default"
                        : "destructive"
                    }
                  >
                    {data.limits.repositories.current} /{" "}
                    {data.limits.repositories.limit ?? "∞"}
                  </Badge>
                </div>

                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      data.limits.repositories.canAdd
                        ? "bg-primary"
                        : "bg-destructive"
                    }`}
                    style={{
                      width: data.limits.repositories.limit
                        ? `${Math.min(
                            (data.limits.repositories.current /
                              data.limits.repositories.limit) *
                              100,
                            100,
                          )}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Reviews per Repository
                  </span>
                  <Badge variant="outline">
                    {isPro ? "Unlimited" : "5 per repo"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {isPro
                    ? "No limits on reviews"
                    : "Free tier allows 5 reviews per repository"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <Card className={!isPro ? "ring-2 ring-primary" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Free</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </div>
              {!isPro && <Badge className="ml-2">Current Plan</Badge>}
            </div>

            <div className="mt-2">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/forever</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              {PLAN_FEATURES.free.map((feature) => (
                <div key={feature.name} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={feature.included ? "" : "text-muted-foreground"}
                  >
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button className="w-full" variant="outline" disabled>
              {isPro ? "Downgrade by Unstarring" : "Current Plan"}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card
          className={isPro ? "ring-2 ring-primary" : "ring-2 ring-yellow-500"}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Pro
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </CardTitle>
                <CardDescription>For professional developers</CardDescription>
              </div>
              {isPro && <Badge className="ml-2">Current Plan</Badge>}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-medium text-muted-foreground line-through decoration-2">
                $10
              </span>
              <span className="text-3xl font-bold">
                FREE
              </span>
              <span className="text-muted-foreground">with ⭐</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Just star our repo - save $120/year!
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              {PLAN_FEATURES.pro.map((feature) => (
                <div key={feature.name} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={feature.included ? "" : "text-muted-foreground"}
                  >
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            {isPro && hasStarred ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={handleStarRepo}
              >
                <Star className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
                Thanks for Starring!
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={handleStarRepo}
              >
                <Github className="mr-2 h-4 w-4" />
                Star to Unlock Pro
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              After starring, click &quot;Check Star Status&quot; to activate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
