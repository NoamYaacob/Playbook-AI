import { Badge } from "@/components/ui/badge";
import { AdherenceStatus } from "@/types";
import { cn } from "@/lib/utils";

interface AdherenceBadgeProps {
  status: AdherenceStatus;
  className?: string;
}

const adherenceConfig: Record<
  AdherenceStatus,
  { label: string; variant: "adherent" | "violated" | "partial" | "unreviewed" }
> = {
  YES: { label: "In Plan", variant: "adherent" },
  NO: { label: "Off Plan", variant: "violated" },
  PARTIAL: { label: "Partial", variant: "partial" },
  UNREVIEWED: { label: "Unreviewed", variant: "unreviewed" },
};

export function AdherenceBadge({ status, className }: AdherenceBadgeProps) {
  const config = adherenceConfig[status] ?? adherenceConfig.UNREVIEWED;

  return (
    <Badge
      variant={config.variant}
      className={cn("font-medium text-xs", className)}
    >
      {config.label}
    </Badge>
  );
}
