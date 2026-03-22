"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Bell,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
  UserX,
} from "lucide-react";
import { StrategyRow } from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setActiveStrategy, deleteStrategy } from "@/lib/actions/strategy.actions";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserData {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  language: string;
  accountType: string;
  primaryMarkets: string[];
  goals: string[];
}

interface SettingsClientProps {
  user: UserData;
  strategies: StrategyRow[];
}

// ---------------------------------------------------------------------------
// Profile tab schemas
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  timezone: z.string().min(1),
  language: z.string().min(1),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Timezones (common subset)
// ---------------------------------------------------------------------------

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

function ProfileTab({ user }: { user: UserData }) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? "",
      timezone: user.timezone,
      language: user.language,
    },
  });

  async function onSubmit(values: ProfileFormValues) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error("Failed to update profile");
        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar placeholder */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-600/30 border-2 border-indigo-500/30 flex items-center justify-center shrink-0">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-indigo-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{user.name ?? "No name set"}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 h-auto p-0"
              >
                Change avatar
              </Button>
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm text-slate-300 mb-1.5 block">
                Display name
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                className="bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500"
                placeholder="Your name"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-rose-400 mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-slate-300 mb-1.5 block">Email</Label>
              <Input
                value={user.email}
                disabled
                className="bg-slate-900/30 border-slate-700 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <Label className="text-sm text-slate-300 mb-1.5 block">Timezone</Label>
              <Select
                value={form.watch("timezone")}
                onValueChange={(val) => form.setValue("timezone", val)}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-200 focus:border-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="hover:bg-slate-700 focus:bg-slate-700">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-slate-300 mb-1.5 block">Language</Label>
              <Select
                value={form.watch("language")}
                onValueChange={(val) => form.setValue("language", val)}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-slate-200 focus:border-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value} className="hover:bg-slate-700 focus:bg-slate-700">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Profile updated.
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Playbook Tab
// ---------------------------------------------------------------------------

