import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import type { NavSection } from "@/components/layout/nav";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

const mockPathname = { current: "/admin" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname.current,
  useSearchParams: () => new URLSearchParams(),
}));

const sections: NavSection[] = [
  {
    label: "Main",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", exact: true }],
  },
];

const sectionsWithChildren: NavSection[] = [
  {
    label: "Inventory",
    items: [
      {
        href: "/admin/inventory",
        label: "Inventory",
        icon: "inventory",
        children: [
          { href: "/admin/inventory", label: "All items", exact: true },
          { href: "/admin/inventory", label: "Low stock", search: "?type=low", exact: true },
        ],
      },
    ],
  },
];

function matchMediaMock(matchesReducedMotion: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: matchesReducedMotion && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

function wrap(element: React.ReactElement) {
  return <MotionConfig reducedMotion="user">{element}</MotionConfig>;
}

describe("Sidebar collapse", () => {
  it("toggles width when the toggle is clicked (reduced-motion off)", async () => {
    window.matchMedia = matchMediaMock(false);

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
    window.matchMedia = matchMediaMock(true);

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

describe("Collapsed active state", () => {
  it("shows the active indicator on a collapsed parent whose route is active", () => {
    window.matchMedia = matchMediaMock(false);
    mockPathname.current = "/admin/inventory";

    render(
      wrap(
        <SidebarProvider sections={sectionsWithChildren} initiallyCollapsed>
          <Sidebar
            brand="Test"
            userName="A B"
            roleLabel="Admin"
            sections={sectionsWithChildren}
          />
        </SidebarProvider>,
      ),
    );

    const button = screen.getByRole("button", { name: /^Inventory/ });
    const item = button.closest("li");
    expect(item?.querySelector("span.bg-zinc-100")).toBeTruthy();
  });
});

describe("Mobile drawer trigger", () => {
  it("exposes expanded state, closes on Escape, and restores focus to the trigger", async () => {
    window.matchMedia = matchMediaMock(false);

    render(
      wrap(
        <SidebarProvider sections={sections}>
          <Topbar sections={sections} />
          <MobileSidebar
            brand="Test"
            userName="A B"
            roleLabel="Admin"
            sections={sections}
          />
        </SidebarProvider>,
      ),
    );

    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe("mobile-sidebar-nav");

    const dialog = await screen.findByRole("dialog", { name: "Sidebar navigation" });
    expect(dialog.getAttribute("id")).toBe("mobile-sidebar-nav");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});
