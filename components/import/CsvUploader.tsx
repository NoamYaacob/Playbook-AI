"use client";

// ---------------------------------------------------------------------------
// CsvUploader – multi-step CSV import wizard
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ColumnMapper, FieldDef } from "@/components/import/ColumnMapper";
import {
  ValidationTable,
  ValidationResult,
  ValidationStatus,
} from "@/components/import/ValidationTable";
import { createImportBatch, importTrades } from "@/lib/actions/import.actions";
import { ImportTradeRowSchema } from "@/lib/validations/import.schema";
import type { CSVColumnMapping } from "@/lib/validations/import.schema";
import { cn } from "@/lib/utils";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  BookOpen,
  Loader2,
  X,
  Sparkles,
  Brain,
  List,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS: FieldDef[] = [
  { key: "symbol", label: "Symbol", description: "Ticker / instrument (e.g. ES, AAPL)", required: true },
  { key: "side", label: "Side", description: "LONG or SHORT", required: true },
  { key: "entryAt", label: "Entry Date/Time", description: "ISO or common date format", required: true },
  { key: "entryPrice", label: "Entry Price", description: "Numeric price at entry", required: true },
  { key: "size", label: "Size / Quantity", description: "Number of shares / contracts", required: true },
];

const OPTIONAL_FIELDS: FieldDef[] = [
  { key: "market", label: "Market", description: "FUTURES, FOREX, STOCKS, CRYPTO, OPTIONS", required: false },
  { key: "exitAt", label: "Exit Date/Time", description: "When the trade was closed", required: false },
  { key: "exitPrice", label: "Exit Price", description: "Numeric price at exit", required: false },
  { key: "stopPrice", label: "Stop Price", description: "Stop loss level", required: false },
  { key: "targetPrice", label: "Target Price", description: "Take profit level", required: false },
  { key: "fees", label: "Fees", description: "Commissions / fees paid", required: false },
  { key: "pnlAmount", label: "P&L ($)", description: "Realized profit or loss", required: false },
  { key: "session", label: "Session", description: "Trading session name", required: false },
  { key: "setupType", label: "Setup Type", description: "Name of your setup", required: false },
];

const ALL_FIELDS: FieldDef[] = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

