"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  BarChart2,
  TrendingUp,
  Shield,
  BookOpen,
  Target,
  AlertTriangle,
  Ban,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  Calendar,
  Globe,
  Image as ImageIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

// Local types mirroring Prisma models
type StrategyRecord = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  isArchived: boolean;
  markets: string[];
  preferredSymbols: string[];
  timeframes: string[];
  tradingSessions: string[];
  allowedHoursStart: string | null;
  allowedHoursEnd: string | null;
  forbiddenHours: unknown;
  setupTypes: string[];
  entryConditions: string | null;
  invalidationConditions: string | null;
  stopLogic: string | null;
  targetLogic: string | null;
  noTradeConditions: string | null;
  minimumRR: number | null;
  maxTradesPerDay: number | null;
  maxDailyLoss: number | null;
  maxDailyLossPct: number | null;
  riskRules: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type StrategyExampleImageRecord = {
  id: string;
  url: string;
  label: string | null;
  isValid: boolean;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StrategyDetailProps {
  strategy: StrategyRecord;
  exampleImages: StrategyExampleImageRecord[];
  tradeCount: number;
  adherenceScore: number;
}

// ---------------------------------------------------------------------------
// Helpers & sub-components
// ---------------------------------------------------------------------------

const MARKET_COLORS: Record<string, string> = {
  FUTURES: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  FOREX: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  STOCKS: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  CRYPTO: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  OPTIONS: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

function SectionCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-slate-700 bg-slate-800/50 p-5", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
          <Icon className="h-4 w-4 text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{value}</p>
    </div>
  );
}

