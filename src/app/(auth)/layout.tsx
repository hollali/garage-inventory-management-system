import { FaWrench } from "react-icons/fa";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-indigo-400 text-white shadow-sm">
            <FaWrench className="size-6 animate-wiggle" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Garage Inventory Management
          </h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
