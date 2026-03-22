import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Layers3,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";

import {
  buildConditionItems,
  type PreMarketChecklistItem,
  type PreMarketContext,
} from "@/lib/pre-market/context";
import { PageHeader } from "@/components/shared/PageHeader";
import { DisclaimerBanner } from "@/components/shared/DisclaimerBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function toneClasses(tone: PreMarketChecklistItem["tone"]) {
  switch (tone) {
    case "required":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
    case "carry-forward":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "focus":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-700 bg-slate-900/60 text-slate-400";
  }
}

function SectionList({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <Card className="border-slate-800/80 bg-slate-900/55">
      <CardHeader>
        <CardTitle className="text-base text-slate-100">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm leading-relaxed text-slate-300"
            >
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/35 px-4 py-5 text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PreMarketAnalyzer({ context }: { context: PreMarketContext }) {
  const strategy = context.activeStrategy;
  const noTradeConditions = [
    ...buildConditionItems(strategy?.noTradeConditions),
    ...(strategy?.forbiddenHours ?? []).map((range) => `Avoid entries between ${range.start} and ${range.end}.`),
  ];

  const riskRules = [
    strategy?.minimumRR !== null && strategy?.minimumRR !== undefined
      ? `Minimum planned R:R: ${strategy.minimumRR}R`
      : null,
    strategy?.maxTradesPerDay !== null && strategy?.maxTradesPerDay !== undefined
      ? `Daily trade cap: ${strategy.maxTradesPerDay}`
      : null,
    strategy?.maxDailyLoss !== null && strategy?.maxDailyLoss !== undefined
      ? `Max daily loss: $${strategy.maxDailyLoss.toLocaleString()}`
      : null,
    strategy?.maxDailyLossPct !== null && strategy?.maxDailyLossPct !== undefined
      ? `Max daily loss percentage: ${strategy.maxDailyLossPct}%`
      : null,
    strategy?.riskRules?.noTradeWithoutStop ? "No trade without a defined stop loss." : null,
    strategy?.riskRules?.noSizeIncreaseAfterLoss ? "Do not increase size after a loss." : null,
    strategy?.riskRules?.noRevengeTrades
      ? strategy.riskRules.minLossesBeforePause
        ? `Pause after ${strategy.riskRules.minLossesBeforePause} consecutive losses to avoid revenge trading.`
        : "No revenge trading after emotionally compromised losses."
      : null,
  ].filter(Boolean) as string[];

  const sessionSummary = [
    ...(strategy?.tradingSessions ?? []).map((session) => `Allowed session: ${session}`),
    strategy?.allowedHoursStart && strategy?.allowedHoursEnd
      ? `Primary hours: ${strategy.allowedHoursStart}–${strategy.allowedHoursEnd}`
      : null,
    ...(strategy?.timeframes ?? []).map((timeframe) => `Primary timeframe: ${timeframe}`),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Market Analyzer"
        subtitle="A reflective pre-session workspace built from your own playbook, risk limits, and prior review notes. This page prepares you to trade your process, not to chase signals."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Pre-Market Analyzer" },
        ]}
        actions={
          strategy ? (
            <>
              <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">
                <Link href={`/playbook/${strategy.id}`}>Open active playbook</Link>
              </Button>
              <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-500">
                <Link href="/daily-review">Open daily review</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-500">
              <Link href="/playbook/new">Create a playbook</Link>
            </Button>
          )
        }
      />

      <DisclaimerBanner
        variant="prominent"
        message="This page is a structured preparation tool based on your own playbook rules, review notes, and risk boundaries. It does not use live market intelligence, does not generate trade signals, and does not provide financial advice."
      />

      {strategy ? (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-500">Active playbook</CardDescription>
                <CardTitle className="text-xl text-slate-100">{strategy.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-400">
                {strategy.description || "Your current preparation view is anchored to the active strategy."}
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-500">Today</CardDescription>
                <CardTitle className="text-xl text-slate-100">{context.dateLabel}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-400">
                Timezone: {context.timezone}
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-500">Allowed window</CardDescription>
                <CardTitle className="text-xl text-slate-100">
                  {strategy.allowedHoursStart && strategy.allowedHoursEnd
                    ? `${strategy.allowedHoursStart}–${strategy.allowedHoursEnd}`
                    : "Manual review"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-400">
                {(strategy.tradingSessions.length > 0 ? strategy.tradingSessions.join(" · ") : "No session filter") ||
                  "No session filter"}
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-500">Recent adherence</CardDescription>
                <CardTitle className="text-xl text-slate-100">
                  {context.todayContext.recentAdherenceRate !== null
                    ? `${context.todayContext.recentAdherenceRate}%`
                    : "Not enough reviews"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-400">
                Based on your most recent reviewed trades.
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-indigo-400" />
                  <CardTitle className="text-base text-slate-100">Today Checklist</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Work through this before the open. It is a commitment to your own process, not a market forecast.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {context.checklist.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border px-4 py-4 ${toneClasses(item.tone)}`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <Badge
                            className="border-current/20 bg-black/10 text-[10px] uppercase tracking-[0.18em]"
                            variant="outline"
                          >
                            {item.tone.replace("-", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed text-current/85">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-slate-100">Today Context</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Carry forward what your own review history is telling you before the session begins.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Carry-forward plan</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {context.todayContext.carryForwardPlan || "No prior tomorrow-plan note was found. Use this space as a manual reminder of today's execution focus."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Last completed review</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {context.todayContext.lastReviewSummary || "No completed AI summary is available yet."}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Top mistakes to avoid</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {context.todayContext.topMistakes.length > 0 ? (
                        context.todayContext.topMistakes.map((mistake) => (
                          <Badge key={mistake} className="border-red-500/20 bg-red-500/10 text-red-300" variant="outline">
                            {mistake}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No recent mistake tags found.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent risk violations</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {context.todayContext.recentRiskViolations.length > 0 ? (
                        context.todayContext.recentRiskViolations.map((violation) => (
                          <Badge key={violation} className="border-amber-500/20 bg-amber-500/10 text-amber-300" variant="outline">
                            {violation}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No repeated violation codes surfaced recently.</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionList
              title="Playbook Conditions Summary"
              description="The core conditions your entries should satisfy before any trade is considered."
              items={[
                ...buildConditionItems(strategy.entryConditions).map((item) => `Entry: ${item}`),
                ...buildConditionItems(strategy.invalidationConditions).map((item) => `Invalidation: ${item}`),
                ...buildConditionItems(strategy.stopLogic).map((item) => `Stop logic: ${item}`),
                ...buildConditionItems(strategy.targetLogic).map((item) => `Target logic: ${item}`),
              ]}
              emptyLabel="No detailed playbook conditions are defined yet."
            />

            <SectionList
              title="No-Trade Conditions"
              description="These are the situations where your default posture should be to stand down."
              items={noTradeConditions}
              emptyLabel="No explicit no-trade conditions are defined yet."
            />

            <SectionList
              title="Allowed Session & Hours"
              description="Keep your operating window explicit so discretionary drift is easier to catch."
              items={sessionSummary}
              emptyLabel="No explicit session or hours rules are defined yet."
            />

            <SectionList
              title="Relevant Setups"
              description="The setups approved by your active playbook for today's preparation."
              items={strategy.setupTypes}
              emptyLabel="No setup list has been defined yet."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-base text-slate-100">Daily Risk Rules Summary</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  Hard limits and discipline rules that should govern whether you keep trading today.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {riskRules.length > 0 ? (
                  riskRules.map((rule) => (
                    <div
                      key={rule}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"
                    >
                      {rule}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/35 px-4 py-5 text-sm text-slate-500">
                    No explicit daily risk rules are defined yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800/80 bg-slate-900/55">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <CardTitle className="text-base text-slate-100">Placeholder Analysis Architecture</CardTitle>
                </div>
                <CardDescription className="text-slate-400">
                  This is the future integration seam for live context inputs. It is intentionally non-operational today.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {context.placeholderModules.map((module) => (
                  <div key={module.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-100">{module.title}</p>
                          <Badge className="border-slate-700 bg-slate-900 text-slate-400" variant="outline">
                            Placeholder
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">{module.summary}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-600">
                      Future source: {module.futureSource}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed border-slate-700 bg-slate-900/45">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-slate-100">No active playbook found</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              The pre-market workspace becomes useful once your own strategy rules exist. It does not create ideas on its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-slate-200">
                  <Layers3 className="h-4 w-4 text-indigo-400" />
                  Setup list
                </div>
                <p className="mt-2 text-sm text-slate-500">Define approved setups and invalidation rules.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-slate-200">
                  <Clock3 className="h-4 w-4 text-indigo-400" />
                  Session boundaries
                </div>
                <p className="mt-2 text-sm text-slate-500">Add session windows and no-trade time blocks.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-slate-200">
                  <AlertTriangle className="h-4 w-4 text-indigo-400" />
                  Risk limits
                </div>
                <p className="mt-2 text-sm text-slate-500">Set your daily loss caps and stop requirements.</p>
              </div>
            </div>
            <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-500">
              <Link href="/playbook/new">Create your first strategy</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
