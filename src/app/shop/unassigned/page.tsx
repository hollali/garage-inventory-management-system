export default function UnassignedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
        ⚠️
      </div>
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No shop assigned</h1>
      <p className="max-w-sm text-sm text-muted">
        Your account isn&apos;t linked to a shop yet. Please contact the admin to get
        assigned before you can manage inventory.
      </p>
    </div>
  );
}
