import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  locale?: Locale;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
  locale = DEFAULT_LOCALE,
}: PageHeaderProps) {
  const dictionary = getDictionary(locale);

  return (
    <div className={cn("mb-8 space-y-3", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label={dictionary.pageHeader.breadcrumbLabel} className="flex items-center gap-1.5">
          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={idx}>
              {idx > 0 && (
                <ChevronRight className="h-3 w-3 text-slate-700 shrink-0" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-[0.18em]",
                    idx === breadcrumbs.length - 1
                      ? "text-slate-300"
                      : "text-slate-500"
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/55 px-5 py-5 shadow-[0_16px_40px_rgba(2,6,23,0.28)] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {dictionary.app.workspaceView}
          </p>
          <h1 className="text-2xl font-semibold text-white tracking-tight leading-tight sm:text-[2rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action buttons slot */}
        {actions && (
          <div className="flex w-full flex-col gap-2 shrink-0 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
