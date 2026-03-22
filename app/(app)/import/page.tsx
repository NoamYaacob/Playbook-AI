// ---------------------------------------------------------------------------
// Import Center – Server Component
// ---------------------------------------------------------------------------

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getImportBatches, getPostImportReview } from "@/lib/actions/import.actions";
import { PageHeader } from "@/components/shared/PageHeader";
import { DisclaimerBanner } from "@/components/shared/DisclaimerBanner";
import { CsvUploader } from "@/components/import/CsvUploader";
import { ManualTradeFormTrigger } from "@/components/import/ManualTradeFormTrigger";
import { Badge } from "@/components/ui/badge";
import type { ImportMethod, ImportStatus, PostImportReviewRow } from "@/types";
import { Sparkles, ArrowRight, CheckCircle2, Clock } from "lucide-react";

// Local type matching what getImportBatches returns
interface ImportBatchRow {
  id: string;
  method: ImportMethod;
  status: ImportStatus;
  fileName?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedCount: number;
  createdAt: Date;
}
import {
  Upload,
  PlusCircle,
  Camera,
  Plug,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: ImportStatus }) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case "PROCESSING":
      return <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />;
    case "FAILED":
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
}

// ---------------------------------------------------------------------------
// ReviewBanner – shown after a completed import batch
// ---------------------------------------------------------------------------

interface ReviewBannerProps {
  batchId: string;
  batchLabel: string;
  review: PostImportReviewRow | null;
}

function ReviewBanner({ batchId, batchLabel, review }: ReviewBannerProps) {
  const isCompleted = review?.status === "COMPLETED";
  const isInProgress = review?.status === "IN_PROGRESS";

  if (isCompleted) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/20 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200">Review complete</p>
          <p className="text-xs text-slate-500 truncate">{batchLabel}</p>
        </div>
        <Link
          href={`/import/review/${batchId}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap flex items-center gap-1"
        >
          View clusters
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200">
          {isInProgress
            ? "Continue reviewing your imported trades"
            : "Review your imported trades to improve setup recognition"}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
          {isInProgress
            ? `${review?.reviewedCount ?? 0} of ${review?.sampleSize ?? 0} trades reviewed. Pick up where you left off.`
            : "Answer a few questions about a sample of your trades. The AI will use your answers to identify recurring patterns in your behavior."}
        </p>
      </div>
      <Link
        href={`/import/review/${batchId}`}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
      >
        {isInProgress ? "Continue" : "Start Review"}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportStatus }) {
  const variants: Record<ImportStatus, { label: string; className: string }> = {
    COMPLETED: { label: "Completed", className: "bg-green-500/15 text-green-400 border-green-500/30" },
    PROCESSING: { label: "Processing", className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
    FAILED: { label: "Failed", className: "bg-red-500/15 text-red-400 border-red-500/30" },
    PENDING: { label: "Pending", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  };
  const cfg = variants[status] ?? variants.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}
    >
      <StatusIcon status={status} />
      {cfg.label}
    </span>
  );
}

function methodLabel(method: ImportMethod): string {
  const map: Record<ImportMethod, string> = {
    CSV: "CSV Upload",
    MANUAL: "Manual Entry",
    SCREENSHOT: "Screenshot",
    BROKER_INTEGRATION: "Broker Integration",
  };
  return map[method] ?? method;
}

// ---------------------------------------------------------------------------
// Import method cards
// ---------------------------------------------------------------------------

const importMethods = [
  {
    key: "csv",
    icon: Upload,
    title: "CSV Upload",
    description: "Import trades from a CSV file exported from your broker or trading platform.",
    badge: null,
    primary: true,
  },
  {
    key: "manual",
    icon: PlusCircle,
    title: "Manual Entry",
    description: "Add a single trade manually using the trade entry form.",
    badge: null,
    primary: false,
  },
  {
    key: "screenshot",
    icon: Camera,
    title: "Screenshot Import",
    description: "Upload a screenshot of your broker's trade history and let AI extract the data.",
    badge: "Coming Soon",
    primary: false,
    disabled: true,
  },
  {
    key: "broker",
    icon: Plug,
    title: "Broker Integration",
    description: "Connect directly to your broker to automatically sync your trades.",
    badge: "Coming Soon",
    primary: false,
    disabled: true,
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const batches = (await getImportBatches(userId)) as ImportBatchRow[];

  // Load reviews for completed batches (most recent 5) in parallel
  const completedBatches = batches
    .filter((b) => b.status === "COMPLETED")
    .slice(0, 5);
  const reviewMap = new Map<string, PostImportReviewRow | null>();
  await Promise.all(
    completedBatches.map(async (b) => {
      const r = await getPostImportReview(b.id, userId);
      reviewMap.set(b.id, r);
    }),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Import Trades"
        subtitle="Add trades to your journal via CSV upload, manual entry, or broker integration."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Import" }]}
      />

      {/* ── Import method cards ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Import Methods
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {importMethods.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.key}
                className={`relative p-4 rounded-xl border transition-colors ${
                  m.disabled
                    ? "border-slate-800 bg-slate-900/30 opacity-60 cursor-not-allowed"
                    : m.primary
                    ? "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10"
                    : "border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 hover:border-slate-700"
                }`}
              >
                {m.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                    {m.badge}
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      m.primary ? "bg-indigo-500/15 text-indigo-400" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-200 text-sm">{m.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CSV Uploader ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          CSV Import Wizard
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <CsvUploader userId={userId} />
        </div>
      </section>

      {/* ── Manual Entry ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Manual Entry
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-200">Add a Single Trade</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Manually enter all fields for a single trade directly.
            </p>
          </div>
          <ManualTradeFormTrigger userId={userId} />
        </div>
      </section>

      {/* ── Post-Import Review Prompts ───────────────────────────────────── */}
      {completedBatches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Post-Import Review
          </h2>
          <div className="space-y-3">
            {completedBatches.map((batch) => {
              const review = reviewMap.get(batch.id) ?? null;
              // Skip if already reviewed and completed — only show one completed max
              return (
                <ReviewBanner
                  key={batch.id}
                  batchId={batch.id}
                  batchLabel={batch.fileName ?? methodLabel(batch.method)}
                  review={review}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Recent Import Batches ────────────────────────────────────────── */}
      {batches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Recent Imports
          </h2>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-800">
              {batches.slice(0, 10).map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon status={batch.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {batch.fileName ?? methodLabel(batch.method)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {methodLabel(batch.method)} &middot;{" "}
                        {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {batch.status === "COMPLETED" && (
                      <span className="text-xs text-slate-400">
                        {batch.importedCount} imported
                        {batch.invalidRows > 0 && (
                          <span className="text-red-400 ml-1">({batch.invalidRows} skipped)</span>
                        )}
                      </span>
                    )}
                    <StatusBadge status={batch.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <DisclaimerBanner
        variant="subtle"
        message="Setup clusters and classification suggestions are generated from your own trade data and descriptions. They are pattern-recognition aids for self-reflection only — not signals, advice, or recommendations of any kind."
      />
    </div>
  );
}
