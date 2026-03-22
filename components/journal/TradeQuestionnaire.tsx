"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ChevronDown, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmotionSelect } from "@/components/shared/EmotionSelect";
import { EmotionTag, TradeRow } from "@/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeQuestionnaireData {
  whatDidYouSee: string;
  setupTrigger: string;
  stopRationale: string;
  targetRationale: string;
  wasPlanned: boolean;
  emotionBefore: string;
  emotionAfter: string;
  wouldTakeAgain: boolean;
  whyTaken: string;
  mistakeNotes: string;
  lessonLearned: string;
  adherence: string;
  adherenceNotes: string;
}

interface Props {
  trade: TradeRow;
  onSave: (data: TradeQuestionnaireData) => Promise<void>;
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  whatDidYouSee: z.string().optional().default(""),
  setupTrigger: z.string().optional().default(""),
  stopRationale: z.string().optional().default(""),
  targetRationale: z.string().optional().default(""),
  wasPlanned: z.enum(["yes", "no", "partial"]).optional(),
  emotionBefore: z.string().nullable().optional(),
  emotionAfter: z.string().nullable().optional(),
  wouldTakeAgain: z.enum(["yes", "no", "with_adjustments"]).optional(),
  whyTaken: z.string().optional().default(""),
  mistakeNotes: z.string().optional().default(""),
  lessonLearned: z.string().optional().default(""),
  adherence: z.enum(["YES", "NO", "PARTIAL"]).optional(),
  adherenceNotes: z.string().optional().default(""),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wasPlanedToEnum(
  val: boolean | null | undefined,
): "yes" | "no" | "partial" | undefined {
  if (val === true) return "yes";
  if (val === false) return "no";
  return undefined;
}

function wouldTakeToEnum(
  val: boolean | null | undefined,
): "yes" | "no" | "with_adjustments" | undefined {
  if (val === true) return "yes";
  if (val === false) return "no";
  return undefined;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface RadioCardProps {
  value: string;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}

function RadioCard({ value: _value, selected, onSelect, children }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex-1 min-w-0 text-left px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer",
        selected
          ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
          : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300 bg-slate-900/30",
      )}
    >
      {children}
    </button>
  );
}

interface QuestionCardProps {
  number: number;
  total: number;
  question: string;
  helper: string;
  isCompleted: boolean;
  isActive: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}

