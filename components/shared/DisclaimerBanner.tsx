import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// DisclaimerBanner
// Reusable disclaimer component for AI/analysis sections.
// ---------------------------------------------------------------------------

interface Props {
  variant?: "subtle" | "prominent" | "inline";
  message?: string;
}

const DEFAULT_MESSAGE =
  "All analysis on this platform is based solely on your own defined strategy rules and uploaded trade history. It is provided for educational and reflective purposes only. Nothing here constitutes financial advice, investment recommendations, or signals of any kind.";

export function DisclaimerBanner({ variant = "subtle", message }: Props) {
  const text = message ?? DEFAULT_MESSAGE;

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
