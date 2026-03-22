import { Info } from "lucide-react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// DisclaimerBanner
// Reusable disclaimer component for AI/analysis sections.
// ---------------------------------------------------------------------------

interface Props {
  variant?: "subtle" | "prominent" | "inline";
  message?: string;
  locale?: Locale;
}

export function DisclaimerBanner({ variant = "subtle", message, locale = DEFAULT_LOCALE }: Props) {
  const text = message ?? getDictionary(locale).disclaimer.defaultMessage;

  if (variant === "prominent") {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-300 leading-relaxed">{text}</p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Info className="h-3 w-3 shrink-0" />
        {text}
      </span>
    );
  }

  // subtle (default)
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs text-slate-500 italic leading-relaxed",
      )}
    >
      <Info className="h-3 w-3 mt-0.5 shrink-0" />
      {text}
    </p>
  );
}
