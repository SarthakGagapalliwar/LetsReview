import { cn } from "@/lib/utils";

/**
 * Skeleton Component - Design System
 *
 * Animations:
 * - Light shimmer/loading skeletons
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse", className)}
      {...props}
    />
  );
}

/** Skeleton with shimmer effect */
function SkeletonShimmer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton-shimmer"
      className={cn("animate-shimmer", className)}
      {...props}
    />
  );
}

export { Skeleton, SkeletonShimmer };
