"use client";

import {
  cloneElement,
  isValidElement,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton, type ButtonProps } from "@/components/ui/button";

export function ConfirmAction({
  action,
  hiddenFields,
  confirmTitle = "Are you sure?",
  confirmBody,
  redirectTo,
  children,
  buttonProps,
}: {
  action: (formData: FormData) => void | Promise<unknown>;
  hiddenFields?: Record<string, string>;
  confirmTitle?: string;
  confirmBody?: string;
  redirectTo?: string;
  children: ReactNode;
  buttonProps?: ButtonProps;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;
    const ok = window.confirm(confirmBody ? `${confirmTitle}\n\n${confirmBody}` : confirmTitle);
    if (!ok) return;

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
        if (redirectTo) {
          router.push(redirectTo);
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const singleChild = isValidElement(children)
    ? (children as ReactElement<ButtonProps>)
    : null;
  const isButtonLike =
    singleChild !== null &&
    (singleChild.type === Button || singleChild.type === IconButton);

  return (
    <form ref={formRef} action={action as (formData: FormData) => void} onSubmit={handleSubmit}>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {isButtonLike && singleChild ? (
        cloneElement(singleChild, { ...buttonProps, type: "submit", loading: pending })
      ) : (
        <Button type="submit" loading={pending} {...buttonProps}>
          {children}
        </Button>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
