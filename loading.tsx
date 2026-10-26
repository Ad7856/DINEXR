export default function Loading() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-6" role="status" aria-label="Loading">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-board-soft" />
      <div className="h-32 animate-pulse rounded-card bg-board-soft" />
      <div className="h-32 animate-pulse rounded-card bg-board-soft" />
    </div>
  );
}
