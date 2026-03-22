// ---------------------------------------------------------------------------
// CSV Parser Utilities
//
// Uses papaparse for reliable CSV parsing. All functions are async-safe and
// work in both browser (File API) and Node.js (Buffer) environments.
// ---------------------------------------------------------------------------

import Papa from "papaparse";
import type { CSVColumnMapping } from "@/lib/validations/import.schema";
import { ImportTradeRowSchema } from "@/lib/validations/import.schema";
import type { TradeFormData } from "@/lib/validations/trade.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
}

export interface MappedTrade extends Partial<TradeFormData> {
  _rowIndex?: number;
}

// ---------------------------------------------------------------------------
// parseCSV
// ---------------------------------------------------------------------------

/**
 * Parses a CSV File and returns the header row and all data rows as key-value
 * string records.
 *
 * @param file - A browser File object selected by the user.
 * @returns Promise resolving to { headers, rows }.
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete(results) {
        if (results.errors.length > 0) {
          // Only surface fatal errors; row-level errors are handled per-row
          const fatal = results.errors.filter(
            (e) => e.type === "Delimiter" || e.type === "Quotes",
          );
          if (fatal.length > 0) {
            reject(
              new Error(
                `CSV parse error: ${fatal.map((e) => e.message).join("; ")}`,
              ),
            );
            return;
          }
        }

        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        resolve({ headers, rows });
      },
      error(err: Error) {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      },
    });
  });
}

// ---------------------------------------------------------------------------
// mapRowToTrade
// ---------------------------------------------------------------------------

/**
 * Applies a column mapping to a single CSV row and returns a partial
 * TradeFormData object.
 *
 * Only fields that have a corresponding mapping entry AND a non-empty value in
 * the row are included in the output.
 *
 * @param row     - Raw CSV row keyed by CSV header name.
 * @param mapping - User-defined mapping from trade field names to CSV headers.
 * @returns Partial<TradeFormData>
 */
export function mapRowToTrade(
  row: Record<string, string>,
  mapping: CSVColumnMapping,
): Partial<TradeFormData> {
  const mapped: Record<string, string> = {};

  // Iterate over the mapping and pull matching values from the row
  for (const [fieldName, csvHeader] of Object.entries(mapping)) {
    if (!csvHeader) continue;
    const value = row[csvHeader];
    if (value !== undefined && value !== "") {
      mapped[fieldName] = value;
    }
  }

  // Run the row through the import schema's safe-parse to coerce types
  const result = ImportTradeRowSchema.safeParse(mapped);
  if (!result.success) {
    // Return whatever we can coerce manually for partial display purposes
    return buildPartialFromRaw(mapped);
  }

  const parsed = result.data;

  // Map ImportTradeRow → Partial<TradeFormData>
  const tradeData: Partial<TradeFormData> = {};

  if (parsed.symbol !== undefined) tradeData.symbol = parsed.symbol;
  if (parsed.market !== undefined) tradeData.market = parsed.market;
  if (parsed.side !== undefined) tradeData.side = parsed.side;
  if (parsed.entryAt !== undefined) tradeData.entryAt = parsed.entryAt;
  if (parsed.exitAt !== undefined) tradeData.exitAt = parsed.exitAt ?? null;
  if (parsed.entryPrice !== undefined) tradeData.entryPrice = parsed.entryPrice;
  if (parsed.exitPrice !== undefined) tradeData.exitPrice = parsed.exitPrice ?? null;
  if (parsed.stopPrice !== undefined) tradeData.stopPrice = parsed.stopPrice ?? null;
  if (parsed.targetPrice !== undefined)
    tradeData.targetPrice = parsed.targetPrice ?? null;
  if (parsed.size !== undefined) tradeData.size = parsed.size;
  if (parsed.fees !== undefined) tradeData.fees = parsed.fees ?? 0;
  if (parsed.pnlAmount !== undefined) tradeData.pnlAmount = parsed.pnlAmount ?? null;
  if (parsed.pnlR !== undefined) tradeData.pnlR = parsed.pnlR ?? null;
  if (parsed.session !== undefined) tradeData.session = parsed.session ?? null;
  if (parsed.setupType !== undefined) tradeData.setupType = parsed.setupType ?? null;
  if (parsed.adherence !== undefined)
    tradeData.adherence = parsed.adherence ?? "UNREVIEWED";
  if (parsed.adherenceNotes !== undefined)
    tradeData.adherenceNotes = parsed.adherenceNotes ?? null;
  if (parsed.whyTaken !== undefined) tradeData.whyTaken = parsed.whyTaken ?? null;
  if (parsed.setupTrigger !== undefined)
    tradeData.setupTrigger = parsed.setupTrigger ?? null;
  if (parsed.stopRationale !== undefined)
    tradeData.stopRationale = parsed.stopRationale ?? null;
  if (parsed.targetRationale !== undefined)
    tradeData.targetRationale = parsed.targetRationale ?? null;
  if (parsed.mistakeNotes !== undefined)
    tradeData.mistakeNotes = parsed.mistakeNotes ?? null;
  if (parsed.lessonLearned !== undefined)
    tradeData.lessonLearned = parsed.lessonLearned ?? null;
  if (parsed.emotionBefore !== undefined)
    tradeData.emotionBefore = parsed.emotionBefore ?? null;
  if (parsed.emotionAfter !== undefined)
    tradeData.emotionAfter = parsed.emotionAfter ?? null;
  if (parsed.riskViolations !== undefined)
    tradeData.riskViolations = parsed.riskViolations ?? [];

  return tradeData;
}

// ---------------------------------------------------------------------------
// validateRow
// ---------------------------------------------------------------------------

/**
 * Validates a single mapped CSV row against ImportTradeRowSchema.
 *
 * @param row     - Raw CSV row keyed by CSV header name.
 * @param mapping - User-defined mapping from trade field names to CSV headers.
 * @returns { valid, errors } where errors is a list of human-readable messages.
 */
export function validateRow(
  row: Record<string, string>,
  mapping: CSVColumnMapping,
): RowValidationResult {
  const mapped: Record<string, string> = {};

  for (const [fieldName, csvHeader] of Object.entries(mapping)) {
    if (!csvHeader) continue;
    const value = row[csvHeader];
    if (value !== undefined) {
      mapped[fieldName] = value;
    }
  }

  const result = ImportTradeRowSchema.safeParse(mapped);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
    return `${path}${e.message}`;
  });

  return { valid: false, errors };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort partial extraction from a raw string map when schema validation
 * fails. Used to provide partial preview data to the user.
 */
function buildPartialFromRaw(
  raw: Record<string, string>,
): Partial<TradeFormData> {
  const partial: Partial<TradeFormData> = {};

  if (raw.symbol) partial.symbol = raw.symbol.toUpperCase();
  if (raw.entryPrice && !Number.isNaN(Number(raw.entryPrice)))
    partial.entryPrice = Number(raw.entryPrice);
  if (raw.exitPrice && !Number.isNaN(Number(raw.exitPrice)))
    partial.exitPrice = Number(raw.exitPrice);
  if (raw.size && !Number.isNaN(Number(raw.size)))
    partial.size = Number(raw.size);
  if (raw.session) partial.session = raw.session;
  if (raw.setupType) partial.setupType = raw.setupType;

  return partial;
}
