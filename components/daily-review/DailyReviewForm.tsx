"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EmotionSelect } from "@/components/shared/EmotionSelect";
import { AdherenceBadge } from "@/components/shared/AdherenceBadge";
import { createOrUpdateDailyReview } from "@/lib/actions/review.actions";
import { TradeRow, DailyReviewRow, EmotionTag, AdherenceStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

const reviewFormSchema = z.object({
  topMistakes: z.array(z.string()),
  emotionalState: z.string().nullable().optional(),
  marketContext: z.string().optional(),
  userNotes: z.string().optional(),
  tomorrowPlan: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DailyReviewFormProps {
  userId: string;
  date: Date;
  trades: TradeRow[];
  existingReview: DailyReviewRow | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyReviewForm({ userId, date, trades, existingReview }: DailyReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(existingReview?.aiSummary ?? null);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(
    existingReview?.aiImprovementSuggestions ?? null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mistake input
  const [mistakeInput, setMistakeInput] = useState("");

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      topMistakes: existingReview?.topMistakes ?? [],
      emotionalState: existingReview?.emotionalState ?? null,
      marketContext: existingReview?.marketContext ?? "",
      userNotes: existingReview?.userNotes ?? "",
      tomorrowPlan: existingReview?.tomorrowPlan ?? "",
    },
  });

  const mistakes = form.watch("topMistakes");

  // -------------------------------------------------------------------------
  // Summary stats
  // -------------------------------------------------------------------------

  const closedTrades = trades.filter((t) => !t.isOpen && t.pnlAmount != null);
  const inPlanCount = trades.filter((t) => t.adherence === "YES").length;
  const violationCount = trades.filter(
    (t) => t.adherence === "NO" || t.riskViolations.length > 0,
  ).length;
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnlAmount ?? 0), 0);
  const winCount = closedTrades.filter((t) => (t.pnlAmount ?? 0) > 0).length;

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function addMistake() {
    const val = mistakeInput.trim();
    if (!val) return;
    const current = form.getValues("topMistakes");
    form.setValue("topMistakes", [...current, val]);
    setMistakeInput("");
  }

  function removeMistake(index: number) {
    const current = form.getValues("topMistakes");
    form.setValue(
      "topMistakes",
      current.filter((_, i) => i !== index),
    );
  }

  async function onSubmit(values: ReviewFormValues, isCompleted = false) {
    setSaveError(null);
    setSaveSuccess(false);
    startTransition(async () => {
      try {
        await createOrUpdateDailyReview(userId, date, {
          topMistakes: values.topMistakes,
          emotionalState: values.emotionalState ?? null,
          marketContext: values.marketContext ?? null,
          userNotes: values.userNotes ?? null,
          tomorrowPlan: values.tomorrowPlan ?? null,
          isCompleted,
        });
        setSaveSuccess(true);
        router.refresh();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save review");
      }
    });
  }

  function handleGenerateAI() {
    setIsGeneratingAI(true);
    // Placeholder: in production, call an AI server action
    setTimeout(() => {
      setAiSummary(
        "Today's session showed strong discipline in the first half, with all entries meeting setup criteria. However, two trades in the afternoon session deviated from the playbook — both entered outside the defined session hours. The overall PnL was positive, driven by the morning setups.",
      );
      setAiSuggestions(
        "• Review the session-hours rule in your playbook to reinforce the time filter.\n• Consider a post-lunch checklist to reset focus before re-entering the market.\n• The two losing afternoon trades shared the same pattern — document this as a reminder.",
      );
      setIsGeneratingAI(false);
    }, 1800);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Date header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-indigo-400 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-50">Daily Review</h1>
            <p className="text-sm text-slate-400">{dateLabel}</p>
          </div>
        </div>
        {existingReview?.isCompleted && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Completed
          </Badge>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Trades", value: trades.length.toString(), neutral: true },
          {
            label: "In Plan",
            value: inPlanCount.toString(),
            positive: inPlanCount > 0,
          },
          {
            label: "Violations",
            value: violationCount.toString(),
            negative: violationCount > 0,
          },
          {
            label: "Total PnL",
            value: closedTrades.length > 0 ? formatCurrency(totalPnl) : "—",
            positive: totalPnl > 0,
            negative: totalPnl < 0,
          },
        ].map((stat) => (
          <Card key={stat.label} className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{stat.label}</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  stat.positive ? "text-emerald-400" : stat.negative ? "text-rose-400" : "text-slate-200",
                )}
              >
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 1: Today's Trades */}
      {trades.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Today&apos;s Trades ({trades.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trades.map((trade) => {
                const pnl = trade.pnlAmount;
                const pnlPositive = (pnl ?? 0) >= 0;
                return (
                  <Link
                    key={trade.id}
                    href={`/journal/${trade.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-200">{trade.symbol}</span>
                          <Badge
                            className={cn(
                              "text-xs border-transparent",
                              trade.side === "LONG"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400",
                            )}
                          >
                            {trade.side === "LONG" ? (
                              <TrendingUp className="h-3 w-3 mr-1 inline" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1 inline" />
                            )}
                            {trade.side}
                          </Badge>
                        </div>
                        {trade.setupType && (
                          <p className="text-xs text-slate-500 mt-0.5">{trade.setupType}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AdherenceBadge status={trade.adherence as AdherenceStatus} />
                      {pnl != null && (
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            pnlPositive ? "text-emerald-400" : "text-rose-400",
                          )}
                        >
                          {pnlPositive ? "+" : ""}
                          {formatCurrency(pnl)}
                        </span>
                      )}
                      <span className="text-xs text-indigo-400 group-hover:underline">Review →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {winCount > 0 && (
              <p className="text-xs text-slate-500 mt-3 text-center">
                {winCount} win{winCount !== 1 ? "s" : ""} · {closedTrades.length - winCount} loss
                {closedTrades.length - winCount !== 1 ? "es" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 2 + 3: Reflection form */}
      <form onSubmit={form.handleSubmit((v) => onSubmit(v, false))} className="space-y-6">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-400" />
              Your Reflection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Top mistakes */}
            <div>
              <Label className="text-sm text-slate-300 mb-2 block">Top mistakes today</Label>
              <div className="space-y-2 mb-2">
                {mistakes.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/50"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-sm text-slate-300 flex-1">{m}</span>
                    <button
                      type="button"
                      onClick={() => removeMistake(i)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={mistakeInput}
                  onChange={(e) => setMistakeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMistake();
                    }
                  }}
                  placeholder="Describe a mistake…"
                  className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 flex-1"
                />
                <Button
                  type="button"
                  onClick={addMistake}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:text-slate-200 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Emotional state */}
            <div>
              <Label className="text-sm text-slate-300 mb-1.5 block">Emotional state today</Label>
              <Controller
                control={form.control}
                name="emotionalState"
                render={({ field }) => (
                  <EmotionSelect
                    value={field.value as EmotionTag | null}
                    onChange={field.onChange}
                    placeholder="Overall how did you feel today?"
                  />
                )}
              />
            </div>

            {/* Market context */}
            <div>
              <Label htmlFor="marketContext" className="text-sm text-slate-300 mb-1.5 block">
                Market context
              </Label>
              <Textarea
                id="marketContext"
                {...form.register("marketContext")}
                placeholder="What was the market doing today? Trending, choppy, news-driven?"
                className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none focus:border-indigo-500"
                rows={3}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="userNotes" className="text-sm text-slate-300 mb-1.5 block">
                Your notes
              </Label>
              <Textarea
                id="userNotes"
                {...form.register("userNotes")}
                placeholder="Free-form notes about your trading day…"
                className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none focus:border-indigo-500"
                rows={4}
              />
            </div>

            {/* Tomorrow's plan */}
            <div>
              <Label htmlFor="tomorrowPlan" className="text-sm text-slate-300 mb-1.5 block">
                Tomorrow&apos;s plan
              </Label>
              <Textarea
                id="tomorrowPlan"
                {...form.register("tomorrowPlan")}
                placeholder="What will you focus on or do differently tomorrow?"
                className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none focus:border-indigo-500"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: AI Summary */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-400" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!aiSummary ? (
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  Based on your trades and strategy, AI can generate a summary of your trading day
                  with improvement suggestions.
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  This analysis is based on your own strategy rules and historical behavior. Not
                  financial advice.
                </p>
                <Button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  variant="outline"
                  size="sm"
                  className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate AI Summary
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 italic">
                  Based on your trades and strategy, here is a summary of your trading day:
                </p>

                <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/40">
                  <p className="text-sm text-slate-300 leading-relaxed">{aiSummary}</p>
                </div>

                {aiSuggestions && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                      Improvement Suggestions
                    </p>
                    <div className="space-y-1.5">
                      {aiSuggestions.split("\n").filter(Boolean).map((line, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                          <span>{line.replace(/^[•\-]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Brain className="h-3 w-3 mr-1" />
                  )}
                  Regenerate
                </Button>

                <Separator className="bg-slate-700/50" />
                <p className="text-xs text-slate-500">
                  This analysis is based on your own strategy rules and historical behavior. Not
                  financial advice.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error / success */}
        {saveError && (
          <p className="text-sm text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="text-sm text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Review saved.
          </p>
        )}

        {/* Save buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            type="submit"
            disabled={isPending}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={form.handleSubmit((v) => onSubmit(v, true))}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
