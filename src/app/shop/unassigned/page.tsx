export default function UnassignedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
        ⚠️
      </div>
      <h1 className="text-lg font-semibold text-slate-900">No shop assigned</h1>
      <p className="max-w-sm text-sm text-muted">
        Your account isn&apos;t linked to a shop yet. Please contact the admin to get
        assigned before you can manage inventory.
      </p>
    </div>
  );
}
