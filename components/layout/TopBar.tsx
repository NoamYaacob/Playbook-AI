"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Dictionary } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pageTitleKeys: Record<string, keyof Dictionary["pageTitles"]> = {
  "/dashboard": "dashboard",
  "/journal": "journal",
  "/playbook": "playbook",
  "/pre-market": "preMarket",
  "/import": "importTrades",
  "/daily-review": "dailyReview",
  "/settings": "settings",
  "/onboarding": "onboarding",
};

function getPageTitle(pathname: string, dictionary: Dictionary): string {
  // Exact match
  if (pageTitleKeys[pathname]) return dictionary.pageTitles[pageTitleKeys[pathname]];
  // Prefix match
  for (const [path, titleKey] of Object.entries(pageTitleKeys)) {
    if (pathname.startsWith(path + "/")) return dictionary.pageTitles[titleKey];
  }
  // Fallback: capitalize last segment
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || dictionary.app.brandName;
}

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onMenuClick?: () => void;
}

export function TopBar({ user, onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const { dictionary } = useI18n();
  const pageTitle = getPageTitle(pathname, dictionary);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? "U").toUpperCase();

  async function handleSignOut() {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
      {/* Left: Hamburger (mobile) + Page title */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          style={{ marginInlineStart: "-0.25rem" }}
          onClick={onMenuClick}
          aria-label={dictionary.shell.openNavigationMenu}
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div>
          <h1 className="text-lg font-semibold text-white leading-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Notifications + User menu */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-2",
            notifOpen && "bg-slate-800 text-slate-200"
          )}
          onClick={() => setNotifOpen((v) => !v)}
          aria-label={dictionary.shell.viewNotifications}
        >
          <Bell className="w-5 h-5" />
          {/* Unread dot */}
          <span className="absolute top-1.5 h-2 w-2 rounded-full bg-indigo-500" style={{ insetInlineEnd: "0.375rem" }} />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? dictionary.app.genericUserAlt}
                />
                <AvatarFallback className="bg-indigo-600/30 text-indigo-300 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block" style={{ textAlign: "start" }}>
                <p className="text-sm font-medium text-slate-200 leading-tight max-w-[120px] truncate">
                  {user.name ?? dictionary.app.traderFallback}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 bg-slate-800 border-slate-700 text-slate-200"
          >
            <DropdownMenuLabel className="text-slate-400 text-xs font-normal pb-1">
              <div className="font-medium text-slate-200 text-sm">
                {user.name ?? dictionary.app.traderFallback}
              </div>
              <div className="text-slate-500 text-xs truncate">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />

            <DropdownMenuItem asChild>
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 focus:bg-slate-700 text-slate-200"
              >
                <User className="w-4 h-4 text-slate-400" />
                {dictionary.shell.profile}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-700 focus:bg-slate-700 text-slate-200"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                {dictionary.shell.settings}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-700" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center gap-2 cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              {dictionary.shell.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
