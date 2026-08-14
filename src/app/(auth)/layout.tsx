import { BrandMark } from "@/components/layout/sidebar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size="md" />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Garage Inventory Management
          </h1>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm sm:p-8 dark:border-zinc-800">
          {children}
        </div>
      </div>
    </div>
  );
}
