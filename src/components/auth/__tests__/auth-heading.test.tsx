import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthHeading } from "../auth-heading";

describe("AuthHeading", () => {
  it("renders title and description", () => {
    render(
      <AuthHeading title="Sign in" description="Enter your credentials to continue." />,
    );

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.getByText("Enter your credentials to continue."),
    ).toBeInTheDocument();
  });

  it("omits the description when not provided", () => {
    render(<AuthHeading title="Sign in" />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
