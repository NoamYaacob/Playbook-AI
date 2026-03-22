"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  CalendarCheck,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mobileNavItems: MobileNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Journal", href: "/journal", icon: BookOpen },
  { label: "Playbook", href: "/playbook", icon: Target },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Review", href: "/daily-review", icon: CalendarCheck },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300 active:text-slate-200"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-indigo-400" : "text-slate-500"
                )}
              />
              <span className="leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
