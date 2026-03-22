"use client";

// ---------------------------------------------------------------------------
// ManualTradeForm – dialog form for entering a single trade manually
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmotionSelect } from "@/components/shared/EmotionSelect";
import { createTrade } from "@/lib/actions/trade.actions";
import { Market, TradeSide, AdherenceStatus, EmotionTag } from "@/types";
import { cn } from "@/lib/utils";
import { PlusCircle, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Form value type (what React Hook Form stores in the form state)
// ---------------------------------------------------------------------------

interface ManualTradeFormValues {
  symbol: string;
  market: string;
  side: string;
  entryAt: string;
  exitAt?: string;
  entryPrice: number;
  exitPrice: number | "";
  stopPrice: number | "";
  targetPrice: number | "";
  size: number;
  fees: number | "";
  pnlAmount: number | "";
  session?: string;
  setupType?: string;
  adherence: string;
  whyTaken?: string;
  emotionBefore?: string | null;
  emotionAfter?: string | null;
}

// ---------------------------------------------------------------------------
// Zod schema (used for runtime validation on submit)
// ---------------------------------------------------------------------------

const ManualTradeSchema = z
  .object({
    symbol: z
      .string()
      .min(1, "Symbol is required")
      .max(20)
      .trim()
      .transform((v) => v.toUpperCase()),
    market: z.enum(
      Object.values(Market) as [string, ...string[]],
      { error: "Select a market" },
    ),
    side: z.enum(
      Object.values(TradeSide) as [string, ...string[]],
      { error: "Select Long or Short" },
    ),
    entryAt: z.string().min(1, "Entry date/time is required"),
    exitAt: z.string().optional(),
    entryPrice: z.number({ error: "Entry price is required" }).positive("Must be positive"),
    exitPrice: z.union([z.number().positive(), z.literal("")]).optional(),
    stopPrice: z.union([z.number().positive(), z.literal("")]).optional(),
    targetPrice: z.union([z.number().positive(), z.literal("")]).optional(),
    size: z.number({ error: "Size is required" }).positive("Must be positive"),
    fees: z.union([z.number().min(0), z.literal("")]).optional(),
    pnlAmount: z.union([z.number(), z.literal("")]).optional(),
    session: z.string().max(50).trim().optional(),
    setupType: z.string().max(100).trim().optional(),
    adherence: z.enum(Object.values(AdherenceStatus) as [string, ...string[]]).default("UNREVIEWED"),
    whyTaken: z.string().max(2000).trim().optional(),
    emotionBefore: z.enum(Object.values(EmotionTag) as [string, ...string[]]).optional().nullable(),
    emotionAfter: z.enum(Object.values(EmotionTag) as [string, ...string[]]).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.exitAt && data.entryAt) {
      const entry = new Date(data.entryAt);
      const exit = new Date(data.exitAt);
      if (!isNaN(exit.getTime()) && !isNaN(entry.getTime()) && exit <= entry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exitAt"],
          message: "Exit time must be after entry time",
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ManualTradeFormProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function todayLocalDatetime() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-slate-300 text-sm font-medium">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </Label>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManualTradeForm({
  userId,
  open,
  onOpenChange,
  onSuccess,
}: ManualTradeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualTradeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ManualTradeSchema) as any,
    defaultValues: {
      symbol: "",
      market: undefined,
      side: undefined,
      entryAt: todayLocalDatetime(),
      exitAt: "",
      entryPrice: undefined,
      exitPrice: "",
      stopPrice: "",
      targetPrice: "",
      size: undefined,
      fees: "",
      pnlAmount: "",
      session: "",
      setupType: "",
      adherence: "UNREVIEWED",
      whyTaken: "",
      emotionBefore: null,
      emotionAfter: null,
    },
  });

  async function onSubmit(values: ManualTradeFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build the payload
      const payload = {
        symbol: values.symbol,
        market: values.market as typeof Market[keyof typeof Market],
        side: values.side as typeof TradeSide[keyof typeof TradeSide],
        entryAt: new Date(values.entryAt).toISOString(),
        exitAt: values.exitAt ? new Date(values.exitAt).toISOString() : undefined,
        entryPrice: values.entryPrice,
        exitPrice: typeof values.exitPrice === "number" ? values.exitPrice : undefined,
        stopPrice: typeof values.stopPrice === "number" ? values.stopPrice : undefined,
        targetPrice: typeof values.targetPrice === "number" ? values.targetPrice : undefined,
        size: values.size,
        fees: typeof values.fees === "number" ? values.fees : 0,
        pnlAmount: typeof values.pnlAmount === "number" ? values.pnlAmount : undefined,
        session: values.session || undefined,
        setupType: values.setupType || undefined,
        adherence: values.adherence as typeof AdherenceStatus[keyof typeof AdherenceStatus],
        whyTaken: values.whyTaken || undefined,
        emotionBefore: values.emotionBefore as typeof EmotionTag[keyof typeof EmotionTag] | undefined ?? undefined,
        emotionAfter: values.emotionAfter as typeof EmotionTag[keyof typeof EmotionTag] | undefined ?? undefined,
        isOpen: !values.exitAt,
        wasReviewed: false,
        riskViolations: [],
        tagIds: [],
      };

      await createTrade(userId, payload);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create trade");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      reset();
      setSubmitError(null);
    }
    onOpenChange(newOpen);
  }

  const inputClass =
    "bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-10";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-indigo-400" />
            Add Trade Manually
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 mt-2">
          <Tabs defaultValue="core" className="w-full">
            <TabsList className="bg-slate-800 border-slate-700 w-full mb-4">
              <TabsTrigger value="core" className="flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-sm">
                Trade Details
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 text-sm">
                Journal Notes
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Core trade data ─────────────────────────────────── */}
            <TabsContent value="core" className="space-y-4 mt-0">
              {/* Row 1: Symbol + Market + Side */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="symbol" required>Symbol</FieldLabel>
                  <Input
                    id="symbol"
                    placeholder="ES, NQ, AAPL…"
                    {...register("symbol")}
                    className={cn(inputClass, errors.symbol && "border-red-500")}
                  />
                  <FieldError message={errors.symbol?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="market" required>Market</FieldLabel>
                  <Controller
                    name="market"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="market"
                          className={cn(inputClass, errors.market && "border-red-500")}
                        >
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {Object.values(Market).map((m) => (
                            <SelectItem key={m} value={m} className="text-slate-200">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.market?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="side" required>Side</FieldLabel>
                  <Controller
                    name="side"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="side"
                          className={cn(inputClass, errors.side && "border-red-500")}
                        >
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="LONG" className="text-green-400">Long</SelectItem>
                          <SelectItem value="SHORT" className="text-red-400">Short</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.side?.message} />
                </div>
              </div>

              {/* Row 2: Entry date + Exit date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="entryAt" required>Entry Date / Time</FieldLabel>
                  <Input
                    id="entryAt"
                    type="datetime-local"
                    {...register("entryAt")}
                    className={cn(inputClass, "dark:[color-scheme:dark]", errors.entryAt && "border-red-500")}
                  />
                  <FieldError message={errors.entryAt?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="exitAt">Exit Date / Time</FieldLabel>
                  <Input
                    id="exitAt"
                    type="datetime-local"
                    {...register("exitAt")}
                    className={cn(inputClass, "dark:[color-scheme:dark]", errors.exitAt && "border-red-500")}
                  />
                  <FieldError message={errors.exitAt?.message} />
                </div>
              </div>

              {/* Row 3: Entry price + Exit price + Size */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="entryPrice" required>Entry Price</FieldLabel>
                  <Input
                    id="entryPrice"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register("entryPrice", { valueAsNumber: true })}
                    className={cn(inputClass, errors.entryPrice && "border-red-500")}
                  />
                  <FieldError message={errors.entryPrice?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="exitPrice">Exit Price</FieldLabel>
                  <Input
                    id="exitPrice"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register("exitPrice", { valueAsNumber: true })}
                    className={cn(inputClass, errors.exitPrice && "border-red-500")}
                  />
                  <FieldError message={errors.exitPrice?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="size" required>Size / Qty</FieldLabel>
                  <Input
                    id="size"
                    type="number"
                    step="any"
                    placeholder="1"
                    {...register("size", { valueAsNumber: true })}
                    className={cn(inputClass, errors.size && "border-red-500")}
                  />
                  <FieldError message={errors.size?.message} />
                </div>
              </div>

              {/* Row 4: Stop + Target + Fees + PnL */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="stopPrice">Stop</FieldLabel>
                  <Input
                    id="stopPrice"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register("stopPrice", { valueAsNumber: true })}
                    className={cn(inputClass, errors.stopPrice && "border-red-500")}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="targetPrice">Target</FieldLabel>
                  <Input
                    id="targetPrice"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register("targetPrice", { valueAsNumber: true })}
                    className={cn(inputClass)}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="fees">Fees</FieldLabel>
                  <Input
                    id="fees"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register("fees", { valueAsNumber: true })}
                    className={cn(inputClass)}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="pnlAmount">P&L ($)</FieldLabel>
                  <Input
                    id="pnlAmount"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    {...register("pnlAmount", { valueAsNumber: true })}
                    className={cn(inputClass)}
                  />
                </div>
              </div>

              {/* Row 5: Session + Setup type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="session">Session</FieldLabel>
                  <Input
                    id="session"
                    placeholder="e.g. London, NY Open…"
                    {...register("session")}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="setupType">Setup Type</FieldLabel>
                  <Input
                    id="setupType"
                    placeholder="e.g. BOS Retest, FVG Fill…"
                    {...register("setupType")}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 6: Adherence */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="adherence">Adherence</FieldLabel>
                <Controller
                  name="adherence"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="adherence" className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="YES" className="text-green-400">In Plan (Yes)</SelectItem>
                        <SelectItem value="NO" className="text-red-400">Off Plan (No)</SelectItem>
                        <SelectItem value="PARTIAL" className="text-amber-400">Partial</SelectItem>
                        <SelectItem value="UNREVIEWED" className="text-slate-400">Unreviewed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </TabsContent>

            {/* ── Tab 2: Journal notes ───────────────────────────────────── */}
            <TabsContent value="notes" className="space-y-4 mt-0">
              {/* Emotions row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="emotionBefore">Emotion Before</FieldLabel>
                  <Controller
                    name="emotionBefore"
                    control={control}
                    render={({ field }) => (
                      <EmotionSelect
                        value={field.value as typeof EmotionTag[keyof typeof EmotionTag] | null | undefined}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="emotionAfter">Emotion After</FieldLabel>
                  <Controller
                    name="emotionAfter"
                    control={control}
                    render={({ field }) => (
                      <EmotionSelect
                        value={field.value as typeof EmotionTag[keyof typeof EmotionTag] | null | undefined}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Why taken */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="whyTaken">Why I Took This Trade</FieldLabel>
                <Textarea
                  id="whyTaken"
                  placeholder="Describe your reasoning for entering this trade…"
                  rows={3}
                  {...register("whyTaken")}
                  className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit error */}
          {submitError && (
            <div className="mt-3 p-3 rounded-md bg-red-950/40 border border-red-500/30">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          <DialogFooter className="mt-6 gap-2 flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Trade
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
