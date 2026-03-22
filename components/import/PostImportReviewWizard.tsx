"use client";

// ---------------------------------------------------------------------------
// PostImportReviewWizard – guided multi-step review of a trade sample
// ---------------------------------------------------------------------------

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EmotionSelect } from "@/components/shared/EmotionSelect";
import { SetupClusterCard } from "@/components/import/SetupClusterCard";
import {
  updateTrade,
} from "@/lib/actions/trade.actions";
import {
  updatePostImportReviewProgress,
  completePostImportReview,
  generateSetupClusters,
  confirmCluster,
} from "@/lib/actions/import.actions";
import type { PostImportReviewRow, TradeRow, SetupClusterRow, EmotionTag } from "@/types";
import {
  ArrowRight,
  SkipForward,
  Brain,
  CheckCircle2,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Common setup type suggestions shown as chips
// ---------------------------------------------------------------------------

const DEFAULT_SETUP_SUGGESTIONS = [
  "Breakout",
  "Pullback",
  "Reversal",
  "Trend Continuation",
  "Range Fade",
  "Opening Drive",
  "VWAP Reclaim",
  "Supply/Demand",
  "Fair Value Gap",
  "Momentum",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  batchId: string;
  review: PostImportReviewRow;
  sampleTrades: TradeRow[];
  userId: string;
}

interface TradeAnswers {
  whatDidYouSee: string;
  setupTrigger: string;
  wasPlanned: boolean | null;
  setupType: string;
  emotionBefore: EmotionTag | null;
  emotionAfter: EmotionTag | null;
}

type WizardPhase = "reviewing" | "analyzing" | "clusters" | "skipped" | "done";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—";
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function pnlColor(pnl: number | null | undefined): string {
  if (pnl == null) return "text-slate-400";
  if (pnl > 0) return "text-green-400";
  if (pnl < 0) return "text-red-400";
  return "text-slate-400";
}

function emptyAnswers(): TradeAnswers {
  return {
    whatDidYouSee: "",
    setupTrigger: "",
    wasPlanned: null,
    setupType: "",
    emotionBefore: null,
    emotionAfter: null,
  };
}

// ---------------------------------------------------------------------------
// SubStep indicators inside a trade card
// ---------------------------------------------------------------------------

const SUB_STEPS = [
  "Market conditions",
  "Entry trigger",
  "Pre-planned?",
  "Setup label",
  "Emotion: entry",
  "Emotion: exit",
] as const;

type SubStep = 0 | 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostImportReviewWizard({
  batchId,
  review,
  sampleTrades,
  userId,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const [phase, setPhase] = useState<WizardPhase>(
    review.status === "COMPLETED" ? "done" :
    review.status === "SKIPPED" ? "skipped" :
    "reviewing",
  );
  const [tradeIdx, setTradeIdx] = useState(
    Math.min(review.reviewedCount, Math.max(0, sampleTrades.length - 1)),
  );
  const [subStep, setSubStep] = useState<SubStep>(0);
  const [answers, setAnswers] = useState<TradeAnswers>(emptyAnswers());
  const [savingTrade, setSavingTrade] = useState(false);
  const [clusters, setClusters] = useState<SetupClusterRow[]>([]);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const currentTrade = sampleTrades[tradeIdx] ?? null;
  const totalTrades = sampleTrades.length;
  const progressPct = totalTrades > 0 ? (tradeIdx / totalTrades) * 100 : 0;

  // ---------------------------------------------------------------------------
  // Save current trade answers + advance
  // ---------------------------------------------------------------------------

  const saveAndAdvance = useCallback(async () => {
    if (!currentTrade) return;
    setSavingTrade(true);

    try {
      await updateTrade(currentTrade.id, userId, {
        whatDidYouSee: answers.whatDidYouSee || undefined,
        setupTrigger: answers.setupTrigger || undefined,
        wasPlanned: answers.wasPlanned ?? undefined,
        setupType: answers.setupType || undefined,
        emotionBefore: answers.emotionBefore ?? undefined,
        emotionAfter: answers.emotionAfter ?? undefined,
        wasReviewed: true,
      });

      const nextIdx = tradeIdx + 1;

      // Persist progress
      await updatePostImportReviewProgress(review.id, userId, nextIdx);

      if (nextIdx >= totalTrades) {
        // All trades reviewed — start cluster generation
        setPhase("analyzing");
        startTransition(async () => {
          try {
            await completePostImportReview(review.id, userId);
            const result = await generateSetupClusters(batchId, userId);
            setClusters(result);
            setPhase("clusters");
          } catch (err) {
            setClusterError(
              err instanceof Error ? err.message : "Failed to generate clusters",
            );
            setPhase("clusters");
          }
        });
      } else {
        setTradeIdx(nextIdx);
        setSubStep(0);
        setAnswers(emptyAnswers());
      }
    } finally {
      setSavingTrade(false);
    }
  }, [
    currentTrade,
    userId,
    answers,
    tradeIdx,
    totalTrades,
    review.id,
    batchId,
  ]);

  // ---------------------------------------------------------------------------
  // Skip entire review
  // ---------------------------------------------------------------------------

  const handleSkip = useCallback(() => {
    startTransition(async () => {
      try {
        await updateTrade(
          // No-op — we just mark the review skipped
          sampleTrades[0]?.id ?? "",
          userId,
          {},
        );
      } catch {
        // Ignore — best effort
      }
      setPhase("skipped");
    });
  }, [sampleTrades, userId]);

  // ---------------------------------------------------------------------------
  // Sub-step navigation helpers
  // ---------------------------------------------------------------------------

  const canAdvanceSubStep = (): boolean => {
    if (subStep === 0) return answers.whatDidYouSee.trim().length > 0;
    if (subStep === 1) return answers.setupTrigger.trim().length > 0;
    if (subStep === 2) return answers.wasPlanned !== null;
    if (subStep === 3) return answers.setupType.trim().length > 0;
    // emotions are optional
    return true;
  };

  const advanceSubStep = () => {
    if (subStep < 5) {
      setSubStep((s) => (s + 1) as SubStep);
    } else {
      void saveAndAdvance();
    }
  };

  // ---------------------------------------------------------------------------
  // Cluster confirm / rename
  // ---------------------------------------------------------------------------

  const handleConfirmCluster = useCallback(
    (clusterId: string, setupType: string) => {
      startTransition(async () => {
        await confirmCluster(clusterId, userId, setupType);
        setClusters((prev) =>
          prev.map((c) =>
            c.id === clusterId
              ? { ...c, suggestedSetupType: setupType, userConfirmed: true }
              : c,
          ),
        );
      });
    },
    [userId],
  );

  const handleRenameCluster = useCallback(
    (clusterId: string, newName: string) => {
      setClusters((prev) =>
        prev.map((c) => (c.id === clusterId ? { ...c, name: newName } : c)),
      );
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Phase: Skipped
  // ---------------------------------------------------------------------------

  if (phase === "skipped") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center">
          <SkipForward className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-200">Review skipped</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          You can come back and review your trades at any time from the Import page. The
          more context you provide, the better Playbook AI can reflect your unique trading
          patterns.
        </p>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/import")}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Back to Import
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Phase: Done
  // ---------------------------------------------------------------------------

  if (phase === "done") {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-10 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-200">Review complete</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Your trade context has been saved. Playbook AI will use these insights to
          improve setup classification and adherence detection going forward.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/import")}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Back to Import
          </Button>
          <Button
            onClick={() => (window.location.href = "/journal")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Open Journal
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Phase: Analyzing (loading clusters)
  // ---------------------------------------------------------------------------

  if (phase === "analyzing") {
    return (
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-14 text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <Brain className="h-8 w-8 text-indigo-400 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-100">
            Analyzing your trading patterns…
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            This analysis is based entirely on your own trade data. We&apos;re looking for
            recurring behaviors and setup characteristics.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Identifying clusters…
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Phase: Clusters
  // ---------------------------------------------------------------------------

  if (phase === "clusters") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-lg">
              Pattern clusters identified
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              Based on your answers, we&apos;ve identified recurring trading patterns in your
              historical data. Review each cluster and confirm or rename the suggested
              setup label.
            </p>
          </div>
        </div>

        {clusterError && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-400">
            {clusterError}
          </div>
        )}

        {clusters.length === 0 && !clusterError && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            No clusters could be generated from the reviewed trades. This can happen when
            trades have limited context data.
          </div>
        )}

        <div className="space-y-4">
          {clusters.map((cluster) => (
            <SetupClusterCard
              key={cluster.id}
              cluster={cluster}
              onConfirm={handleConfirmCluster}
              onRename={handleRenameCluster}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            {clusters.filter((c) => c.userConfirmed).length} of {clusters.length} clusters
            confirmed
          </p>
          <Button
            onClick={() => setPhase("done")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            disabled={isPending}
          >
            Finish
            <CheckCircle2 className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Phase: Reviewing
  // ---------------------------------------------------------------------------

  if (!currentTrade) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400 text-sm">
        No trades available for review in this batch.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Trade {tradeIdx + 1} of {totalTrades}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending || savingTrade}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip entire review
          </button>
        </div>
        <Progress value={progressPct} className="h-1.5 bg-slate-800" />
      </div>

      {/* ── Trade context card ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 overflow-hidden">
        {/* Trade header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold text-slate-100">
                {currentTrade.symbol}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  currentTrade.side === "LONG"
                    ? "bg-green-500/15 text-green-400"
                    : "bg-red-500/15 text-red-400",
                )}
              >
                {currentTrade.side}
              </span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                {currentTrade.market}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {format(new Date(currentTrade.entryAt), "MMM d, yyyy · HH:mm")}
            </p>
          </div>

          {currentTrade.pnlAmount != null && (
            <div className="text-right">
              <p className={cn("text-lg font-bold tabular-nums", pnlColor(currentTrade.pnlAmount))}>
                {currentTrade.pnlAmount >= 0 ? "+" : ""}
                {currentTrade.pnlAmount.toFixed(2)}
              </p>
              {currentTrade.pnlR != null && (
                <p className={cn("text-xs", pnlColor(currentTrade.pnlR))}>
                  {currentTrade.pnlR >= 0 ? "+" : ""}
                  {currentTrade.pnlR.toFixed(2)}R
                </p>
              )}
            </div>
          )}
        </div>

        {/* Trade details row */}
        <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-800 bg-slate-900/30">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Entry</p>
            <p className="text-sm font-mono text-slate-200">{formatPrice(currentTrade.entryPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Exit</p>
            <p className="text-sm font-mono text-slate-200">{formatPrice(currentTrade.exitPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Size</p>
            <p className="text-sm font-mono text-slate-200">{currentTrade.size}</p>
          </div>
          {currentTrade.setupType && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Setup</p>
              <p className="text-sm text-slate-200">{currentTrade.setupType}</p>
            </div>
          )}
        </div>

        {/* Sub-step progress dots */}
        <div className="px-6 pt-4 flex items-center gap-1.5">
          {SUB_STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "h-1.5 rounded-full flex-1 transition-all",
                i < subStep
                  ? "bg-indigo-500"
                  : i === subStep
                  ? "bg-indigo-400"
                  : "bg-slate-700",
              )}
            />
          ))}
        </div>

        {/* Sub-step content */}
        <div className="px-6 pt-4 pb-6 space-y-4">
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            Step {subStep + 1} of 6 — Help us understand this trade
          </p>

          {/* Sub-step 0: What did you see */}
          {subStep === 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                What did you see in the market?
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe the chart setup, price action, or market condition that caught
                your attention before this trade.
              </p>
              <Textarea
                value={answers.whatDidYouSee}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, whatDidYouSee: e.target.value }))
                }
                placeholder="e.g. Price was holding above the 9 EMA after a pullback, volume was increasing…"
                className="min-h-[96px] bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Sub-step 1: What triggered entry */}
          {subStep === 1 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                What triggered your entry?
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe the specific signal or condition that made you enter at this
                exact moment.
              </p>
              <Textarea
                value={answers.setupTrigger}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, setupTrigger: e.target.value }))
                }
                placeholder="e.g. Break and close above the prior candle high with a momentum spike…"
                className="min-h-[96px] bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Sub-step 2: Was it planned */}
          {subStep === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                Was this trade planned before entry?
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Did you identify this setup in advance as part of your plan, or was it a
                reactive decision?
              </p>
              <div className="flex gap-3">
                {(
                  [
                    { value: true, label: "Yes — it was planned" },
                    { value: false, label: "No — reactive decision" },
                  ] as const
                ).map(({ value, label }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, wasPlanned: value }))}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                      answers.wasPlanned === value
                        ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                        : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-step 3: Setup type */}
          {subStep === 3 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                What setup type best describes this?
              </label>
              <p className="text-xs text-slate-500">
                Choose a suggestion or type your own label.
              </p>
              <Input
                value={answers.setupType}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, setupType: e.target.value }))
                }
                placeholder="e.g. Breakout, Pullback, Reversal…"
                className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                autoFocus
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {DEFAULT_SETUP_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, setupType: s }))}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      answers.setupType === s
                        ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                        : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-step 4: Emotion before */}
          {subStep === 4 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                What were you feeling before you entered?
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Reflecting on your emotional state helps surface patterns between
                emotions and trade outcomes.
              </p>
              <EmotionSelect
                value={answers.emotionBefore}
                onChange={(val) =>
                  setAnswers((a) => ({ ...a, emotionBefore: val }))
                }
                placeholder="Select emotion before entry…"
              />
            </div>
          )}

          {/* Sub-step 5: Emotion after */}
          {subStep === 5 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-200">
                What were you feeling after the trade closed?
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Post-trade emotions often reveal how well the outcome matched your
                expectations.
              </p>
              <EmotionSelect
                value={answers.emotionAfter}
                onChange={(val) =>
                  setAnswers((a) => ({ ...a, emotionAfter: val }))
                }
                placeholder="Select emotion after exit…"
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {subStep > 0 ? (
              <button
                type="button"
                onClick={() => setSubStep((s) => (s - 1) as SubStep)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <Button
              onClick={advanceSubStep}
              disabled={!canAdvanceSubStep() || savingTrade || isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
            >
              {savingTrade || isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : subStep < 5 ? (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : tradeIdx + 1 < totalTrades ? (
                <>
                  Next Trade
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Analyze Patterns
                  <Sparkles className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Subtle educational copy */}
      <p className="text-center text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
        Your answers help identify patterns in your historical trading. This analysis is
        based entirely on your own trade data — no financial advice is generated.
      </p>
    </div>
  );
}
