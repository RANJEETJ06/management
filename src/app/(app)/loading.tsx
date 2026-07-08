export default function Loading() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy>
      <div className="space-y-3">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted/70 animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg border border-border/70 bg-card animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-lg border border-border/70 bg-card animate-pulse" />
        <div className="h-64 rounded-lg border border-border/70 bg-card animate-pulse" />
      </div>
    </div>
  );
}
