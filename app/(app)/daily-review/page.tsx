import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTrades } from "@/lib/actions/trade.actions";
import { getDailyReview } from "@/lib/actions/review.actions";
import { DailyReviewForm } from "@/components/daily-review/DailyReviewForm";
import { TradeRow, DailyReviewRow } from "@/types";
import { Separator } from "@/components/ui/separator";

export default async function DailyReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Today (midnight UTC)
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Load today's trades and existing review in parallel
  const [rawTrades, existingReview] = await Promise.all([
    getTrades(userId, {
      dateFrom: today.toISOString(),
      dateTo: tomorrow.toISOString(),
      pageSize: 200,
    }),
    getDailyReview(userId, today),
  ]);

  const trades = rawTrades as unknown as TradeRow[];
  const review = existingReview as unknown as DailyReviewRow | null;

  return (
    <div className="space-y-6">
      <DailyReviewForm
        userId={userId}
        date={today}
        trades={trades}
        existingReview={review}
      />

      <Separator className="bg-slate-800" />

      <p className="text-xs text-slate-600 text-center pb-2">
        Your daily review is a private reflection tool. All data is based on your own uploaded
        trades and strategy rules. This is for educational and reflective purposes only.
      </p>
    </div>
  );
}
