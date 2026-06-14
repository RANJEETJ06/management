import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border/70 bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-primary/20 bg-primary/10 text-primary dark:bg-primary/15",
        warn: "border-gold/30 bg-gold-soft text-[hsl(34_72%_30%)] dark:text-gold",
        danger:
          "border-destructive/25 bg-destructive/10 text-destructive",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