type Step = "upload" | "map" | "validate" | "import";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map Columns" },
  { key: "validate", label: "Validate" },
  { key: "import", label: "Import" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CsvUploaderProps {
  userId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalized = headers.map((h) => ({ original: h, lower: h.toLowerCase().replace(/[\s_-]/g, "") }));

  const patterns: Record<string, string[]> = {
    symbol: ["symbol", "ticker", "instrument", "asset", "pair"],
    side: ["side", "direction", "type", "tradetype", "buysell", "action"],
    entryAt: ["entrytime", "entrydate", "entryat", "opentime", "opendate", "datetime", "date", "time"],
    entryPrice: ["entryprice", "openprice", "entryrate", "open"],
    exitAt: ["exittime", "exitdate", "exitat", "closetime", "closedate"],
    exitPrice: ["exitprice", "closeprice", "exitrate", "close"],
    size: ["size", "quantity", "qty", "volume", "amount", "lots", "contracts", "shares"],
    market: ["market", "assetclass", "category"],
    fees: ["fees", "commission", "commissions", "cost", "costs"],
    pnlAmount: ["pnl", "profit", "loss", "profitloss", "pl", "realizedpnl", "netpnl", "return"],
    stopPrice: ["stop", "stoploss", "stopprice", "sl"],
    targetPrice: ["target", "tp", "takeprofit", "targetprice"],
    session: ["session", "marketsession"],
    setupType: ["setup", "setuptype", "strategy", "setuptag", "pattern"],
  };

  for (const [field, aliases] of Object.entries(patterns)) {
    const match = normalized.find((h) => aliases.some((a) => h.lower.includes(a)));
    if (match) mapping[field] = match.original;
  }

  return mapping;
}

function getRequiredMissing(mapping: Record<string, string>): string[] {
  return REQUIRED_FIELDS.filter((f) => !mapping[f.key]).map((f) => f.label);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CsvUploader({ userId }: CsvUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRawRows, setAllRawRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Validation state
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [skipInvalid, setSkipInvalid] = useState(true);

  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedBatchId, setImportedBatchId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Step 1: File handling
  // ---------------------------------------------------------------------------

  function handleFileSelected(selectedFile: File) {
    setFile(selectedFile);
    setParseError(null);
    setCsvHeaders([]);
    setCsvPreviewRows([]);
    setAllRawRows([]);
    setMapping({});

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 0,
      complete(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          setParseError("Failed to parse CSV. Please check the file format.");
          return;
        }
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        setCsvHeaders(headers);
        setCsvPreviewRows(rows.slice(0, 5));
        setAllRawRows(rows);
        const detected = autoDetectMapping(headers);
        setMapping(detected);
      },
      error(err) {
        setParseError(`Parse error: ${err.message}`);
      },
    });
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type === "text/csv" || dropped.name.endsWith(".csv"))) {
      handleFileSelected(dropped);
    } else {
      setParseError("Please drop a valid CSV file.");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Step 2 -> Step 3: Validate rows
  // ---------------------------------------------------------------------------

  function runValidation() {
    const results: ValidationResult[] = allRawRows.map((rawRow, idx) => {
      // Apply column mapping to produce a mapped row
      const mappedRow: Record<string, string> = {};

      // Apply user mapping
      for (const [field, csvCol] of Object.entries(mapping)) {
        const val = rawRow[csvCol];
        if (val !== undefined) mappedRow[field] = val;
      }

      // If market not mapped, default to FUTURES
      if (!mappedRow.market) mappedRow.market = "FUTURES";

      const parsed = ImportTradeRowSchema.safeParse(mappedRow);

      if (!parsed.success) {
        const errors = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
        return {
          rowIndex: idx,
          status: "invalid" as ValidationStatus,
          symbol: typeof mappedRow.symbol === "string" ? mappedRow.symbol : undefined,
          side: typeof mappedRow.side === "string" ? mappedRow.side.toUpperCase() : undefined,
          entryAt: mappedRow.entryAt,
          entryPrice: mappedRow.entryPrice,
          size: mappedRow.size,
          errors,
          warnings: [],
        };
      }

      const data = parsed.data;
      const warnings: string[] = [];
      if (!data.exitAt) warnings.push("No exit time – trade will be marked as open");
      if (!data.exitPrice) warnings.push("No exit price");

      return {
        rowIndex: idx,
        status: warnings.length > 0 ? ("warning" as ValidationStatus) : ("valid" as ValidationStatus),
        symbol: data.symbol,
        side: data.side,
        entryAt: data.entryAt ? new Date(data.entryAt).toLocaleString() : undefined,
        entryPrice: data.entryPrice?.toString(),
        size: data.size?.toString(),
        errors: [],
        warnings,
      };
    });

    setValidationResults(results);
    setStep("validate");
  }

  // ---------------------------------------------------------------------------
  // Step 3 -> Step 4: Import
  // ---------------------------------------------------------------------------

  async function runImport() {
    setIsImporting(true);
    setImportError(null);
    setImportProgress(0);

    try {
      // Create batch
      const batch = await createImportBatch(userId, {
        method: "CSV",
        fileName: file?.name,
        columnMapping: mapping as Record<string, string>,
      });

      setImportedBatchId(batch.id);
      setImportProgress(20);

      // Build trade payloads for valid (and optionally warning) rows
      const rowsToImport = skipInvalid
        ? validationResults.filter((r) => r.status !== "invalid")
        : validationResults;

      const tradePayloads = rowsToImport
        .map((result) => {
          const rawRow = allRawRows[result.rowIndex];
          const mappedRow: Record<string, string> = {};
          for (const [field, csvCol] of Object.entries(mapping)) {
            const val = rawRow[csvCol];
            if (val !== undefined) mappedRow[field] = val;
          }
          if (!mappedRow.market) mappedRow.market = "FUTURES";

          const parsed = ImportTradeRowSchema.safeParse(mappedRow);
          if (!parsed.success) return null;
          const d = parsed.data;

          return {
            symbol: d.symbol,
            market: d.market,
            side: d.side,
            entryAt: d.entryAt ?? new Date().toISOString(),
            exitAt: d.exitAt ?? undefined,
            entryPrice: d.entryPrice,
            exitPrice: d.exitPrice ?? undefined,
            stopPrice: d.stopPrice ?? undefined,
            targetPrice: d.targetPrice ?? undefined,
            size: d.size,
            fees: d.fees ?? 0,
            pnlAmount: d.pnlAmount ?? undefined,
            pnlR: d.pnlR ?? undefined,
            session: d.session ?? undefined,
            setupType: d.setupType ?? undefined,
            adherence: (d.adherence ?? "UNREVIEWED") as "YES" | "NO" | "PARTIAL" | "UNREVIEWED",
            isOpen: !d.exitAt,
            wasReviewed: false,
            riskViolations: d.riskViolations ?? [],
            tagIds: [],
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      setImportProgress(40);

      const result = await importTrades(batch.id, userId, tradePayloads);

      setImportProgress(100);
      setImportResult(result);
      setStep("import");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const validCount = validationResults.filter((r) => r.status === "valid").length;
  const warningCount = validationResults.filter((r) => r.status === "warning").length;
  const invalidCount = validationResults.filter((r) => r.status === "invalid").length;
  const importableCount = skipInvalid ? validCount + warningCount : validationResults.length;

  const requiredMissing = getRequiredMissing(mapping);
  const canProceedToValidate =
    file !== null && csvHeaders.length > 0 && requiredMissing.length === 0;

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, idx) => (
          <div key={s.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                step === s.key
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : idx < currentStepIdx
                  ? "text-green-400"
                  : "text-slate-500",
              )}
            >
              {idx < currentStepIdx ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className={cn(
                  "inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold border",
                  step === s.key ? "border-indigo-500/50 text-indigo-400" : "border-slate-700 text-slate-500",
                )}>
                  {idx + 1}
                </span>
              )}
              {s.label}
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-6 h-px bg-slate-700 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-indigo-500 bg-indigo-500/5"
                : file
                ? "border-green-500/50 bg-green-500/5"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900/80",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatBytes(file.size)} &middot; {allRawRows.length} rows detected
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setCsvHeaders([]);
                    setCsvPreviewRows([]);
                    setAllRawRows([]);
                    setMapping({});
                    setParseError(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-200">
                    {isDragging ? "Drop your CSV here" : "Drag & drop your CSV file"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                </div>
                <p className="text-xs text-slate-600">CSV files only &middot; Any column order</p>
              </div>
            )}
          </div>

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/40 border border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{parseError}</p>
            </div>
          )}

          {/* CSV preview */}
          {csvHeaders.length > 0 && csvPreviewRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Preview (first 5 rows)</p>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900">
                      {csvHeaders.slice(0, 8).map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      {csvHeaders.length > 8 && (
                        <th className="text-left px-3 py-2 text-slate-600">+{csvHeaders.length - 8} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreviewRows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                        {csvHeaders.slice(0, 8).map((h) => (
                          <td key={h} className="px-3 py-1.5 text-slate-300 font-mono whitespace-nowrap max-w-[120px] truncate">
                            {row[h] ?? ""}
                          </td>
                        ))}
                        {csvHeaders.length > 8 && <td className="px-3 py-1.5 text-slate-600">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              disabled={!file || csvHeaders.length === 0}
              onClick={() => setStep("map")}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Next: Map Columns
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Column Mapping ────────────────────────────────────────── */}
      {step === "map" && (
        <div className="space-y-4">
          <ColumnMapper
            csvHeaders={csvHeaders}
            previewRows={csvPreviewRows}
            internalFields={ALL_FIELDS}
            value={mapping}
            onChange={setMapping}
          />

          {requiredMissing.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-400 font-medium">Required fields not mapped</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  {requiredMissing.join(", ")}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep("upload")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              disabled={!canProceedToValidate}
              onClick={runValidation}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Next: Validate Rows
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Validation ────────────────────────────────────────────── */}
      {step === "validate" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{validationResults.length}</p>
              <p className="text-xs text-slate-400">Total rows</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{validCount}</p>
              <p className="text-xs text-slate-400">Valid</p>
            </div>
            {warningCount > 0 && (
              <>
                <div className="h-8 w-px bg-slate-700" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
                  <p className="text-xs text-slate-400">Warnings</p>
                </div>
              </>
            )}
            {invalidCount > 0 && (
              <>
                <div className="h-8 w-px bg-slate-700" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
                  <p className="text-xs text-slate-400">Invalid</p>
                </div>
              </>
            )}
          </div>

          {invalidCount > 0 && (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 cursor-pointer hover:bg-slate-900/50 transition-colors">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={(e) => setSkipInvalid(e.target.checked)}
                className="h-4 w-4 accent-indigo-500"
              />
              <div>
                <p className="text-sm text-slate-200 font-medium">Skip invalid rows</p>
                <p className="text-xs text-slate-400">
                  Import {importableCount} valid row{importableCount !== 1 ? "s" : ""}, skip {invalidCount} invalid
                </p>
              </div>
            </label>
          )}

          <ValidationTable rows={validationResults} />

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep("map")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              disabled={importableCount === 0}
              onClick={runImport}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Import {importableCount} Trade{importableCount !== 1 ? "s" : ""}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Import ────────────────────────────────────────────────── */}
      {step === "import" && (
        <div className="space-y-6">
          {isImporting && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                <p className="text-slate-300 font-medium">Importing trades…</p>
              </div>
              <Progress value={importProgress} className="h-2 bg-slate-800" />
              <p className="text-xs text-slate-500">{importProgress}% complete</p>
            </div>
          )}

          {importError && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-950/40 border border-red-500/30">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Import failed</p>
                <p className="text-xs text-red-400/80 mt-1">{importError}</p>
              </div>
            </div>
          )}

          {importResult && !isImporting && (
            <div className="space-y-6 py-4">
              {/* Success header */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{importResult.imported}</p>
                  <p className="text-slate-400">
                    trade{importResult.imported !== 1 ? "s" : ""} successfully imported
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="text-left p-3 rounded-lg bg-amber-950/40 border border-amber-500/30">
                  <p className="text-xs font-medium text-amber-400 mb-2">
                    {importResult.errors.length} row{importResult.errors.length !== 1 ? "s" : ""} skipped:
                  </p>
                  <ul className="space-y-0.5">
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-amber-400/80">{e}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li className="text-xs text-amber-400/60">
                        …and {importResult.errors.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* What happens next */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">
                  What happens next?
                </h3>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <List className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Review a sample of your trades
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Answer a few questions about a small selection of trades to teach
                        the system your setups and patterns.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        AI identifies patterns in your historical behavior
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Based on your answers, the system will cluster recurring behaviors
                        and suggest setup labels — no financial advice is generated.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Your journal is pre-populated and ready for deep review
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Setup classifications and context from your review flow into the
                        journal automatically.
                      </p>
                    </div>
                  </li>
                </ol>

                {importedBatchId && (
                  <Button
                    onClick={() => router.push(`/import/review/${importedBatchId}`)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Post-Import Review
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push("/journal")}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Go to Journal
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
