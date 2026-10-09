import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover active:bg-brand-active disabled:shadow-none",
  secondary:
    "bg-surface-strong text-foreground hover:bg-border-strong",
  outline:
    "border border-border-strong bg-surface text-foreground shadow-sm hover:border-brand/40 hover:bg-surface-subtle",
  ghost:
    "text-muted hover:bg-surface-strong hover:text-foreground",
  danger:
    "bg-rose-600 text-white shadow-sm hover:bg-rose-500 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

const baseClasses =
  "relative inline-flex select-none items-center justify-center rounded-xl font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {loading && <span className="sr-only">Loading</span>}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { label: string }
>(({ label, children, className, variant = "ghost", ...props }, ref) => {
  const iconVariant =
    variant === "danger"
      ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
      : variant === "ghost"
        ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
        : null;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      className={cn("size-8 shrink-0 rounded-md p-0", iconVariant, className)}
      {...props}
    >
      {children}
    </Button>
  );
});
IconButton.displayName = "IconButton";

type ButtonLinkProps = Omit<React.ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
};

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <Link
      ref={ref}
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
ButtonLink.displayName = "ButtonLink";
