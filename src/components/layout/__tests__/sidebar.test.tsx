import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import type { NavSection } from "@/components/layout/nav";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));

const sections: NavSection[] = [
  {
    label: "Main",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", exact: true }],
  },
];

describe("Sidebar collapse", () => {
  function wrap(element: React.ReactElement) {
    return (
      <MotionConfig reducedMotion="user">{element}</MotionConfig>
    );
  }

  it("toggles width when the toggle is clicked (reduced-motion off)", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

    render(
      wrap(
        <SidebarProvider sections={sections}>
          <Sidebar
            brand="Test"
            userName="A B"
            roleLabel="Admin"
            sections={sections}
          />
        </SidebarProvider>,
      ),
    );

    const aside = screen
      .getByRole("button", { name: /collapse sidebar/i })
      .closest("aside");

    await waitFor(() => {
      expect(aside?.style.width).toBe("256px");
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    });

    await waitFor(() => {
      expect(aside?.style.width).toBe("64px");
    });

    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeTruthy();
  });

  it("toggles width when the toggle is clicked (reduced-motion on)", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }));

    render(
      wrap(
        <SidebarProvider sections={sections}>
          <Sidebar
            brand="Test"
            userName="A B"
            roleLabel="Admin"
            sections={sections}
          />
        </SidebarProvider>,
      ),
    );

    const aside = screen
      .getByRole("button", { name: /collapse sidebar/i })
      .closest("aside");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    });

    await waitFor(() => {
      expect(aside?.style.width).toBe("64px");
    });

    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeTruthy();
  });
});
