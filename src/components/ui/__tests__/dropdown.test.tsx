import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";

describe("Dropdown", () => {
  it("restores focus to the trigger when closed with Escape", async () => {
    render(
      <Dropdown label="User menu" trigger={<span>AB</span>}>
        <DropdownItem>Account settings</DropdownItem>
      </Dropdown>,
    );

    const trigger = screen.getByRole("button", { name: "User menu" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("menu")).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });
});
