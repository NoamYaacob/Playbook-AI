// ---------------------------------------------------------------------------
// CSV Import – Zod Validation Schemas
//
// ColumnMappingSchema  – maps CSV header names to trade fields
// ImportTradeRowSchema – validates a single raw CSV row after mapping
// ---------------------------------------------------------------------------

import { z } from "zod";
import { Market, TradeSide, AdherenceStatus, EmotionTag } from "@/types";

// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------

const marketValues = Object.values(Market) as [
  (typeof Market)[keyof typeof Market],
  ...(typeof Market)[keyof typeof Market][],
];

const tradeSideValues = Object.values(TradeSide) as [
  (typeof TradeSide)[keyof typeof TradeSide],
  ...(typeof TradeSide)[keyof typeof TradeSide][],
];

const adherenceValues = Object.values(AdherenceStatus) as [
  (typeof AdherenceStatus)[keyof typeof AdherenceStatus],
  ...(typeof AdherenceStatus)[keyof typeof AdherenceStatus][],
];

const emotionTagValues = Object.values(EmotionTag) as [
  (typeof EmotionTag)[keyof typeof EmotionTag],
  ...(typeof EmotionTag)[keyof typeof EmotionTag][],
];

// ---------------------------------------------------------------------------
// Column mapping schema
//
// Each key is a trade field name; the value is the CSV header (column name)
// that should be read for that field. All are optional because the user may
// not have a column for every field.
// ---------------------------------------------------------------------------

export const ColumnMappingSchema = z.object({
  // Required trade fields
  symbol: z.string().min(1).optional(),
  market: z.string().min(1).optional(),
  side: z.string().min(1).optional(),
  entryAt: z.string().min(1).optional(),
  entryPrice: z.string().min(1).optional(),
  size: z.string().min(1).optional(),

  // Commonly mapped optional fields
  exitAt: z.string().min(1).optional(),
  exitPrice: z.string().min(1).optional(),
  stopPrice: z.string().min(1).optional(),
  targetPrice: z.string().min(1).optional(),
  fees: z.string().min(1).optional(),
  pnlAmount: z.string().min(1).optional(),
  pnlR: z.string().min(1).optional(),

  // Session & setup
  session: z.string().min(1).optional(),
  setupType: z.string().min(1).optional(),

  // Adherence
  adherence: z.string().min(1).optional(),
  adherenceNotes: z.string().min(1).optional(),

  // Journal notes
  whyTaken: z.string().min(1).optional(),
  setupTrigger: z.string().min(1).optional(),
  stopRationale: z.string().min(1).optional(),
  targetRationale: z.string().min(1).optional(),
  mistakeNotes: z.string().min(1).optional(),
  lessonLearned: z.string().min(1).optional(),

  // Emotions
  emotionBefore: z.string().min(1).optional(),
  emotionAfter: z.string().min(1).optional(),

  // Strategy linkage
  strategyId: z.string().min(1).optional(),

  // Risk violations (comma-separated string in CSV)
  riskViolations: z.string().min(1).optional(),
});

export type CSVColumnMapping = z.infer<typeof ColumnMappingSchema>;

// ---------------------------------------------------------------------------
// Single-row validation schema
//
// This schema validates a CSV row AFTER the column mapping has been applied,
// so all values arrive as strings. We coerce numbers and dates from strings.
// ---------------------------------------------------------------------------

/** Coerce a numeric string (e.g. "1234.56") to a finite number. */
const numericString = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), {
    message: "Must be a valid number",
  })
  .transform((v) => (v === "" ? undefined : Number(v)));

/** Coerce an ISO-ish date string to an ISO string. */
const dateString = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (v === "") return true;
      const d = new Date(v);
      return !Number.isNaN(d.getTime());
    },
    { message: "Must be a valid date/time" },
  )
  .transform((v) => (v === "" ? undefined : new Date(v).toISOString()));

export const ImportTradeRowSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────────
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required")
    .max(20)
    .transform((v) => v.toUpperCase()),

  market: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(
      z.enum(marketValues, {
        error: `Market must be one of: ${marketValues.join(", ")}`,
      }),
    ),

  side: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(
      z.enum(tradeSideValues, {
        error: `Side must be one of: ${tradeSideValues.join(", ")}`,
      }),
    ),

  entryAt: dateString.pipe(z.string().min(1, "Entry date is required")),

  entryPrice: numericString.pipe(
    z
      .number()
      .positive("Entry price must be positive")
      .refine((v): v is number => v !== undefined, "Entry price is required"),
  ),

  size: numericString.pipe(
    z
      .number()
      .positive("Size must be positive")
      .refine((v): v is number => v !== undefined, "Size is required"),
  ),

  // ── Optional ──────────────────────────────────────────────────────────────
  exitAt: dateString.optional(),

  exitPrice: numericString
    .pipe(z.number().positive().optional())
    .optional(),

  stopPrice: numericString
    .pipe(z.number().positive().optional())
    .optional(),

  targetPrice: numericString
    .pipe(z.number().positive().optional())
    .optional(),

  fees: numericString.pipe(z.number().min(0).optional()).optional(),

  pnlAmount: numericString.pipe(z.number().optional()).optional(),

  pnlR: numericString.pipe(z.number().optional()).optional(),

  session: z.string().trim().max(50).optional(),

  setupType: z.string().trim().max(100).optional(),

  adherence: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(adherenceValues))
    .optional(),

  adherenceNotes: z.string().trim().max(2000).optional(),

  whyTaken: z.string().trim().max(2000).optional(),
  setupTrigger: z.string().trim().max(2000).optional(),
  stopRationale: z.string().trim().max(2000).optional(),
  targetRationale: z.string().trim().max(2000).optional(),
  mistakeNotes: z.string().trim().max(2000).optional(),
  lessonLearned: z.string().trim().max(2000).optional(),

  emotionBefore: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(emotionTagValues))
    .optional(),

  emotionAfter: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(emotionTagValues))
    .optional(),

  strategyId: z.string().trim().optional(),

  /** Comma-separated list of risk violation codes */
  riskViolations: z
    .string()
    .trim()
    .transform((v) =>
      v === ""
        ? []
        : v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    )
    .optional(),
});

export type ImportTradeRow = z.infer<typeof ImportTradeRowSchema>;
