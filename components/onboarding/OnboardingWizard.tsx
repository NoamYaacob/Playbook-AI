"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Target,
  Globe,
  TrendingUp,
  Building2,
  User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { OnboardingSchema, type OnboardingData } from "@/lib/validations/onboarding.schema";
import { completeOnboarding } from "@/lib/actions/auth.actions";
import { Market, AccountType, GoalType } from "@/types";

// ---------------------------------------------------------------------------
// Step configuration
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, title: "Welcome", description: "Set up your trading profile" },
  { id: 2, title: "Markets", description: "What do you trade?" },
  { id: 3, title: "Account", description: "Your account type" },
  { id: 4, title: "Timezone", description: "Your trading timezone" },
  { id: 5, title: "Goals", description: "What do you want to achieve?" },
  { id: 6, title: "Complete", description: "You're all set!" },
] as const;

const TOTAL_STEPS = STEPS.length;

// ---------------------------------------------------------------------------
// Market options
// ---------------------------------------------------------------------------

const marketOptions: { value: Market; label: string; emoji: string; description: string }[] = [
  { value: "FUTURES", label: "Futures", emoji: "📈", description: "Commodities, index futures" },
  { value: "FOREX", label: "Forex", emoji: "💱", description: "Currency pairs" },
  { value: "STOCKS", label: "Stocks", emoji: "🏦", description: "Equities & ETFs" },
  { value: "CRYPTO", label: "Crypto", emoji: "🪙", description: "Digital assets" },
  { value: "OPTIONS", label: "Options", emoji: "🔀", description: "Calls & puts" },
];

// ---------------------------------------------------------------------------
// Goal options
// ---------------------------------------------------------------------------

const goalOptions: { value: GoalType; label: string; description: string }[] = [
  { value: "IMPROVE_DISCIPLINE", label: "Improve Discipline", description: "Follow your rules consistently" },
  { value: "FIND_BEST_SETUPS", label: "Find Best Setups", description: "Identify high-probability patterns" },
  { value: "REDUCE_REVENGE_TRADING", label: "Reduce Revenge Trading", description: "Break the revenge cycle" },
  { value: "REDUCE_OVERTRADING", label: "Reduce Overtrading", description: "Trade quality over quantity" },
  { value: "IMPROVE_PLAYBOOK_ADHERENCE", label: "Improve Playbook Adherence", description: "Stick to your strategy" },
  { value: "IMPROVE_WIN_RATE", label: "Improve Win Rate", description: "Take higher-quality trades" },
  { value: "IMPROVE_RISK_MANAGEMENT", label: "Improve Risk Management", description: "Protect your capital" },
];

