// ---------------------------------------------------------------------------
// Strategy / Playbook – Zod Validation Schema
//
// Mirrors every field on the Prisma Strategy model.
// ---------------------------------------------------------------------------

import { z } from "zod";
import { Market } from "@/types";

// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------

const marketValues = Object.values(Market) as [
  (typeof Market)[keyof typeof Market],
  ...(typeof Market)[keyof typeof Market][],
];

// ---------------------------------------------------------------------------
// Risk-rules sub-schema (mirrors the Strategy.riskRules JSON column)
// ---------------------------------------------------------------------------

const RiskRulesSchema = z.object({
  noRevengeTrades: z.boolean().optional(),
  minLossesBeforePause: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional(),
  noSizeIncreaseAfterLoss: z.boolean().optional(),
  noTradeWithoutStop: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const StrategySchema = z.object({
  // ── Identity ──────────────────────────────────────────────────────────────
  title: z
    .string()
    .min(1, "Title is required")
    .max(120, "Title must be at most 120 characters")
    .trim(),

  description: z.string().max(2000).trim().optional(),

  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),

  // ── Markets & instruments ─────────────────────────────────────────────────
  markets: z
    .array(z.enum(marketValues))
    .min(1, "Select at least one market"),

  preferredSymbols: z.array(z.string().trim().min(1)).default([]),

  timeframes: z.array(z.string().trim().min(1)).default([]),

  tradingSessions: z.array(z.string().trim().min(1)).default([]),

  // ── Time rules ────────────────────────────────────────────────────────────
  /** HH:mm format, e.g. "09:30" */
  allowedHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format')
    .optional()
    .nullable(),

  allowedHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Must be in HH:mm format')
    .optional()
    .nullable(),

  /**
   * Array of forbidden hour ranges stored as JSON.
   * Each entry: { start: "HH:mm"; end: "HH:mm" }
   */
  forbiddenHours: z
    .array(
      z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .optional()
    .nullable(),

  // ── Setup definition ──────────────────────────────────────────────────────
  setupTypes: z.array(z.string().trim().min(1)).default([]),

  entryConditions: z.string().max(5000).trim().optional().nullable(),

  invalidationConditions: z.string().max(5000).trim().optional().nullable(),

  stopLogic: z.string().max(5000).trim().optional().nullable(),

  targetLogic: z.string().max(5000).trim().optional().nullable(),

  noTradeConditions: z.string().max(5000).trim().optional().nullable(),

  // ── Risk rules ────────────────────────────────────────────────────────────
  minimumRR: z
    .number()
    .min(0.1, "Minimum R:R must be at least 0.1")
    .max(100)
    .optional()
    .nullable(),

  maxTradesPerDay: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .nullable(),

  maxDailyLoss: z
    .number()
    .min(0)
    .optional()
    .nullable(),

  maxDailyLossPct: z
    .number()
    .min(0)
    .max(100, "Max daily loss percentage cannot exceed 100%")
    .optional()
    .nullable(),

  riskRules: RiskRulesSchema.optional().nullable(),

  // ── Miscellaneous ─────────────────────────────────────────────────────────
  notes: z.string().max(10000).trim().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type StrategyFormData = z.infer<typeof StrategySchema>;
