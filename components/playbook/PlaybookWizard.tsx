"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
  AlertCircle,
  Loader2,
  ImagePlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { StrategySchema, type StrategyFormData } from "@/lib/validations/strategy.schema";
import { createStrategy, updateStrategy } from "@/lib/actions/strategy.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// Local type mirroring the Prisma Strategy model (avoids dependency on generated client)
type StrategyRecord = {
  id: string;
  userId: string;
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

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface PlaybookWizardProps {
  mode: "create" | "edit";
  userId: string;
  strategy?: StrategyRecord;
}

const STEP_COUNT = 6;

const STEP_TITLES = [
  "Basic Info",
  "Timeframes & Sessions",
  "Setup Definition",
  "Risk Management",
  "Notes & Examples",
  "Review & Save",
];

const MARKETS = ["FUTURES", "FOREX", "STOCKS", "CRYPTO", "OPTIONS"] as const;
const TIMEFRAMES = ["1m", "2m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1D", "1W"] as const;
const SESSIONS = ["London", "New York", "Asian", "London-NY Overlap", "Custom"] as const;

// Per-step Zod sub-schemas for inline validation
const step1Schema = StrategySchema.pick({ title: true, description: true, markets: true, preferredSymbols: true });
const step2Schema = StrategySchema.pick({ timeframes: true, tradingSessions: true, allowedHoursStart: true, allowedHoursEnd: true, forbiddenHours: true });
const step3Schema = StrategySchema.pick({ setupTypes: true, entryConditions: true, invalidationConditions: true, stopLogic: true, targetLogic: true, noTradeConditions: true });
const step4Schema = StrategySchema.pick({ minimumRR: true, maxTradesPerDay: true, maxDailyLoss: true, maxDailyLossPct: true, riskRules: true });
const step5Schema = StrategySchema.pick({ notes: true });
const step6Schema = z.object({});

const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema];

type StepKey = keyof StrategyFormData;
const STEP_FIELDS: StepKey[][] = [
  ["title", "description", "markets", "preferredSymbols"],
  ["timeframes", "tradingSessions", "allowedHoursStart", "allowedHoursEnd", "forbiddenHours"],
  ["setupTypes", "entryConditions", "invalidationConditions", "stopLogic", "targetLogic", "noTradeConditions"],
  ["minimumRR", "maxTradesPerDay", "maxDailyLoss", "maxDailyLossPct", "riskRules"],
  ["notes"],
  [],
];

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </p>
  );
}

function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-400">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

// Tag input with Enter-to-add
function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (val: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputVal.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
        setInputVal("");
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-0.5 text-sm font-medium text-indigo-300 ring-1 ring-indigo-500/30"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-0.5 rounded-full text-indigo-400 hover:text-indigo-200 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Type and press Enter to add"}
        className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function Step1BasicInfo({ form }: { form: UseFormReturn<StrategyFormData, unknown, StrategyFormData> }) {
  const { control, formState: { errors }, watch, setValue } = form;
  const markets = watch("markets") ?? [];
  const symbols = watch("preferredSymbols") ?? [];

  return (
    <FieldGroup>
      {/* Title */}
      <div>
        <Label className="text-slate-300 mb-1.5 block">Strategy Title <span className="text-red-400">*</span></Label>
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="e.g. London Breakout Scalp"
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        />
        <FieldError message={errors.title?.message} />
      </div>

      {/* Description */}
      <div>
        <Label className="text-slate-300 mb-1.5 block">Description</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              value={field.value ?? ""}
              placeholder="Brief overview of this strategy…"
              rows={4}
              className="resize-none bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        />
        <FieldError message={errors.description?.message} />
      </div>

      {/* Markets */}
      <div>
        <SectionLabel>Markets</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MARKETS.map((market) => {
            const checked = markets.includes(market);
            return (
              <label
                key={market}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                  checked
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(val) => {
                    if (val) {
                      setValue("markets", [...markets, market] as StrategyFormData["markets"], { shouldValidate: true });
                    } else {
                      setValue("markets", markets.filter((m) => m !== market) as StrategyFormData["markets"], { shouldValidate: true });
                    }
                  }}
                />
                <span className="text-sm font-medium">{market}</span>
              </label>
            );
          })}
        </div>
        <FieldError message={errors.markets?.message} />
      </div>

      {/* Preferred symbols */}
      <div>
        <Label className="text-slate-300 mb-1.5 block">Preferred Symbols</Label>
        <TagInput
          tags={symbols}
          onAdd={(val) => setValue("preferredSymbols", [...symbols, val], { shouldValidate: true })}
          onRemove={(i) => setValue("preferredSymbols", symbols.filter((_, idx) => idx !== i), { shouldValidate: true })}
          placeholder="e.g. ES, NQ — press Enter to add"
        />
      </div>
    </FieldGroup>
  );
}

