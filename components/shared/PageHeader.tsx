import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-1", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-2">
          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={idx}>
              {idx > 0 && (
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "text-xs",
                    idx === breadcrumbs.length - 1
                      ? "text-slate-400"
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action buttons slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
