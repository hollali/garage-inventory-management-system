"use client";

import {
  isValidElement,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ConfirmAction({
  action,
  hiddenFields,
  confirmTitle = "Are you sure?",
  confirmBody,
  confirmLabel = "Confirm",
  successMessage,
  redirectTo,
  children,
  buttonProps,
}: {
  action: (formData: FormData) => void | Promise<unknown>;
  hiddenFields?: Record<string, string>;
  confirmTitle?: string;
  confirmBody?: string;
  confirmLabel?: string;
  successMessage?: string;
  redirectTo?: string;
  children: ReactNode;
  buttonProps?: ButtonProps;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    setError(null);
    startTransition(async () => {
      try {
        const result = (await action(formData)) as
          | { ok?: boolean; error?: string }
          | undefined;
        if (result?.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        if (successMessage) {
          toast({ title: successMessage });
        }
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const trigger = isValidElement(children) ? (
    <span className="inline-flex" onClick={() => setOpen(true)}>
      {children}
    </span>
  ) : (
    <Button {...buttonProps} onClick={() => setOpen(true)}>
      {children}
    </Button>
  );

  return (
    <>
      {trigger}
      <Modal open={open} onClose={() => setOpen(false)} title={confirmTitle} description={confirmBody} size="sm">
        <form ref={formRef} action={action as (formData: FormData) => void} onSubmit={handleSubmit}>
          {hiddenFields &&
            Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          {error && (
            <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