function Step2Timeframes({ form }: { form: UseFormReturn<StrategyFormData, unknown, StrategyFormData> }) {
  const { control, formState: { errors }, watch, setValue } = form;
  const timeframes = watch("timeframes") ?? [];
  const sessions = watch("tradingSessions") ?? [];
  const forbiddenHours = watch("forbiddenHours") ?? [];

  const addForbiddenRange = () => {
    setValue("forbiddenHours", [...forbiddenHours, { start: "00:00", end: "01:00" }], { shouldValidate: true });
  };

  const removeForbiddenRange = (i: number) => {
    setValue("forbiddenHours", forbiddenHours.filter((_, idx) => idx !== i), { shouldValidate: true });
  };

  return (
    <FieldGroup>
      {/* Timeframes */}
      <div>
        <SectionLabel>Timeframes</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map((tf) => {
            const checked = timeframes.includes(tf);
            return (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  if (checked) {
                    setValue("timeframes", timeframes.filter((t) => t !== tf), { shouldValidate: true });
                  } else {
                    setValue("timeframes", [...timeframes, tf], { shouldValidate: true });
                  }
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-all",
                  checked
                    ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                )}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trading sessions */}
      <div>
        <SectionLabel>Trading Sessions</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SESSIONS.map((session) => {
            const checked = sessions.includes(session);
            return (
              <label
                key={session}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                  checked
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(val) => {
                    if (val) {
                      setValue("tradingSessions", [...sessions, session], { shouldValidate: true });
                    } else {
                      setValue("tradingSessions", sessions.filter((s) => s !== session), { shouldValidate: true });
                    }
                  }}
                />
                <span className="text-sm font-medium">{session}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Allowed hours */}
      <div>
        <SectionLabel>Allowed Trading Hours</SectionLabel>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-slate-400 mb-1 block text-xs">From</Label>
            <Controller
              name="allowedHoursStart"
              control={control}
              render={({ field }) => (
                <Input
                  type="time"
                  {...field}
                  value={field.value ?? ""}
                  className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            />
            <FieldError message={errors.allowedHoursStart?.message} />
          </div>
          <div className="mt-4 text-slate-500">–</div>
          <div className="flex-1">
            <Label className="text-slate-400 mb-1 block text-xs">To</Label>
            <Controller
              name="allowedHoursEnd"
              control={control}
              render={({ field }) => (
                <Input
                  type="time"
                  {...field}
                  value={field.value ?? ""}
                  className="bg-slate-800 border-slate-700 text-slate-100 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            />
            <FieldError message={errors.allowedHoursEnd?.message} />
          </div>
        </div>
      </div>

      {/* Forbidden hours */}
      <div>
        <SectionLabel>Forbidden Hour Ranges</SectionLabel>
        <div className="space-y-3">
          {forbiddenHours.map((range, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="flex-1">
                  <Label className="text-slate-500 mb-1 block text-xs">Start</Label>
                  <Input
                    type="time"
                    value={range.start}
                    onChange={(e) => {
                      const updated = forbiddenHours.map((r, idx) => idx === i ? { ...r, start: e.target.value } : r);
                      setValue("forbiddenHours", updated, { shouldValidate: true });
                    }}
                    className="bg-slate-900 border-slate-700 text-slate-100 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="mt-4 text-slate-500">–</div>
                <div className="flex-1">
                  <Label className="text-slate-500 mb-1 block text-xs">End</Label>
                  <Input
                    type="time"
                    value={range.end}
                    onChange={(e) => {
                      const updated = forbiddenHours.map((r, idx) => idx === i ? { ...r, end: e.target.value } : r);
                      setValue("forbiddenHours", updated, { shouldValidate: true });
                    }}
                    className="bg-slate-900 border-slate-700 text-slate-100 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeForbiddenRange(i)}
                className="mt-4 rounded-md p-1.5 text-slate-500 hover:bg-slate-700 hover:text-red-400 transition-colors"
                aria-label="Remove range"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addForbiddenRange}
            className="border-slate-700 bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Forbidden Range
          </Button>
        </div>
      </div>
    </FieldGroup>
  );
}

function Step3Setup({ form }: { form: UseFormReturn<StrategyFormData, unknown, StrategyFormData> }) {
  const { control, formState: { errors }, watch, setValue } = form;
  const setupTypes = watch("setupTypes") ?? [];

  const textareaClass = "resize-none bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <FieldGroup>
      <div>
        <Label className="text-slate-300 mb-1.5 block">Setup Types</Label>
        <TagInput
          tags={setupTypes}
          onAdd={(val) => setValue("setupTypes", [...setupTypes, val], { shouldValidate: true })}
          onRemove={(i) => setValue("setupTypes", setupTypes.filter((_, idx) => idx !== i), { shouldValidate: true })}
          placeholder="e.g. BOS Retest, Fair Value Gap — press Enter to add"
        />
      </div>

      <div>
        <Label className="text-slate-300 mb-1.5 block">Entry Conditions</Label>
        <Controller
          name="entryConditions"
          control={control}
          render={({ field }) => (
            <Textarea {...field} value={field.value ?? ""} rows={5} placeholder="Describe what must be present before entering a trade…" className={textareaClass} />
          )}
        />
        <FieldError message={errors.entryConditions?.message} />
      </div>

      <div>
        <Label className="text-slate-300 mb-1.5 block">Invalidation Conditions</Label>
        <Controller
          name="invalidationConditions"
          control={control}
          render={({ field }) => (
            <Textarea {...field} value={field.value ?? ""} rows={4} placeholder="What invalidates a setup before you're in?" className={textareaClass} />
          )}
        />
        <FieldError message={errors.invalidationConditions?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-slate-300 mb-1.5 block">Stop Logic</Label>
          <Controller
            name="stopLogic"
            control={control}
            render={({ field }) => (
              <Textarea {...field} value={field.value ?? ""} rows={4} placeholder="How do you define your stop loss?" className={textareaClass} />
            )}
          />
          <FieldError message={errors.stopLogic?.message} />
        </div>
        <div>
          <Label className="text-slate-300 mb-1.5 block">Target Logic</Label>
          <Controller
            name="targetLogic"
            control={control}
            render={({ field }) => (
              <Textarea {...field} value={field.value ?? ""} rows={4} placeholder="How do you set your profit targets?" className={textareaClass} />
            )}
          />
          <FieldError message={errors.targetLogic?.message} />
        </div>
      </div>

      <div>
        <Label className="text-slate-300 mb-1.5 block">No-Trade Conditions</Label>
        <Controller
          name="noTradeConditions"
          control={control}
          render={({ field }) => (
            <Textarea {...field} value={field.value ?? ""} rows={4} placeholder="List any conditions under which you must not trade…" className={textareaClass} />
          )}
        />
        <FieldError message={errors.noTradeConditions?.message} />
      </div>
    </FieldGroup>
  );
}

function Step4Risk({ form }: { form: UseFormReturn<StrategyFormData, unknown, StrategyFormData> }) {
  const { control, formState: { errors }, watch, setValue } = form;
  const riskRules = watch("riskRules") ?? {};
  const noRevengeTrades = riskRules.noRevengeTrades ?? false;

  const inputClass = "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500";

  const toggleRule = (key: keyof NonNullable<StrategyFormData["riskRules"]>, val: boolean) => {
    setValue("riskRules", { ...riskRules, [key]: val }, { shouldValidate: true });
  };

  return (
    <FieldGroup>
      {/* Numeric limits */}
      <div>
        <SectionLabel>Numeric Limits</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-slate-300 mb-1.5 block">Minimum R:R</Label>
            <Controller
              name="minimumRR"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="e.g. 2.0"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                  className={inputClass}
                />
              )}
            />
            <FieldError message={errors.minimumRR?.message} />
          </div>

          <div>
            <Label className="text-slate-300 mb-1.5 block">Max Trades Per Day</Label>
            <Controller
              name="maxTradesPerDay"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 3"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  className={inputClass}
                />
              )}
            />
            <FieldError message={errors.maxTradesPerDay?.message} />
          </div>

          <div>
            <Label className="text-slate-300 mb-1.5 block">Max Daily Loss <span className="text-slate-500 text-xs">(account currency)</span></Label>
            <Controller
              name="maxDailyLoss"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                  className={inputClass}
                />
              )}
            />
            <FieldError message={errors.maxDailyLoss?.message} />
          </div>

          <div>
            <Label className="text-slate-300 mb-1.5 block">Max Daily Loss %</Label>
            <Controller
              name="maxDailyLossPct"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 2"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                  className={inputClass}
                />
              )}
            />
            <FieldError message={errors.maxDailyLossPct?.message} />
          </div>
        </div>
      </div>

      {/* Risk toggles */}
      <div>
        <SectionLabel>Behavioral Rules</SectionLabel>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-200">No revenge trades after consecutive losses</p>
              <p className="text-xs text-slate-500 mt-0.5">Pause trading after hitting the loss threshold</p>
            </div>
            <Switch
              checked={noRevengeTrades}
              onCheckedChange={(val) => toggleRule("noRevengeTrades", val)}
            />
          </div>

          {noRevengeTrades && (
            <div className="ml-4 border-l-2 border-indigo-500/30 pl-4">
              <Label className="text-slate-300 mb-1.5 block text-sm">Consecutive losses before pause</Label>
              <Controller
                name="riskRules.minLossesBeforePause"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="20"
                    placeholder="e.g. 2"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                    className={cn(inputClass, "w-32")}
                  />
                )}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-200">No size increase after a loss</p>
              <p className="text-xs text-slate-500 mt-0.5">Prevents doubling down or over-leveraging after losses</p>
            </div>
            <Switch
              checked={riskRules.noSizeIncreaseAfterLoss ?? false}
              onCheckedChange={(val) => toggleRule("noSizeIncreaseAfterLoss", val)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-200">No trade without a stop loss</p>
              <p className="text-xs text-slate-500 mt-0.5">Every entry must have a defined stop loss</p>
            </div>
            <Switch
              checked={riskRules.noTradeWithoutStop ?? false}
              onCheckedChange={(val) => toggleRule("noTradeWithoutStop", val)}
            />
          </div>
        </div>
      </div>
    </FieldGroup>
  );
}

