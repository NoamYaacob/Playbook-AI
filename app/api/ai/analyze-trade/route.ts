// ---------------------------------------------------------------------------
// AI – Analyze Trade API Route
//
// POST /api/ai/analyze-trade
//
// Request body: { tradeId: string; strategyId: string }
//
// Loads the trade and strategy from the database, calls the AI provider's
// analyzeTrade() method, persists the AI results back to the trade record,
// and returns the analysis output.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ai } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const AnalyzeTradeSchema = z.object({
  tradeId: z.string().min(1, "tradeId is required"),
  strategyId: z.string().min(1, "strategyId is required"),
});

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = AnalyzeTradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { tradeId, strategyId } = parsed.data;

    // Load trade
    const trade = await db.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return NextResponse.json(
        { error: `Trade "${tradeId}" not found` },
        { status: 404 },
      );
    }

    // Load strategy
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: `Strategy "${strategyId}" not found` },
        { status: 404 },
      );
    }

    // Ensure the trade belongs to the same user as the strategy
    if (trade.userId !== strategy.userId) {
      return NextResponse.json(
        { error: "Trade and strategy do not belong to the same user" },
        { status: 403 },
      );
    }

    // Call AI provider
    const analysis = await ai.analyzeTrade({ trade, strategy });

    // Persist AI results back to the trade
    await db.trade.update({
      where: { id: tradeId },
      data: {
        aiAdherence: analysis.adherence,
        aiConfidence: analysis.confidence,
        aiReasoning: analysis.reasoning,
        aiSetupClassification: analysis.setupClassification,
        aiAnalyzedAt: new Date(),
        // Merge any new behaviour flags into riskViolations
        riskViolations:
          analysis.behaviorFlags.length > 0
            ? { push: analysis.behaviorFlags }
            : undefined,
      },
    });

    return NextResponse.json({ analysis }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/ai/analyze-trade]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during trade analysis." },
      { status: 500 },
    );
  }
}
