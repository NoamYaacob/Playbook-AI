"use client";

import { Brain, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AdherenceBadge } from "@/components/shared/AdherenceBadge";
import { DisclaimerBanner } from "@/components/shared/DisclaimerBanner";
import { AdherenceStatus, TradeRow } from "@/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  trade: TradeRow;
  onAnalyze: () => Promise<void>;
  isAnalyzing?: boolean;
}

// ---------------------------------------------------------------------------
// AdherenceEnginePanel
// ---------------------------------------------------------------------------

export function AdherenceEnginePanel({ trade, onAnalyze, isAnalyzing }: Props) {
  const hasAnalysis = !!trade.aiAnalyzedAt;
  const confidencePct =
    trade.aiConfidence != null ? Math.round(trade.aiConfidence * 100) : null;

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (!hasAnalysis) {
    return (
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-400" />
              Playbook Analysis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Brain className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-200">
                Analyze this trade against your playbook
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                The AI will review your trade against your defined strategy rules and identify which rules
                were followed, which were broken, and provide a coaching reflection.
              </p>
            </div>
            <Button
              onClick={() => void onAnalyze()}
              disabled={isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
          <DisclaimerBanner variant="subtle" message="Analysis is based on your own defined strategy rules and trade data. This is not financial advice." />
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Analyzed state
  // -------------------------------------------------------------------------

  const adherenceStatus = (trade.aiAdherence ?? "UNREVIEWED") as AdherenceStatus;

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-400" />
            Playbook Analysis
          </CardTitle>
          <Button
            onClick={() => void onAnalyze()}
            disabled={isAnalyzing}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200 text-xs gap-1.5 h-7 px-2"
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Re-analyze
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Verdict strip */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <AdherenceBadge status={adherenceStatus} />
            {confidencePct != null && (
              <span className="text-xs text-slate-400 ml-auto">
                Confidence: <span className="text-slate-200 font-medium">{confidencePct}%</span>
              </span>
            )}
          </div>
          {confidencePct != null && (
            <div className="space-y-1">
              <Progress
                value={confidencePct}
                className="h-1.5 bg-slate-700"
              />
            </div>
          )}
        </div>

        {/* Matched Rules */}
        {trade.aiMatchedRules.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
              Matched Rules
            </p>
            <div className="space-y-1.5">
              {trade.aiMatchedRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/20 px-3 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-emerald-200 leading-snug">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broken Rules */}
        {trade.aiBrokenRules.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
              Broken Rules
            </p>
            <div className="space-y-1.5">
              {trade.aiBrokenRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg bg-red-950/50 border border-red-500/20 px-3 py-2"
                >
                  <XCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-rose-200 leading-snug">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching Note */}
        {trade.aiCoachingNote && (
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/40 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-indigo-400 shrink-0" />
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                Coaching Note
              </p>
            </div>
            <p className="text-sm text-indigo-100 leading-relaxed">{trade.aiCoachingNote}</p>
            <DisclaimerBanner
              variant="subtle"
              message="This reflection is based on your own strategy rules. It is not financial advice."
            />
          </div>
        )}

        {/* AI Classification */}
        {trade.aiSetupClassification && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 text-xs">This trade resembles:</span>
            <Badge
              variant="secondary"
              className="bg-slate-700/60 text-slate-200 border-slate-600/50 text-xs"
            >
              {trade.aiSetupClassification}
            </Badge>
          </div>
        )}

        {/* Behavior flags (risk violations) */}
        {trade.riskViolations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              Behavior Flags
            </p>
            <div className="flex flex-wrap gap-2">
              {trade.riskViolations.map((flag) => (
                <span
                  key={flag}
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    "bg-amber-950/50 text-amber-300 border border-amber-500/30",
                  )}
                >
                  {flag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