function Step5Notes({ form }: { form: UseFormReturn<StrategyFormData, unknown, StrategyFormData> }) {
  const { control, formState: { errors } } = form;

  return (
    <FieldGroup>
      <div>
        <Label className="text-slate-300 mb-1.5 block">Strategy Notes</Label>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              value={field.value ?? ""}
              rows={8}
              placeholder="Any additional notes, mental models, lessons, or context for this strategy…"
              className="resize-none bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        />
        <FieldError message={errors.notes?.message} />
      </div>

      <div>
        <SectionLabel>Example Screenshots</SectionLabel>
        <p className="mb-4 text-xs text-slate-500">
          Upload example screenshots of valid and invalid setups. Screenshot upload will be available after saving.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-green-500/30 bg-green-500/5 px-4 py-8 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <ImagePlus className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-400">Valid Setups</p>
            <p className="mt-1 text-xs text-slate-500">Upload after saving</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="mt-3 border-green-500/30 bg-transparent text-green-400 opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Screenshots
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 bg-red-500/5 px-4 py-8 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <ImagePlus className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-red-400">Invalid Setups</p>
            <p className="mt-1 text-xs text-slate-500">Upload after saving</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className="mt-3 border-red-500/30 bg-transparent text-red-400 opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Screenshots
            </Button>
          </div>
        </div>
      </div>
    </FieldGroup>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-48 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-300">{value || <span className="text-slate-600">—</span>}</dd>
    </div>
  );
}

