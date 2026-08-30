"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import type { NavSection } from "@/components/layout/nav";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SidebarUser({
  userName,
  roleLabel,
  sections,
  collapsed,
}: {
  userName: string;
  roleLabel: string;
  sections: NavSection[];
  collapsed: boolean;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const settingsHref =
    sections
      .flatMap((s) => s.items)
      .find((i) => i.label.toLowerCase() === "settings")?.href ?? "#";

  return (
    <Dropdown
      label="User menu"
      direction="up"
      buttonClassName={cn(
        "w-full rounded-lg p-0 hover:bg-zinc-100 dark:hover:bg-zinc-900",
      )}
      menuClassName="w-56"
      trigger={
        <span
          aria-hidden
          className={cn(
            "flex w-full items-center gap-2.5 px-2 py-1.5",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {initials(userName || "?")}
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
              <span className="max-w-full truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {userName}
              </span>
              <span className="max-w-full truncate text-[11px] text-muted capitalize">
                {roleLabel}
              </span>
            </span>
          )}
        </span>
      }
    >
      {settingsHref !== "#" && (
        <>
          <DropdownItem
            icon={<Settings />}
            onClick={() => router.push(settingsHref)}
          >
            Account settings
          </DropdownItem>
          <DropdownSeparator />
        </>
      )}
      <DropdownItem icon={theme === "dark" ? <Sun /> : <Moon />} onClick={toggleTheme}>
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem
        variant="danger"
        icon={<LogOut />}
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </DropdownItem>
    </Dropdown>
  );
}
