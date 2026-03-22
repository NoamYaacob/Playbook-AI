// ---------------------------------------------------------------------------
// AI – Daily Summary API Route
//
// POST /api/ai/daily-summary
//
// Request body: { date: string (ISO date); userId: string }
//
// Loads all trades for the specified day and the user's active strategy,
// calls the AI provider's summarizeDailyReview() method, and returns the
// generated summary. Does NOT persist the summary – callers may write it to
// a DailyReview record themselves.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ai } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const DailySummarySchema = z.object({
  date: z.string().min(1, "date is required"),
  userId: z.string().min(1, "userId is required"),
});

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = DailySummarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request body" },
        { status: 400 },
      );
    }

    const { date, userId } = parsed.data;

    // Parse and validate the date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: `Invalid date: "${date}". Provide an ISO date string.` },
        { status: 400 },
      );
    }

    // Build day boundaries (UTC)
    const dayStart = new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
      ),
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Load trades for that day
    const trades = await db.trade.findMany({
      where: {
        userId,
        entryAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { entryAt: "asc" },
    });

    if (trades.length === 0) {
      return NextResponse.json(
        { error: "No trades found for the specified date and user." },
        { status: 404 },
      );
    }

    // Load active strategy
    const activeStrategy = await db.strategy.findFirst({
      where: { userId, isActive: true },
    });

    // Call AI provider
    const summary = await ai.summarizeDailyReview({
      trades,
      strategy: activeStrategy ?? {},
      date: dayStart.toISOString(),
    });

    return NextResponse.json({ summary }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/ai/daily-summary]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating the daily summary." },
      { status: 500 },
    );
  }
}
