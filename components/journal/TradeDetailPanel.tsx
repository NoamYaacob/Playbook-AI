"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Tag as TagIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AdherenceBadge } from "@/components/shared/AdherenceBadge";
import { AdherenceEnginePanel } from "@/components/journal/AdherenceEnginePanel";
import { ScreenshotManager } from "@/components/journal/ScreenshotManager";
import {
  TradeQuestionnaire,
  TradeQuestionnaireData,
} from "@/components/journal/TradeQuestionnaire";
import {
  reviewTrade,
  TradeWithRelations,
  saveTradeQuestionnaire,
  addTradeScreenshot,
  deleteTradeScreenshot,
  updateTradeScreenshotLabel,
} from "@/lib/actions/trade.actions";
import { AdherenceStatus, ScreenshotType, TradeRow, TradeScreenshotRow } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TradeDetailPanelProps {
  trade: TradeWithRelations;
  userId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(entryAt: Date, exitAt: Date | null | undefined): string {
  if (!exitAt) return "Open";
  const diffMs = new Date(exitAt).getTime() - new Date(entryAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function computeRValue(trade: TradeWithRelations): string {
  if (trade.pnlR != null) return `${trade.pnlR >= 0 ? "+" : ""}${trade.pnlR.toFixed(2)}R`;
  return "—";
}

// ---------------------------------------------------------------------------
// Metric item
// ---------------------------------------------------------------------------

function MetricItem({
  label,
  value,
  mono = false,
  colorClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  colorClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          colorClass ?? "text-slate-100",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adapt TradeWithRelations to TradeRow for child components
// ---------------------------------------------------------------------------

function toTradeRow(trade: TradeWithRelations): TradeRow {
  return {
    id: trade.id,
    userId: trade.userId,
    strategyId: trade.strategyId,
    importBatchId: trade.importBatchId,
    symbol: trade.symbol,
    market: trade.market as TradeRow["market"],
    side: trade.side as TradeRow["side"],
    entryAt: trade.entryAt,
    exitAt: trade.exitAt,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    stopPrice: trade.stopPrice,
    targetPrice: trade.targetPrice,
    size: trade.size,
    fees: trade.fees,
    pnlAmount: trade.pnlAmount,
    pnlR: trade.pnlR,
    session: trade.session,
    setupType: trade.setupType,
    isOpen: trade.isOpen,
    adherence: trade.adherence as AdherenceStatus,
    adherenceNotes: trade.adherenceNotes,
    wasReviewed: trade.wasReviewed,
    whyTaken: trade.whyTaken,
    setupTrigger: trade.setupTrigger,
    stopRationale: trade.stopRationale,
    targetRationale: trade.targetRationale,
    mistakeNotes: trade.mistakeNotes,
    lessonLearned: trade.lessonLearned,
    emotionBefore: trade.emotionBefore as TradeRow["emotionBefore"],
    emotionAfter: trade.emotionAfter as TradeRow["emotionAfter"],
    riskViolations: trade.riskViolations ?? [],
    aiAdherence: trade.aiAdherence as TradeRow["aiAdherence"],
    aiConfidence: trade.aiConfidence,
    aiReasoning: trade.aiReasoning,
    aiSetupClassification: trade.aiSetupClassification,
    aiAnalyzedAt: trade.aiAnalyzedAt,
    whatDidYouSee: trade.whatDidYouSee,
    wasPlanned: trade.wasPlanned,
    wouldTakeAgain: trade.wouldTakeAgain,
    aiMatchedRules: trade.aiMatchedRules ?? [],
    aiBrokenRules: trade.aiBrokenRules ?? [],
    aiCoachingNote: trade.aiCoachingNote,
    setupClusterId: trade.setupClusterId,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}

function toScreenshotRows(
  screenshots: TradeWithRelations["screenshots"],
): TradeScreenshotRow[] {
  return screenshots.map((ss) => ({
    id: ss.id,
    tradeId: ss.tradeId,
    url: ss.url,
    screenshotType: (ss.screenshotType ?? "OTHER") as ScreenshotType,
    label: ss.label,
    notes: ss.notes,
    sortOrder: ss.sortOrder ?? 0,
    createdAt: ss.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TradeDetailPanel({ trade, userId }: TradeDetailPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingQuestionnaire, setIsSavingQuestionnaire] = useState(false);

  const pnl = trade.pnlAmount;
  const pnlPositive = pnl != null && pnl >= 0;
  const duration = formatDuration(trade.entryAt, trade.exitAt);
  const tradeRow = toTradeRow(trade);
  const screenshotRows = toScreenshotRows(trade.screenshots);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleAnalyze() {
    setIsAnalyzing(true);
    // Real AI analysis would call an AI server action here
    // For now simulate delay then refresh
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
    router.refresh();
  }

  async function handleSaveQuestionnaire(data: TradeQuestionnaireData) {
    setIsSavingQuestionnaire(true);
    try {
      await saveTradeQuestionnaire(trade.id, userId, {
        whatDidYouSee: data.whatDidYouSee,
        setupTrigger: data.setupTrigger,
        stopRationale: data.stopRationale,
        targetRationale: data.targetRationale,
        wasPlanned: data.wasPlanned,
        emotionBefore: data.emotionBefore || undefined,
        emotionAfter: data.emotionAfter || undefined,
        wouldTakeAgain: data.wouldTakeAgain,
        whyTaken: data.whyTaken,
        mistakeNotes: data.mistakeNotes,
        lessonLearned: data.lessonLearned,
        adherence: data.adherence || undefined,
        adherenceNotes: data.adherenceNotes,
      });
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSavingQuestionnaire(false);
    }
  }

  async function handleAddScreenshot(
    file: File,
    type: ScreenshotType,
    label?: string,
  ) {
    // In a real app this would upload to object storage first, then call the action
    // For now we create a local object URL as a placeholder
    const url = URL.createObjectURL(file);
    await addTradeScreenshot(trade.id, userId, {
      url,
      screenshotType: type,
      label,
    });
    router.refresh();
  }

  async function handleDeleteScreenshot(screenshotId: string) {
    await deleteTradeScreenshot(screenshotId, userId);
    router.refresh();
  }

  async function handleUpdateScreenshotLabel(
    screenshotId: string,
    label: string,
    notes?: string,
  ) {
    await updateTradeScreenshotLabel(screenshotId, userId, label, notes);
    router.refresh();
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8">
        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
          {/* ================================================================
              LEFT COLUMN
          ================================================================ */}
          <div className="space-y-6 min-w-0">
            {/* Trade header */}
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Symbol */}
                      <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
                        {trade.symbol}
                      </h1>
                      {/* Market */}
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-slate-300 text-xs"
                      >
                        {trade.market}
                      </Badge>
                      {/* Side */}
                      <Badge
                        className={cn(
                          "text-xs font-semibold border",
                          trade.side === "LONG"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30",
                        )}
                      >
                        {trade.side === "LONG" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trade.side}
                      </Badge>
                      {/* Adherence */}
                      <AdherenceBadge status={trade.adherence as AdherenceStatus} />
                      {/* Setup type */}
                      {trade.setupType && (
                        <Badge variant="secondary" className="text-xs">
                          {trade.setupType}
                        </Badge>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(trade.entryAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {trade.session && (
                        <span className="ml-1 text-slate-500">· {trade.session}</span>
                      )}
                    </div>
                  </div>

                  {/* PnL hero */}
                  <div className="text-right shrink-0">
                    {pnl != null ? (
                      <>
                        <p
                          className={cn(
                            "text-3xl font-bold tabular-nums",
                            pnlPositive ? "text-emerald-400" : "text-rose-400",
                          )}
                        >
                          {pnlPositive ? "+" : ""}
                          {formatCurrency(pnl)}
                        </p>
                        <p className="text-sm text-slate-400 mt-0.5 tabular-nums">
                          {computeRValue(trade)}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm">No PnL</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics grid */}
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Trade Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
                  <MetricItem
                    label="Entry"
                    value={trade.entryPrice.toFixed(4)}
                    mono
                  />
                  <MetricItem
                    label="Exit"
                    value={trade.exitPrice != null ? trade.exitPrice.toFixed(4) : "—"}
                    mono
                  />
                  <MetricItem
                    label="Stop"
                    value={trade.stopPrice != null ? trade.stopPrice.toFixed(4) : "—"}
                    mono
                  />
                  <MetricItem
                    label="Target"
                    value={trade.targetPrice != null ? trade.targetPrice.toFixed(4) : "—"}
                    mono
                  />
                  <MetricItem
                    label="Size"
                    value={trade.size.toString()}
                    mono
                  />
                  <MetricItem
                    label="Fees"
                    value={trade.fees != null ? formatCurrency(trade.fees) : "—"}
                    mono
                  />
                  <MetricItem
                    label="R-Value"
                    value={computeRValue(trade)}
                    colorClass={
                      trade.pnlR != null
                        ? trade.pnlR >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                        : undefined
                    }
                  />
                  <MetricItem label="Duration" value={duration} />
                </div>

                {/* Extra booleans row */}
                <div className="flex flex-wrap gap-4 pt-1">
                  {trade.wasPlanned != null && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5",
                          trade.wasPlanned ? "text-emerald-400" : "text-slate-500",
                        )}
                      />
                      <span className="text-slate-400">
                        {trade.wasPlanned ? "Planned trade" : "Reactive trade"}
                      </span>
                    </div>
                  )}
                  {trade.wouldTakeAgain != null && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5",
                          trade.wouldTakeAgain ? "text-emerald-400" : "text-slate-500",
                        )}
                      />
                      <span className="text-slate-400">
                        {trade.wouldTakeAgain ? "Would take again" : "Would not take again"}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="bg-slate-700/50" />

                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Entry: {new Date(trade.entryAt).toLocaleString()}
                  </span>
                  {trade.exitAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Exit: {new Date(trade.exitAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk violations */}
            {trade.riskViolations && trade.riskViolations.length > 0 && (
              <Card className="bg-rose-950/30 border-rose-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Violations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {(trade.riskViolations as string[]).map((v, i) => (
                      <li
                        key={i}
                        className="text-sm text-rose-300"
                      >
                        {v.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Adherence Engine */}
            <AdherenceEnginePanel
              trade={tradeRow}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />

            {/* Screenshots */}
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Screenshots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScreenshotManager
                  tradeId={trade.id}
                  screenshots={screenshotRows}
                  onAdd={handleAddScreenshot}
                  onDelete={handleDeleteScreenshot}
                  onUpdateLabel={handleUpdateScreenshotLabel}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            {trade.tradeTags && trade.tradeTags.length > 0 && (
              <Card className="bg-slate-800/60 border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <TagIcon className="h-3.5 w-3.5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {trade.tradeTags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${tag.color ?? "#6366f1"}20`,
                          color: tag.color ?? "#6366f1",
                          border: `1px solid ${tag.color ?? "#6366f1"}40`,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ================================================================
              RIGHT COLUMN — Trade Questionnaire
          ================================================================ */}
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-1">
              <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
                <h2 className="text-sm font-semibold text-slate-100">Trade Reflection</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Answer these questions to build your trading journal.
                </p>
              </div>
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <TradeQuestionnaire
                  trade={tradeRow}
                  onSave={handleSaveQuestionnaire}
                  isSaving={isSavingQuestionnaire}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