function PlaybookTab({ strategies }: { strategies: StrategyRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState(
    strategies.find((s) => s.isActive)?.id ?? null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  function handleSetActive(strategyId: string) {
    startTransition(async () => {
      try {
        await setActiveStrategy(strategyId, strategies[0]?.userId ?? "");
        setActiveId(strategyId);
        router.refresh();
      } catch {
        // noop
      }
    });
  }

  function handleDelete(strategyId: string) {
    if (!confirm("Delete this strategy? This cannot be undone.")) return;
    setDeletingId(strategyId);
    startTransition(async () => {
      try {
        await deleteStrategy(strategyId, strategies[0]?.userId ?? "");
        router.refresh();
      } catch {
        // noop
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"}
        </p>
        <Link href="/playbook/new">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Strategy
          </Button>
        </Link>
      </div>

      {strategies.length === 0 ? (
        <Card className="bg-slate-800/40 border-slate-700/50">
          <CardContent className="py-10 text-center">
            <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No strategies defined yet.</p>
            <Link href="/playbook/new">
              <Button variant="outline" size="sm" className="mt-3 border-slate-600 text-slate-400">
                Create your first strategy
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {strategies.map((strategy) => {
            const isActive = strategy.id === activeId;
            return (
              <Card
                key={strategy.id}
                className={cn(
                  "border transition-colors",
                  isActive
                    ? "bg-indigo-950/30 border-indigo-500/30"
                    : "bg-slate-800/50 border-slate-700/50",
                )}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-200 truncate">
                          {strategy.title}
                        </p>
                        {isActive && (
                          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border text-xs">
                            Active
                          </Badge>
                        )}
                        {strategy.isArchived && (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        )}
                      </div>
                      {strategy.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {strategy.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {strategy.markets.slice(0, 3).map((m: string) => (
                          <Badge key={m} variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {m}
                          </Badge>
                        ))}
                        {strategy.setupTypes.slice(0, 2).map((st: string) => (
                          <Badge key={st} variant="outline" className="text-xs border-slate-700 text-slate-500">
                            {st}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && !strategy.isArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(strategy.id)}
                          disabled={isPending}
                          className="border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 text-xs"
                        >
                          Set Active
                        </Button>
                      )}
                      <Link href={`/playbook/${strategy.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-200"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(strategy.id)}
                        disabled={deletingId === strategy.id || isPending}
                        className="text-slate-600 hover:text-rose-400"
                      >
                        {deletingId === strategy.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk Rules Tab
// ---------------------------------------------------------------------------

function RiskRulesTab({ strategies }: { strategies: StrategyRow[] }) {
  const activeStrategy = strategies.find((s) => s.isActive);

  if (!activeStrategy) {
    return (
      <Card className="bg-slate-800/40 border-slate-700/50">
        <CardContent className="py-10 text-center">
          <Shield className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No active strategy found.</p>
          <p className="text-xs text-slate-600 mt-1">Set an active strategy first to configure risk rules.</p>
        </CardContent>
      </Card>
    );
  }

  const riskRules = (activeStrategy.riskRules ?? {}) as {
    noRevengeTrades?: boolean;
    minLossesBeforePause?: number;
    noSizeIncreaseAfterLoss?: boolean;
    noTradeWithoutStop?: boolean;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Risk rules for <span className="text-slate-200 font-medium">{activeStrategy.title}</span>
      </p>

      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Global Risk Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-400 uppercase tracking-wide">Max Trades / Day</Label>
              <p className="text-sm font-medium text-slate-200">
                {activeStrategy.maxTradesPerDay ?? "Not set"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-400 uppercase tracking-wide">Max Daily Loss</Label>
              <p className="text-sm font-medium text-slate-200">
                {activeStrategy.maxDailyLoss != null
                  ? `$${activeStrategy.maxDailyLoss.toFixed(2)}`
                  : "Not set"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-400 uppercase tracking-wide">Max Daily Loss %</Label>
              <p className="text-sm font-medium text-slate-200">
                {activeStrategy.maxDailyLossPct != null
                  ? `${activeStrategy.maxDailyLossPct}%`
                  : "Not set"}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-400 uppercase tracking-wide">Minimum R:R</Label>
              <p className="text-sm font-medium text-slate-200">
                {activeStrategy.minimumRR != null
                  ? `${activeStrategy.minimumRR}:1`
                  : "Not set"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Behavioral Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "noRevengeTrades",
              label: "No Revenge Trades",
              description: "Flag trades taken immediately after a loss",
              value: riskRules.noRevengeTrades ?? false,
            },
            {
              key: "noTradeWithoutStop",
              label: "No Trade Without Stop",
              description: "Require a stop loss on every trade",
              value: riskRules.noTradeWithoutStop ?? false,
            },
            {
              key: "noSizeIncreaseAfterLoss",
              label: "No Size Increase After Loss",
              description: "Prevent increasing position size after a losing trade",
              value: riskRules.noSizeIncreaseAfterLoss ?? false,
            },
          ].map((rule) => (
            <div key={rule.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-200 font-medium">{rule.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{rule.description}</p>
              </div>
              <Switch
                checked={rule.value}
                disabled
                className="shrink-0 mt-0.5"
              />
            </div>
          ))}

          {riskRules.minLossesBeforePause != null && (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-200 font-medium">Pause After Consecutive Losses</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pause trading after {riskRules.minLossesBeforePause} consecutive losses
                </p>
              </div>
              <Badge variant="outline" className="border-slate-600 text-slate-400 shrink-0 mt-0.5">
                {riskRules.minLossesBeforePause}
              </Badge>
            </div>
          )}

          <Separator className="bg-slate-700/50" />
          <p className="text-xs text-slate-500">
            To modify risk rules,{" "}
            <Link
              href={`/playbook/${activeStrategy.id}/edit`}
              className="text-indigo-400 hover:text-indigo-300"
            >
              edit your strategy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications Tab
// ---------------------------------------------------------------------------

function NotificationsTab() {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          {
            label: "Daily review reminder",
            description: "Receive a reminder to complete your daily review",
          },
          {
            label: "Weekly performance summary",
            description: "Get a weekly digest of your trading metrics",
          },
          {
            label: "Risk violation alerts",
            description: "Be alerted when a trade violates your playbook rules",
          },
          {
            label: "AI insight notifications",
            description: "Receive notifications when new AI insights are available",
          },
        ].map((n) => (
          <div key={n.label} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-200 font-medium">{n.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{n.description}</p>
            </div>
            <Switch disabled className="shrink-0 mt-0.5" />
          </div>
        ))}

        <Separator className="bg-slate-700/50" />
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Notification delivery coming soon.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Account / Danger Zone Tab
// ---------------------------------------------------------------------------

function AccountTab({ user }: { user: UserData }) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = confirmText === "DELETE MY ACCOUNT";

  async function handleDeleteAccount() {
    if (!canDelete) return;
    setIsDeleting(true);
    // In production call a delete-account server action
    alert("Account deletion would be triggered here. Not yet implemented.");
    setIsDeleting(false);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm text-slate-200">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-700/50">
            <span className="text-sm text-slate-400">Account type</span>
            <Badge variant="secondary" className="text-xs">
              {user.accountType}
            </Badge>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-slate-400">User ID</span>
            <span className="text-xs font-mono text-slate-500">{user.id}</span>
          </div>
        </CardContent>
      </Card>

      {/* Password change placeholder */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">
            Password changes are not yet available through the app.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-slate-600 text-slate-500"
          >
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="bg-rose-950/20 border-rose-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-300 font-medium mb-1">Delete Account</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Permanently delete your account and all associated data including trades, strategies,
              daily reviews, and insights. This action cannot be undone.
            </p>

            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 mb-4">
              <p className="text-xs text-rose-300 mb-2">
                Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="bg-slate-900/50 border-rose-500/30 text-slate-200 placeholder:text-slate-600 focus:border-rose-500 font-mono text-sm"
              />
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={!canDelete || isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Delete My Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SettingsClient({ user, strategies }: SettingsClientProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account and trading preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-800/60 border border-slate-700/50 p-1 h-auto flex-wrap gap-1">
          {[
            { value: "profile", label: "Profile", icon: User },
            { value: "playbook", label: "Playbook", icon: BookOpen },
            { value: "risk", label: "Risk Rules", icon: Shield },
            { value: "notifications", label: "Notifications", icon: Bell },
            { value: "account", label: "Account", icon: AlertTriangle },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>

        <TabsContent value="playbook">
          <PlaybookTab strategies={strategies} />
        </TabsContent>

        <TabsContent value="risk">
          <RiskRulesTab strategies={strategies} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="account">
          <AccountTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
