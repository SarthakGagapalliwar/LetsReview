import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input Component - Design System
 *
 * Form Design:
 * - Square text inputs with faint borders
 * - Spacious field spacing
 * - Minimal placeholder usage; rely on labels
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground h-10 w-full min-w-0 border border-border/60 bg-background px-3 py-2 text-sm transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring/20",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "dark:bg-background/50",
        className
      )}
      {...props}
    />
  );
}

/** Search input with inline results support */
function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="search"
      data-slot="search-input"
      className={cn(
        "placeholder:text-muted-foreground/60 h-9 w-full min-w-0 border-0 border-b border-border/40 bg-transparent px-0 py-2 text-sm transition-all duration-150 outline-none",
        "focus-visible:border-foreground/30",
        className
      )}
      {...props}
    />
  );
}

export { Input, SearchInput };
