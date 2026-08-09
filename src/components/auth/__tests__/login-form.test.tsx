import { vi } from "vitest";

const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

const { needsTotpMock } = vi.hoisted(() => ({ needsTotpMock: vi.fn() }));
vi.mock("@/lib/actions/auth", () => ({
  needsTotp: needsTotpMock,
}));

const routerPush = vi.fn();
const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LoginForm } from "../login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
    needsTotpMock.mockReset();
    needsTotpMock.mockResolvedValue({ requires: false });
    routerPush.mockClear();
    routerRefresh.mockClear();
  });

  it("announces invalid credentials with an alert", async () => {
    signInMock.mockResolvedValue({
      error: "CredentialsSignin",
      ok: false,
      status: 401,
      url: null,
    });

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password.");
  });

  it("redirects to the callback URL on success", async () => {
    signInMock.mockResolvedValue({
      error: null,
      ok: true,
      status: 200,
      url: "http://localhost/",
    });

    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/"));
  });
});
