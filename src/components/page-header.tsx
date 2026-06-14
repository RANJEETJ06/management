import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-7 animate-fade-up",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-[1.7rem] sm:text-[2rem] font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        <div className="accent-rule mt-2.5" />
        {description && (
          <p className="text-muted-foreground text-sm mt-2.5 max-w-prose">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
