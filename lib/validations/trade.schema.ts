// ---------------------------------------------------------------------------
// Trade – Zod Validation Schema
//
// Mirrors every field on the Prisma Trade model that a user can create or
// edit.  Read-only computed fields (id, userId, createdAt, etc.) are omitted.
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
// Schema
// ---------------------------------------------------------------------------

export const TradeSchema = z
  .object({
    // ── Required identifiers ───────────────────────────────────────────────
    strategyId: z.string().cuid().optional().nullable(),
    importBatchId: z.string().cuid().optional().nullable(),

    // ── Core trade data ────────────────────────────────────────────────────
    symbol: z
      .string()
      .min(1, "Symbol is required")
      .max(20, "Symbol must be at most 20 characters")
      .trim()
      .toUpperCase(),

    market: z.enum(marketValues, {
      error: "Select a market",
    }),

    side: z.enum(tradeSideValues, {
      error: "Select Long or Short",
    }),

    // ISO datetime strings; accept Date or string and coerce
    entryAt: z
      .union([z.string().datetime(), z.date()])
      .transform((v) => (v instanceof Date ? v.toISOString() : v)),

    exitAt: z
      .union([z.string().datetime(), z.date()])
      .transform((v) => (v instanceof Date ? v.toISOString() : v))
      .optional()
      .nullable(),

    entryPrice: z
      .number("Entry price is required")
      .positive("Entry price must be positive"),

    exitPrice: z.number().positive("Exit price must be positive").optional().nullable(),

    stopPrice: z.number().positive("Stop price must be positive").optional().nullable(),

    targetPrice: z.number().positive("Target price must be positive").optional().nullable(),

    size: z
      .number("Size is required")
      .positive("Size must be positive"),

    fees: z.number().min(0).default(0).optional(),

    // ── Computed / derived ─────────────────────────────────────────────────
    pnlAmount: z.number().optional().nullable(),
    pnlR: z.number().optional().nullable(),

    // ── Session & setup ────────────────────────────────────────────────────
    session: z.string().max(50).trim().optional().nullable(),
    setupType: z.string().max(100).trim().optional().nullable(),

    isOpen: z.boolean().default(false),

    // ── Adherence ──────────────────────────────────────────────────────────
    adherence: z.enum(adherenceValues).default("UNREVIEWED"),
    adherenceNotes: z.string().max(2000).trim().optional().nullable(),
    wasReviewed: z.boolean().default(false),

    // ── Trade journal notes ────────────────────────────────────────────────
    whatDidYouSee: z.string().max(2000).trim().optional().nullable(),
    whyTaken: z.string().max(2000).trim().optional().nullable(),
    setupTrigger: z.string().max(2000).trim().optional().nullable(),
    stopRationale: z.string().max(2000).trim().optional().nullable(),
    targetRationale: z.string().max(2000).trim().optional().nullable(),
    mistakeNotes: z.string().max(2000).trim().optional().nullable(),
    lessonLearned: z.string().max(2000).trim().optional().nullable(),

    // ── Planned & review ──────────────────────────────────────────────────
    wasPlanned: z.boolean().optional().nullable(),
    wouldTakeAgain: z.boolean().optional().nullable(),

    // ── Emotions ───────────────────────────────────────────────────────────
    emotionBefore: z.enum(emotionTagValues).optional().nullable(),
    emotionAfter: z.enum(emotionTagValues).optional().nullable(),

    // ── Risk violations (set programmatically, editable by user) ──────────
    riskViolations: z.array(z.string()).default([]),

    // ── Tag IDs ───────────────────────────────────────────────────────────
    tagIds: z.array(z.string().cuid()).default([]),
  })
  .superRefine((data, ctx) => {
    // exitAt must be after entryAt when both are provided
    if (data.exitAt && data.entryAt) {
      const entry = new Date(data.entryAt);
      const exit = new Date(data.exitAt);
      if (exit <= entry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exitAt"],
          message: "Exit time must be after entry time",
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// Inferred type
// ---------------------------------------------------------------------------

export type TradeFormData = z.infer<typeof TradeSchema>;
