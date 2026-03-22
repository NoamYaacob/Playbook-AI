import { AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RiskBadgeProps {
  violations: number;
  className?: string;
  showCount?: boolean;
}

export function RiskBadge({
  violations,
  className,
  showCount = true,
}: RiskBadgeProps) {
  if (violations === 0) {
    return (
      <Badge
        variant="adherent"
        className={cn("flex items-center gap-1 font-medium text-xs", className)}
      >
        <CheckCircle className="w-3 h-3" />
        {showCount ? "0 violations" : "Clean"}
      </Badge>
    );
  }

  if (violations === 1) {
    return (
      <Badge
        variant="warning"
        className={cn("flex items-center gap-1 font-medium text-xs", className)}
      >
        <AlertTriangle className="w-3 h-3" />
        {showCount ? `${violations} violation` : "Warning"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="violated"
      className={cn("flex items-center gap-1 font-medium text-xs", className)}
    >
      <AlertTriangle className="w-3 h-3" />
      {showCount ? `${violations} violations` : "Risk!"}
    </Badge>
  );
}
