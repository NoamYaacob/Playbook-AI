import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/80",
        secondary:
          "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80",
        outline:
          "border-[var(--border)] text-[var(--foreground)]",
        destructive:
          "border-transparent bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/80",
        success:
          "border-transparent bg-green-500/20 text-green-400 border-green-500/30",
        warning:
          "border-transparent bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        adherent:
          "border-transparent bg-green-500/20 text-green-400 border-green-500/30",
        violated:
          "border-transparent bg-red-500/20 text-red-400 border-red-500/30",
        partial:
          "border-transparent bg-amber-500/20 text-amber-400 border-amber-500/30",
        unreviewed:
          "border-transparent bg-slate-500/20 text-slate-400 border-slate-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