// ---------------------------------------------------------------------------
// Timezone options
// ---------------------------------------------------------------------------

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET) — New York" },
  { value: "America/Chicago", label: "Central Time (CT) — Chicago" },
  { value: "America/Denver", label: "Mountain Time (MT) — Denver" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT) — Los Angeles" },
  { value: "America/Toronto", label: "Eastern Time — Toronto" },
  { value: "America/Sao_Paulo", label: "Brasília Time — São Paulo" },
  { value: "Europe/London", label: "GMT/BST — London" },
  { value: "Europe/Paris", label: "CET/CEST — Paris / Frankfurt" },
  { value: "Europe/Amsterdam", label: "CET/CEST — Amsterdam" },
  { value: "Europe/Zurich", label: "CET/CEST — Zurich" },
  { value: "Europe/Moscow", label: "MSK — Moscow" },
  { value: "Asia/Dubai", label: "GST — Dubai" },
  { value: "Asia/Kolkata", label: "IST — India" },
  { value: "Asia/Singapore", label: "SGT — Singapore" },
  { value: "Asia/Hong_Kong", label: "HKT — Hong Kong" },
  { value: "Asia/Tokyo", label: "JST — Tokyo" },
  { value: "Asia/Shanghai", label: "CST — Shanghai" },
  { value: "Australia/Sydney", label: "AEST/AEDT — Sydney" },
  { value: "Pacific/Auckland", label: "NZST/NZDT — Auckland" },
  { value: "UTC", label: "UTC — Universal Time" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OnboardingWizardProps {
  userId: string;
  initialName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingWizard({ userId, initialName = "" }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingData>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      name: initialName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      primaryMarkets: [],
      accountType: "PERSONAL",
      goals: [],
    },
  });

  const watchedMarkets = watch("primaryMarkets");
  const watchedGoals = watch("goals");
  const watchedAccountType = watch("accountType");
  const watchedTimezone = watch("timezone");

  // ---------------------------------------------------------------------------
  // Step field validation map
  // ---------------------------------------------------------------------------

  const stepFields: Record<number, (keyof OnboardingData)[]> = {
    1: ["name"],
    2: ["primaryMarkets"],
    3: ["accountType"],
    4: ["timezone"],
    5: ["goals"],
  };

  async function handleNext() {
    const fields = stepFields[currentStep];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  async function onSubmit(data: OnboardingData) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const result = await completeOnboarding(userId, data);
      if (!result.success) {
        setServerError(result.error ?? "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push("/playbook");
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  const filteredTimezones = TIMEZONE_OPTIONS.filter(
    (tz) =>
      tz.label.toLowerCase().includes(timezoneSearch.toLowerCase()) ||
      tz.value.toLowerCase().includes(timezoneSearch.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-500/20">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {STEPS[currentStep - 1]?.title}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {STEPS[currentStep - 1]?.description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {STEPS.map((step) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    step.id < currentStep
                      ? "bg-indigo-600 text-white"
                      : step.id === currentStep
                      ? "bg-indigo-600/20 border-2 border-indigo-500 text-indigo-400"
                      : "bg-slate-800 text-slate-600 border border-slate-700"
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {step.id < TOTAL_STEPS && (
                  <div
                    className={cn(
                      "w-8 h-0.5 mx-1 transition-all",
                      step.id < currentStep ? "bg-indigo-600" : "bg-slate-800"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div
              className="bg-indigo-600 h-1 rounded-full transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-500 text-center mt-2">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {serverError && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ----------------------------------------------------------------
                STEP 1 – Welcome / Name
            ---------------------------------------------------------------- */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/20">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-300">
                      Welcome to Playbook AI
                    </h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      We&apos;ll personalize your experience based on how you
                      trade. This takes about 2 minutes.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-slate-300 text-sm font-medium"
                  >
                    What should we call you?
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name or trading alias"
                    className={cn(
                      "bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 h-11",
                      errors.name && "border-red-500"
                    )}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-400">{errors.name.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------
                STEP 2 – Markets
            ---------------------------------------------------------------- */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    Which markets do you trade?
                  </h3>
                  <p className="text-sm text-slate-400">
                    Select all that apply. This helps us tailor insights for
                    your instruments.
                  </p>
                </div>

                <Controller
                  name="primaryMarkets"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {marketOptions.map((option) => {
                        const isSelected = field.value.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              const newValue = isSelected
                                ? field.value.filter(
                                    (v: Market) => v !== option.value
                                  )
                                : [...field.value, option.value];
                              field.onChange(newValue);
                            }}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500/50 text-white"
                                : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                            )}
                          >
                            <span className="text-2xl">{option.emoji}</span>
                            <div>
                              <p className="font-medium text-sm">
                                {option.label}
                              </p>
                              <p className="text-xs text-slate-500">
                                {option.description}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="ml-auto w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.primaryMarkets && (
                  <p className="text-xs text-red-400">
                    {errors.primaryMarkets.message}
                  </p>
                )}
                {watchedMarkets.length > 0 && (
                  <p className="text-xs text-indigo-400">
                    {watchedMarkets.length} market
                    {watchedMarkets.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------
                STEP 3 – Account Type
            ---------------------------------------------------------------- */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    What type of account do you trade?
                  </h3>
                  <p className="text-sm text-slate-400">
                    Prop firm accounts have different risk rules — we&apos;ll
                    account for that.
                  </p>
                </div>

                <Controller
                  name="accountType"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(
                        [
                          {
                            value: "PERSONAL" as AccountType,
                            label: "Personal Account",
                            description:
                              "Trading your own capital with your own rules.",
                            icon: User,
                          },
                          {
                            value: "PROP_FIRM" as AccountType,
                            label: "Prop Firm Account",
                            description:
                              "Trading funded capital with firm-specific rules.",
                            icon: Building2,
                          },
                        ] as const
                      ).map((option) => {
                        const Icon = option.icon;
                        const isSelected = field.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              "flex flex-col items-start gap-3 p-5 rounded-xl border text-left transition-all",
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500/50"
                                : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center",
                                isSelected
                                  ? "bg-indigo-600/30"
                                  : "bg-slate-700"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-5 h-5",
                                  isSelected
                                    ? "text-indigo-400"
                                    : "text-slate-400"
                                )}
                              />
                            </div>
                            <div>
                              <p
                                className={cn(
                                  "font-semibold text-sm",
                                  isSelected ? "text-white" : "text-slate-300"
                                )}
                              >
                                {option.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {option.description}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.accountType && (
                  <p className="text-xs text-red-400">
                    {errors.accountType.message}
                  </p>
                )}

                {watchedAccountType && (
                  <p className="text-xs text-indigo-400">
                    {watchedAccountType === "PERSONAL"
                      ? "Personal account selected — full flexibility."
                      : "Prop firm selected — we'll help you stay within funded account rules."}
                  </p>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------
                STEP 4 – Timezone
            ---------------------------------------------------------------- */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    What&apos;s your trading timezone?
                  </h3>
                  <p className="text-sm text-slate-400">
                    We&apos;ll use this to analyze trade timing and market
                    sessions accurately.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="text"
                    value={timezoneSearch}
                    onChange={(e) => setTimezoneSearch(e.target.value)}
                    placeholder="Search timezones…"
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none"
                  />
                </div>

                <Controller
                  name="timezone"
                  control={control}
                  render={({ field }) => (
                    <div className="max-h-64 overflow-y-auto space-y-1 rounded-xl border border-slate-700 bg-slate-800/30 p-2">
                      {filteredTimezones.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          No timezones found for &ldquo;{timezoneSearch}&rdquo;
                        </p>
                      ) : (
                        filteredTimezones.map((tz) => {
                          const isSelected = field.value === tz.value;
                          return (
                            <button
                              key={tz.value}
                              type="button"
                              onClick={() => field.onChange(tz.value)}
                              className={cn(
                                "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-all",
                                isSelected
                                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                                  : "text-slate-300 hover:bg-slate-700/60 border border-transparent"
                              )}
                            >
                              <span className="truncate">{tz.label}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                />

                {errors.timezone && (
                  <p className="text-xs text-red-400">
                    {errors.timezone.message}
                  </p>
                )}
                {watchedTimezone && (
                  <p className="text-xs text-indigo-400">
                    Selected: {watchedTimezone}
                  </p>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------
                STEP 5 – Goals
            ---------------------------------------------------------------- */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    What are your trading goals?
                  </h3>
                  <p className="text-sm text-slate-400">
                    We&apos;ll prioritize AI insights and coaching around what
                    matters most to you.
                  </p>
                </div>

                <Controller
                  name="goals"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      {goalOptions.map((option) => {
                        const isSelected = field.value.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className={cn(
                              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500/50"
                                : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...field.value, option.value]
                                  : field.value.filter(
                                      (v: GoalType) => v !== option.value
                                    );
                                field.onChange(newValue);
                              }}
                              className={cn(
                                "mt-0.5 shrink-0",
                                isSelected
                                  ? "border-indigo-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                  : "border-slate-600"
                              )}
                            />
                            <div>
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  isSelected ? "text-white" : "text-slate-300"
                                )}
                              >
                                {option.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {option.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.goals && (
                  <p className="text-xs text-red-400">
                    {errors.goals.message}
                  </p>
                )}
                {watchedGoals.length > 0 && (
                  <p className="text-xs text-indigo-400">
                    {watchedGoals.length} goal
                    {watchedGoals.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {/* ----------------------------------------------------------------
                STEP 6 – Complete
            ---------------------------------------------------------------- */}
            {currentStep === 6 && (
              <div className="text-center space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-indigo-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">
                    Your profile is ready!
                  </h3>
                  <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                    Time to build your first strategy playbook. Define your
                    setup rules, risk parameters, and entry criteria so
                    Playbook AI can start analyzing your trades.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  {[
                    { icon: TrendingUp, label: "AI Analysis" },
                    { icon: Target, label: "Playbook Rules" },
                    { icon: Globe, label: "Trading Insights" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700"
                    >
                      <Icon className="w-5 h-5 text-indigo-400" />
                      <span className="text-xs text-slate-400 text-center leading-tight">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------------
                Navigation buttons
            ---------------------------------------------------------------- */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 min-w-[160px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Go to Playbook
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          You can update all of these settings later in{" "}
          <span className="text-slate-500">Settings → Profile</span>.
        </p>
      </div>
    </div>
  );
}