function StatBadge({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-center">
      <Icon className="mb-1.5 h-5 w-5 text-indigo-400" />
      <p className={cn("text-xl font-bold", valueClass ?? "text-slate-100")}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function PillList({ items, colorMap }: { items: string[]; colorMap?: Record<string, string> }) {
  if (!items.length) return <span className="text-sm text-slate-600">None specified</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            colorMap?.[item] ?? "border-slate-600/40 bg-slate-700/40 text-slate-300"
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function RuleRow({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", iconClass ?? "text-slate-500")} />
      <div className="flex flex-1 items-start justify-between gap-4">
        <span className="text-sm text-slate-400">{label}</span>
        {value !== undefined && value !== null && (
          <span className="text-sm font-medium text-slate-200">{value}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StrategyDetail({
  strategy,
  exampleImages,
  tradeCount,
  adherenceScore,
}: StrategyDetailProps) {
  const riskRules = strategy.riskRules as {
    noRevengeTrades?: boolean;
    minLossesBeforePause?: number;
    noSizeIncreaseAfterLoss?: boolean;
    noTradeWithoutStop?: boolean;
  } | null;

  const forbiddenHours = strategy.forbiddenHours as
    | Array<{ start: string; end: string }>
    | null;

  const validImages = exampleImages.filter((img) => img.isValid);
  const invalidImages = exampleImages.filter((img) => !img.isValid);

  const adherenceColor =
    adherenceScore >= 80
      ? "text-green-400"
      : adherenceScore >= 60
      ? "text-amber-400"
      : "text-red-400";

  return (
    <article className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {strategy.isActive && !strategy.isArchived && (
                <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                  Active
                </Badge>
              )}
              {strategy.isArchived && (
                <Badge className="border-slate-600/30 bg-slate-700/30 text-slate-500">
                  Archived
                </Badge>
              )}
              {!strategy.isActive && !strategy.isArchived && (
                <Badge className="border-slate-600/30 bg-slate-700/30 text-slate-400">
                  Inactive
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">{strategy.title}</h1>
            {strategy.description && (
              <p className="mt-2 text-slate-400">{strategy.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Updated {formatDate(strategy.updatedAt)}</span>
          </div>
        </div>
      </header>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatBadge
          icon={BarChart2}
          label="Total Trades"
          value={tradeCount}
        />
        <StatBadge
          icon={TrendingUp}
          label="Adherence Score"
          value={tradeCount > 0 ? `${adherenceScore}%` : "—"}
          valueClass={tradeCount > 0 ? adherenceColor : "text-slate-600"}
        />
        <StatBadge
          icon={Clock}
          label="Created"
          value={formatDate(strategy.createdAt, "MMM yyyy")}
          valueClass="text-slate-300 text-base"
        />
      </div>

      {/* ── Markets & Instruments ──────────────────────────────────────── */}
      <SectionCard icon={Globe} title="Markets & Instruments">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Markets</p>
            <PillList items={strategy.markets} colorMap={MARKET_COLORS} />
          </div>

          {strategy.preferredSymbols.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Preferred Symbols</p>
              <PillList items={strategy.preferredSymbols} />
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Time Rules ─────────────────────────────────────────────────── */}
      <SectionCard icon={Clock} title="Time Rules">
        <div className="space-y-4">
          {strategy.timeframes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Timeframes</p>
              <PillList items={strategy.timeframes} />
            </div>
          )}

          {strategy.tradingSessions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sessions</p>
              <PillList items={strategy.tradingSessions} />
            </div>
          )}

          {(strategy.allowedHoursStart || strategy.allowedHoursEnd) && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-slate-400">Allowed hours:</span>
              <span className="text-sm font-medium text-slate-200">
                {strategy.allowedHoursStart ?? "?"} – {strategy.allowedHoursEnd ?? "?"}
              </span>
            </div>
          )}

          {forbiddenHours && forbiddenHours.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Forbidden Ranges</p>
              <div className="space-y-2">
                {forbiddenHours.map((range, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2"
                  >
                    <Ban className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-sm text-slate-300">
                      {range.start} – {range.end}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!strategy.timeframes.length &&
            !strategy.tradingSessions.length &&
            !strategy.allowedHoursStart &&
            !forbiddenHours?.length && (
              <p className="text-sm text-slate-600">No time rules defined.</p>
            )}
        </div>
      </SectionCard>

      {/* ── Setup Definition ───────────────────────────────────────────── */}
      <SectionCard icon={Layers} title="Setup Definition">
        <div className="space-y-5">
          {strategy.setupTypes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Setup Types</p>
              <PillList items={strategy.setupTypes} />
            </div>
          )}

          <div className="grid gap-5 divide-y divide-slate-700/60">
            <TextBlock label="Entry Conditions" value={strategy.entryConditions} />
            {strategy.entryConditions && <div />}
            <TextBlock label="Invalidation Conditions" value={strategy.invalidationConditions} />
            {strategy.invalidationConditions && <div />}

            <div className="grid gap-5 sm:grid-cols-2">
              <TextBlock label="Stop Logic" value={strategy.stopLogic} />
              <TextBlock label="Target Logic" value={strategy.targetLogic} />
            </div>

            <TextBlock label="No-Trade Conditions" value={strategy.noTradeConditions} />
          </div>

          {!strategy.setupTypes.length &&
            !strategy.entryConditions &&
            !strategy.invalidationConditions &&
            !strategy.stopLogic &&
            !strategy.targetLogic &&
            !strategy.noTradeConditions && (
              <p className="text-sm text-slate-600">No setup definition specified.</p>
            )}
        </div>
      </SectionCard>

      {/* ── Risk Management ────────────────────────────────────────────── */}
      <SectionCard icon={Shield} title="Risk Management">
        <div className="divide-y divide-slate-700/60">
          {strategy.minimumRR !== null && strategy.minimumRR !== undefined && (
            <RuleRow
              icon={Target}
              label="Minimum R:R"
              value={`${strategy.minimumRR}R`}
              iconClass="text-indigo-400"
            />
          )}
          {strategy.maxTradesPerDay !== null && strategy.maxTradesPerDay !== undefined && (
            <RuleRow
              icon={BarChart2}
              label="Max trades per day"
              value={strategy.maxTradesPerDay}
              iconClass="text-indigo-400"
            />
          )}
          {strategy.maxDailyLoss !== null && strategy.maxDailyLoss !== undefined && (
            <RuleRow
              icon={AlertTriangle}
              label="Max daily loss"
              value={`$${strategy.maxDailyLoss.toLocaleString()}`}
              iconClass="text-amber-400"
            />
          )}
          {strategy.maxDailyLossPct !== null && strategy.maxDailyLossPct !== undefined && (
            <RuleRow
              icon={AlertTriangle}
              label="Max daily loss %"
              value={`${strategy.maxDailyLossPct}%`}
              iconClass="text-amber-400"
            />
          )}

          {riskRules?.noRevengeTrades && (
            <RuleRow
              icon={CheckCircle2}
              label="No revenge trades after consecutive losses"
              iconClass="text-green-400"
              value={
                riskRules.minLossesBeforePause
                  ? `Pause after ${riskRules.minLossesBeforePause} losses`
                  : undefined
              }
            />
          )}
          {riskRules?.noSizeIncreaseAfterLoss && (
            <RuleRow
              icon={CheckCircle2}
              label="No size increase after a loss"
              iconClass="text-green-400"
            />
          )}
          {riskRules?.noTradeWithoutStop && (
            <RuleRow
              icon={CheckCircle2}
              label="No trade without a stop loss"
              iconClass="text-green-400"
            />
          )}

          {strategy.minimumRR === null &&
            strategy.maxTradesPerDay === null &&
            strategy.maxDailyLoss === null &&
            strategy.maxDailyLossPct === null &&
            !riskRules?.noRevengeTrades &&
            !riskRules?.noSizeIncreaseAfterLoss &&
            !riskRules?.noTradeWithoutStop && (
              <p className="py-2 text-sm text-slate-600">No risk rules defined.</p>
            )}
        </div>
      </SectionCard>

      {/* ── Example Images ─────────────────────────────────────────────── */}
      {exampleImages.length > 0 && (
        <SectionCard icon={ImageIcon} title="Example Screenshots">
          <div className="space-y-6">
            {validImages.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <p className="text-sm font-medium text-green-400">Valid Setups</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {validImages.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg border border-green-500/20 bg-slate-900 aspect-video"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.label ?? "Valid setup example"}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {img.label && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 px-2 py-1.5">
                          <p className="truncate text-xs text-slate-300">{img.label}</p>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {invalidImages.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <p className="text-sm font-medium text-red-400">Invalid Setups</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {invalidImages.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg border border-red-500/20 bg-slate-900 aspect-video"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.label ?? "Invalid setup example"}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {img.label && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 px-2 py-1.5">
                          <p className="truncate text-xs text-slate-300">{img.label}</p>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      {strategy.notes && (
        <SectionCard icon={BookOpen} title="Notes">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{strategy.notes}</p>
        </SectionCard>
      )}
    </article>
  );
}
