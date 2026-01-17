import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card Component - Design System
 *
 * Square cards with:
 * - Header region
 * - Supplemental metadata section
 * - Optional preview area
 * - Action bar (iconic actions)
 * - Hover reveals secondary metadata
 * - Consistent spacing rhythm (8/16/24)
 * - Glass or lightly frosted backgrounds
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 border py-6 shadow-sm transition-all duration-200 hover:shadow-md group",
        className
      )}
      {...props}
    />
  );
}

/** Card with hover lift effect */
function CardInteractive({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 border py-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer group",
        className
      )}
      {...props}
    />
  );
}

/** Card with glassmorphism effect */
function CardGlass({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "glass text-card-foreground flex flex-col gap-6 py-6 shadow-sm transition-all duration-200 group",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

/** Metadata section that appears on hover */
function CardMeta({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-meta"
      className={cn(
        "text-muted-foreground text-xs px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

/** Preview area for images or content */
function CardPreview({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-preview"
      className={cn("overflow-hidden bg-muted aspect-video", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

/** Action bar with iconic actions */
function CardActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-actions"
      className={cn(
        "flex items-center gap-1 px-6 pt-2 border-t border-border/50",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardInteractive,
  CardGlass,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardMeta,
  CardPreview,
  CardActions,
};