function Step6Review({ form }: { form: UseFormReturn<StrategyFormData, unknown, StrategyFormData> }) {
  const values = form.watch();
  const rr = values.riskRules;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Review your strategy settings before saving. You can always edit it later.
      </p>

      <div className="divide-y divide-slate-700/60 rounded-xl border border-slate-700 bg-slate-800/50 px-4">
        <ReviewRow label="Title" value={values.title} />
        <ReviewRow label="Description" value={values.description} />
        <ReviewRow label="Markets" value={values.markets?.join(", ")} />
        <ReviewRow label="Symbols" value={values.preferredSymbols?.join(", ")} />
        <ReviewRow label="Timeframes" value={values.timeframes?.join(", ")} />
        <ReviewRow label="Sessions" value={values.tradingSessions?.join(", ")} />
        <ReviewRow
          label="Allowed Hours"
          value={
            values.allowedHoursStart || values.allowedHoursEnd
              ? `${values.allowedHoursStart ?? "?"} – ${values.allowedHoursEnd ?? "?"}`
              : null
          }
        />
        <ReviewRow label="Setup Types" value={values.setupTypes?.join(", ")} />
        <ReviewRow label="Entry Conditions" value={values.entryConditions} />
        <ReviewRow label="Invalidation" value={values.invalidationConditions} />
        <ReviewRow label="Stop Logic" value={values.stopLogic} />
        <ReviewRow label="Target Logic" value={values.targetLogic} />
        <ReviewRow label="No-Trade Conditions" value={values.noTradeConditions} />
        <ReviewRow label="Min R:R" value={values.minimumRR ? `${values.minimumRR}R` : null} />
        <ReviewRow label="Max Trades/Day" value={values.maxTradesPerDay} />
        <ReviewRow label="Max Daily Loss" value={values.maxDailyLoss ? `$${values.maxDailyLoss}` : null} />
        <ReviewRow label="Max Daily Loss %" value={values.maxDailyLossPct ? `${values.maxDailyLossPct}%` : null} />
        <ReviewRow
          label="Risk Rules"
          value={[
            rr?.noRevengeTrades && "No revenge trades",
            rr?.noSizeIncreaseAfterLoss && "No size increase after loss",
            rr?.noTradeWithoutStop && "No trade without stop",
          ]
            .filter(Boolean)
            .join(", ") || null}
        />
        <ReviewRow label="Notes" value={values.notes} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      {/* Mobile: step x of y */}
      <div className="mb-4 flex items-center justify-between sm:hidden">
        <p className="text-sm font-medium text-slate-300">
          {STEP_TITLES[currentStep]}
        </p>
        <p className="text-xs text-slate-500">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </div>

      {/* Desktop: full step list */}
      <ol className="hidden sm:flex items-center gap-0">
        {STEP_TITLES.map((title, i) => {
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
          const isLast = i === STEP_TITLES.length - 1;

          return (
            <React.Fragment key={i}>
              <li className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    isCompleted
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : isCurrent
                      ? "border-indigo-400 bg-transparent text-indigo-400"
                      : "border-slate-700 bg-transparent text-slate-600"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-indigo-400" : isCompleted ? "text-slate-400" : "text-slate-600"
                  )}
                >
                  {title}
                </span>
              </li>
              {!isLast && (
                <div
                  className={cn(
                    "mb-5 h-0.5 flex-1 transition-all",
                    i < currentStep ? "bg-indigo-500" : "bg-slate-700"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Mobile progress bar */}
      <div className="h-1 w-full rounded-full bg-slate-800 sm:hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default values helper
// ---------------------------------------------------------------------------

function buildDefaultValues(strategy?: StrategyRecord): Partial<StrategyFormData> {
  if (!strategy) {
    return {
      title: "",
      description: "",
      isActive: true,
      isArchived: false,
      markets: [],
      preferredSymbols: [],
      timeframes: [],
      tradingSessions: [],
      allowedHoursStart: null,
      allowedHoursEnd: null,
      forbiddenHours: [],
      setupTypes: [],
      entryConditions: null,
      invalidationConditions: null,
      stopLogic: null,
      targetLogic: null,
      noTradeConditions: null,
      minimumRR: null,
      maxTradesPerDay: null,
      maxDailyLoss: null,
      maxDailyLossPct: null,
      riskRules: {},
      notes: null,
    };
  }

  return {
    title: strategy.title,
    description: strategy.description ?? "",
    isActive: strategy.isActive,
    isArchived: strategy.isArchived,
    markets: strategy.markets as StrategyFormData["markets"],
    preferredSymbols: strategy.preferredSymbols,
    timeframes: strategy.timeframes,
    tradingSessions: strategy.tradingSessions,
    allowedHoursStart: strategy.allowedHoursStart ?? null,
    allowedHoursEnd: strategy.allowedHoursEnd ?? null,
    forbiddenHours: (strategy.forbiddenHours as StrategyFormData["forbiddenHours"]) ?? [],
    setupTypes: strategy.setupTypes,
    entryConditions: strategy.entryConditions ?? null,
    invalidationConditions: strategy.invalidationConditions ?? null,
    stopLogic: strategy.stopLogic ?? null,
    targetLogic: strategy.targetLogic ?? null,
    noTradeConditions: strategy.noTradeConditions ?? null,
    minimumRR: strategy.minimumRR ?? null,
    maxTradesPerDay: strategy.maxTradesPerDay ?? null,
    maxDailyLoss: strategy.maxDailyLoss ?? null,
    maxDailyLossPct: strategy.maxDailyLossPct ?? null,
    riskRules: (strategy.riskRules as StrategyFormData["riskRules"]) ?? {},
    notes: strategy.notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function PlaybookWizard({ mode, userId, strategy }: PlaybookWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<StrategyFormData, unknown, StrategyFormData>({
    resolver: zodResolver(StrategySchema) as any,
    defaultValues: buildDefaultValues(strategy) as StrategyFormData,
    mode: "onChange",
  });

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const schema = STEP_SCHEMAS[step];
    const fields = STEP_FIELDS[step];
    const values = form.getValues();

    // Extract only the fields for this step
    const subset: Record<string, unknown> = {};
    for (const f of fields) {
      subset[f] = values[f];
    }

    const result = schema.safeParse(subset);
    if (!result.success) {
      // Trigger validation display for each field with errors
      await form.trigger(fields as (keyof StrategyFormData)[]);
      return false;
    }
    return true;
  }, [step, form]);

  const handleNext = async () => {
    const valid = await validateCurrentStep();
    if (valid) {
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async (data: StrategyFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (mode === "create") {
        const created = await createStrategy(userId, data);
        router.push(`/playbook/${created.id}`);
      } else if (mode === "edit" && strategy) {
        await updateStrategy(strategy.id, userId, data);
        router.push(`/playbook/${strategy.id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <Step1BasicInfo form={form} />;
      case 1: return <Step2Timeframes form={form} />;
      case 2: return <Step3Setup form={form} />;
      case 3: return <Step4Risk form={form} />;
      case 4: return <Step5Notes form={form} />;
      case 5: return <Step6Review form={form} />;
      default: return null;
    }
  };

  const isLastStep = step === STEP_COUNT - 1;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-xl sm:p-8">
      <StepProgress currentStep={step} totalSteps={STEP_COUNT} />

      {/* Step title (desktop only — mobile shows in progress bar area) */}
      <div className="mb-6 hidden sm:block">
        <h2 className="text-lg font-semibold text-slate-100">{STEP_TITLES[step]}</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="min-h-[320px]">{renderStep()}</div>

        {submitError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {submitError}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-700 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0 || isSubmitting}
            className="text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {/* Dot indicators */}
            <div className="flex gap-1.5 sm:hidden">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-4 bg-indigo-400" : i < step ? "w-1.5 bg-indigo-600" : "w-1.5 bg-slate-700"
                  )}
                />
              ))}
            </div>

            {isLastStep ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-60 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {mode === "create" ? "Create Strategy" : "Save Changes"}
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
