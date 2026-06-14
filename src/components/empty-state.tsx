import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-dashed border-border bg-card/60 p-8 sm:p-14 text-center text-card-foreground",
        className
      )}
    >
      {/* soft gold glow behind the prompt */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-40 w-40 rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative">
        {icon && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            {icon}
          </div>
        )}
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