function QuestionCard({
  number,
  total,
  question,
  helper,
  isCompleted,
  isActive,
  onActivate,
  children,
}: QuestionCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        "border-l-4",
        isActive
          ? "border-indigo-500/40 border-l-indigo-500 bg-slate-800/80 shadow-lg shadow-black/20"
          : isCompleted
          ? "border-slate-700/50 border-l-emerald-500/60 bg-slate-800/40"
          : "border-slate-700/50 border-l-slate-600 bg-slate-800/40",
      )}
    >
      {/* Card header */}
      <button
        type="button"
        onClick={onActivate}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            isCompleted
              ? "bg-emerald-500/20 text-emerald-400"
              : isActive
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-slate-700 text-slate-400",
          )}
        >
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-semibold",
              isActive ? "text-slate-100" : "text-slate-300",
            )}
          >
            {question}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {number} of {total}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform",
            isActive && "rotate-180",
          )}
        />
      </button>

      {/* Card body */}
      {isActive && (
        <div className="px-4 pb-4 space-y-3">
          {children}
          <p className="text-xs text-slate-500 italic mt-2">{helper}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TradeQuestionnaire({ trade, onSave, isSaving }: Props) {
  const [activeCard, setActiveCard] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      whatDidYouSee: trade.whatDidYouSee ?? "",
      setupTrigger: trade.setupTrigger ?? "",
      stopRationale: trade.stopRationale ?? "",
      targetRationale: trade.targetRationale ?? "",
      wasPlanned: wasPlanedToEnum(trade.wasPlanned),
      emotionBefore: trade.emotionBefore ?? null,
      emotionAfter: trade.emotionAfter ?? null,
      wouldTakeAgain: wouldTakeToEnum(trade.wouldTakeAgain),
      whyTaken: trade.whyTaken ?? "",
      mistakeNotes: trade.mistakeNotes ?? "",
      lessonLearned: trade.lessonLearned ?? "",
      adherence:
        trade.adherence === "UNREVIEWED" || trade.adherence === undefined
          ? undefined
          : (trade.adherence as "YES" | "NO" | "PARTIAL"),
      adherenceNotes: trade.adherenceNotes ?? "",
    },
  });

  const watchedValues = form.watch();

  // Determine which cards are "completed" (have a non-empty value)
  const completionMap: boolean[] = [
    !!watchedValues.whatDidYouSee?.trim(),
    !!watchedValues.setupTrigger?.trim(),
    !!watchedValues.stopRationale?.trim(),
    !!watchedValues.targetRationale?.trim(),
    !!watchedValues.wasPlanned,
    !!(watchedValues.emotionBefore || watchedValues.emotionAfter),
    !!watchedValues.wouldTakeAgain,
  ];

  // Auto-save debounce when user changes fields
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void triggerSave(form.getValues(), false);
    }, 2000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues)]);

  async function triggerSave(values: FormValues, showFeedback: boolean) {
    const data: TradeQuestionnaireData = {
      whatDidYouSee: values.whatDidYouSee ?? "",
      setupTrigger: values.setupTrigger ?? "",
      stopRationale: values.stopRationale ?? "",
      targetRationale: values.targetRationale ?? "",
      wasPlanned: values.wasPlanned === "yes" || values.wasPlanned === "partial",
      emotionBefore: values.emotionBefore ?? "",
      emotionAfter: values.emotionAfter ?? "",
      wouldTakeAgain: values.wouldTakeAgain === "yes",
      whyTaken: values.whyTaken ?? "",
      mistakeNotes: values.mistakeNotes ?? "",
      lessonLearned: values.lessonLearned ?? "",
      adherence: values.adherence ?? "",
      adherenceNotes: values.adherenceNotes ?? "",
    };

    if (showFeedback) {
      setSaveError(null);
      setSaveSuccess(false);
    }
    startTransition(async () => {
      try {
        await onSave(data);
        if (showFeedback) setSaveSuccess(true);
      } catch (err) {
        if (showFeedback)
          setSaveError(
            err instanceof Error ? err.message : "Failed to save",
          );
      }
    });
  }

  function onSubmit(values: FormValues) {
    void triggerSave(values, true);
  }

  const TOTAL = 7;

  const textareaClass =
    "bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none focus:border-indigo-500 w-full";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      {/* Q1: What did you see */}
      <QuestionCard
        number={1}
        total={TOTAL}
        question="What did you see in the market?"
        helper="Describe the chart pattern, price action, or market condition that caught your attention."
        isCompleted={completionMap[0]}
        isActive={activeCard === 0}
        onActivate={() => setActiveCard(activeCard === 0 ? -1 : 0)}
      >
        <Textarea
          {...form.register("whatDidYouSee")}
          placeholder="e.g. Strong rejection at key resistance, bearish engulfing candle on the 15m…"
          className={textareaClass}
          rows={4}
        />
      </QuestionCard>

      {/* Q2: Entry trigger */}
      <QuestionCard
        number={2}
        total={TOTAL}
        question="What was your entry trigger?"
        helper="The specific signal or condition that caused you to click the buy/sell button."
        isCompleted={completionMap[1]}
        isActive={activeCard === 1}
        onActivate={() => setActiveCard(activeCard === 1 ? -1 : 1)}
      >
        <Textarea
          {...form.register("setupTrigger")}
          placeholder="e.g. Close below the 5-minute EMA, break of structure confirmed…"
          className={textareaClass}
          rows={3}
        />
      </QuestionCard>

      {/* Q3: Stop rationale */}
      <QuestionCard
        number={3}
        total={TOTAL}
        question="Why did you place your stop there?"
        helper="Understanding your stop logic reveals whether your risk was defined by the setup or by a fixed dollar amount."
        isCompleted={completionMap[2]}
        isActive={activeCard === 2}
        onActivate={() => setActiveCard(activeCard === 2 ? -1 : 2)}
      >
        <Textarea
          {...form.register("stopRationale")}
          placeholder="e.g. Above the prior swing high, structure-based invalidation level…"
          className={textareaClass}
          rows={3}
        />
      </QuestionCard>

      {/* Q4: Target rationale */}
      <QuestionCard
        number={4}
        total={TOTAL}
        question="Why did you choose that target?"
        helper="Your target rationale shows whether you had a defined exit plan or were hoping for the best."
        isCompleted={completionMap[3]}
        isActive={activeCard === 3}
        onActivate={() => setActiveCard(activeCard === 3 ? -1 : 3)}
      >
        <Textarea
          {...form.register("targetRationale")}
          placeholder="e.g. Next major support level, previous daily low, 2:1 RR minimum…"
          className={textareaClass}
          rows={3}
        />
      </QuestionCard>

      {/* Q5: Was it planned */}
      <QuestionCard
        number={5}
        total={TOTAL}
        question="Was this trade planned before you entered?"
        helper="Pre-planned trades typically perform differently than reactive ones. Neither is wrong — the data reveals the pattern."
        isCompleted={completionMap[4]}
        isActive={activeCard === 4}
        onActivate={() => setActiveCard(activeCard === 4 ? -1 : 4)}
      >
        <Controller
          control={form.control}
          name="wasPlanned"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <RadioCard
                value="yes"
                selected={field.value === "yes"}
                onSelect={() => field.onChange("yes")}
              >
                <span className="font-medium text-sm">Yes, it was in my watchlist</span>
              </RadioCard>
              <RadioCard
                value="no"
                selected={field.value === "no"}
                onSelect={() => field.onChange("no")}
              >
                <span className="font-medium text-sm">No, I spotted it in real-time</span>
              </RadioCard>
              <RadioCard
                value="partial"
                selected={field.value === "partial"}
                onSelect={() => field.onChange("partial")}
              >
                <span className="font-medium text-sm">
                  Partially — I had the setup in mind but not this specific entry
                </span>
              </RadioCard>
            </div>
          )}
        />
      </QuestionCard>

      {/* Q6: Emotions */}
      <QuestionCard
        number={6}
        total={TOTAL}
        question="How did you feel before and after?"
        helper="Your emotional state before and after trades is one of the most powerful predictors of trading consistency."
        isCompleted={completionMap[5]}
        isActive={activeCard === 5}
        onActivate={() => setActiveCard(activeCard === 5 ? -1 : 5)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400 mb-1.5 block">Before entry</Label>
            <Controller
              control={form.control}
              name="emotionBefore"
              render={({ field }) => (
                <EmotionSelect
                  value={field.value as EmotionTag | null}
                  onChange={field.onChange}
                  placeholder="Before entering…"
                />
              )}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1.5 block">After exit</Label>
            <Controller
              control={form.control}
              name="emotionAfter"
              render={({ field }) => (
                <EmotionSelect
                  value={field.value as EmotionTag | null}
                  onChange={field.onChange}
                  placeholder="After closing…"
                />
              )}
            />
          </div>
        </div>
      </QuestionCard>

      {/* Q7: Would take again */}
      <QuestionCard
        number={7}
        total={TOTAL}
        question="Would you take this exact trade again, knowing what you know now?"
        helper="This forces honest reflection regardless of whether the trade was profitable."
        isCompleted={completionMap[6]}
        isActive={activeCard === 6}
        onActivate={() => setActiveCard(activeCard === 6 ? -1 : 6)}
      >
        <Controller
          control={form.control}
          name="wouldTakeAgain"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <RadioCard
                value="yes"
                selected={field.value === "yes"}
                onSelect={() => field.onChange("yes")}
              >
                <span className="font-medium text-sm">Yes — identical setup, same entry</span>
              </RadioCard>
              <RadioCard
                value="no"
                selected={field.value === "no"}
                onSelect={() => field.onChange("no")}
              >
                <span className="font-medium text-sm">No — I would not take this trade again</span>
              </RadioCard>
              <RadioCard
                value="with_adjustments"
                selected={field.value === "with_adjustments"}
                onSelect={() => field.onChange("with_adjustments")}
              >
                <span className="font-medium text-sm">With adjustments — the idea was right, execution was off</span>
              </RadioCard>
            </div>
          )}
        />
      </QuestionCard>

      {/* Playbook Check */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 border-l-4 border-l-indigo-500/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <p className="text-sm font-semibold text-slate-100">Playbook Check</p>
          <p className="text-xs text-slate-500 mt-0.5">Strategy adherence and lessons</p>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Adherence */}
          <div>
            <Label className="text-sm text-slate-300 mb-2 block">
              Did this trade follow your strategy?
            </Label>
            <Controller
              control={form.control}
              name="adherence"
              render={({ field }) => (
                <div className="flex gap-2">
                  {(["YES", "NO", "PARTIAL"] as const).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => field.onChange(val)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                        field.value === val
                          ? val === "YES"
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                            : val === "NO"
                            ? "border-rose-500/60 bg-rose-500/10 text-rose-400"
                            : "border-amber-500/60 bg-amber-500/10 text-amber-400"
                          : "border-slate-700 text-slate-400 hover:border-slate-600",
                      )}
                    >
                      {val === "YES" ? "Yes" : val === "NO" ? "No" : "Partial"}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Adherence notes */}
          <div>
            <Label htmlFor="adherenceNotes" className="text-sm text-slate-300 mb-1.5 block">
              Adherence notes <span className="text-slate-500">(optional)</span>
            </Label>
            <Textarea
              id="adherenceNotes"
              {...form.register("adherenceNotes")}
              placeholder="Explain your adherence rating…"
              className={textareaClass}
              rows={2}
            />
          </div>

          {/* Mistakes */}
          <div>
            <Label htmlFor="mistakeNotes" className="text-sm text-slate-300 mb-1.5 block">
              Mistakes made <span className="text-slate-500">(optional)</span>
            </Label>
            <Textarea
              id="mistakeNotes"
              {...form.register("mistakeNotes")}
              placeholder="What did you do wrong or could have improved?"
              className={textareaClass}
              rows={2}
            />
          </div>

          {/* Lesson */}
          <div>
            <Label htmlFor="lessonLearned" className="text-sm text-slate-300 mb-1.5 block">
              Key lesson from this trade <span className="text-slate-500">(optional)</span>
            </Label>
            <Textarea
              id="lessonLearned"
              {...form.register("lessonLearned")}
              placeholder="What will you take away from this trade?"
              className={textareaClass}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Feedback */}
      {saveError && (
        <p className="text-sm text-rose-400 flex items-center gap-2">
          {saveError}
        </p>
      )}
      {saveSuccess && (
        <p className="text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Reflection saved.
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSaving ?? isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11"
      >
        {isSaving ?? isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Reflection
          </>
        )}
      </Button>
    </form>
  );
}
