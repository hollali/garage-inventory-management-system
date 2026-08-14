import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "../modal";

function Harness({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button>Open button</button>
      <Modal open={open} title="Test modal" onClose={onClose}>
        {children}
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("renders content when open and nothing after closing", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Harness open={false} onClose={onClose}>
        <p>Modal body</p>
      </Harness>,
    );

    expect(screen.queryByText("Modal body")).not.toBeInTheDocument();

    rerender(
      <Harness open={true} onClose={onClose}>
        <p>Modal body</p>
      </Harness>,
    );

    expect(await screen.findByText("Modal body")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      expect.any(String),
    );

    rerender(
      <Harness open={false} onClose={onClose}>
        <p>Modal body</p>
      </Harness>,
    );

    await waitFor(() => expect(screen.queryByText("Modal body")).not.toBeInTheDocument());
  });

  it("moves focus to the first focusable element on open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Harness open={false} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    rerender(
      <Harness open={true} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  });

  it("restores focus to the previously focused element on close", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Harness open={false} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    const openButton = screen.getByRole("button", { name: "Open button" });
    openButton.focus();

    rerender(
      <Harness open={true} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    rerender(
      <Harness open={false} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    expect(openButton).toHaveFocus();
  });

  it("restores the original body overflow value on close", () => {
    const onClose = vi.fn();
    document.body.style.overflow = "scroll";

    const { rerender, unmount } = render(
      <Harness open={true} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Harness open={false} onClose={onClose}>
        <button>Inside action</button>
      </Harness>,
    );

    expect(document.body.style.overflow).toBe("scroll");
    document.body.style.overflow = "";
    unmount();
  });

  it("closes on Escape and overlay mousedown, but not inner clicks", () => {
    const onClose = vi.fn();
    render(
      <Harness open={true} onClose={onClose}>
        <p>Modal body</p>
      </Harness>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(screen.getByText("Modal body"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(document.querySelector(".fixed.inset-0")!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps Tab focus within the dialog", () => {
    const onClose = vi.fn();
    render(
      <Harness open={true} onClose={onClose}>
        <button>Inside A</button>
        <button>Inside B</button>
      </Harness>,
    );

    const closeButton = screen.getByRole("button", { name: "Close dialog" });
    const b = screen.getByRole("button", { name: "Inside B" });

    b.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(b).toHaveFocus();
  });
});
