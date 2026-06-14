"use client";

// Lightweight native <select> wrapper styled like the rest of the form controls.
// shadcn ships a richer Radix-based Select; this keeps the dependency footprint
// small and works fine on mobile where native pickers are preferable.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-card px-3.5 py-2 text-sm shadow-xs transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:border-ring focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
