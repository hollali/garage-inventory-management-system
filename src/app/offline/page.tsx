import Link from "next/link";
import { FaWrench } from "react-icons/fa";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-indigo-400 text-white shadow-sm">
        <FaWrench className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-slate-900">You&apos;re offline</h1>
        <p className="max-w-sm text-sm text-muted">
          You&apos;re not connected to the internet. Check your connection and try
          again.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
