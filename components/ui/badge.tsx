import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge Component - Design System
 *
 * Tag chips (square, monochrome)
 * Filter chip components (square, monochrome)
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-150 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/85",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/70",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/85",
        outline:
          "border-border bg-transparent text-foreground [a&]:hover:bg-accent",
        muted: "border-transparent bg-muted text-muted-foreground",
        neon: "border-neon-cyan/50 bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/** Standard badge/tag chip */
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

/** Filter chip with interactive states */
function FilterChip({
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      data-slot="filter-chip"
      data-active={active}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-all duration-150 cursor-pointer",
        "hover:bg-accent",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-foreground border-border",
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants, FilterChip };
