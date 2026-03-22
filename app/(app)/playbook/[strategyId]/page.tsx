import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { getStrategy } from "@/lib/actions/strategy.actions";
import { db } from "@/lib/db";
import { StrategyDetail } from "@/components/playbook/StrategyDetail";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/shared/DisclaimerBanner";

interface Props {
  params: Promise<{ strategyId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { strategyId } = await params;
  const session = await auth();
  if (!session?.user?.id) return { title: "Strategy – Playbook AI" };

  const strategy = await getStrategy(strategyId, session.user.id);
  return {
    title: strategy ? `${strategy.title} – Playbook AI` : "Strategy – Playbook AI",
  };
}

export default async function StrategyDetailPage({ params }: Props) {
  const { strategyId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const strategy = await getStrategy(strategyId, session.user.id);
  if (!strategy) notFound();

  // Load trade stats for this strategy
  const tradeStats = await db.trade.aggregate({
    where: { strategyId: strategy.id, userId: session.user.id },
    _count: { id: true },
  });

  const adherentCount = await db.trade.count({
    where: {
      strategyId: strategy.id,
      userId: session.user.id,
      adherence: "YES",
    },
  });

  const totalTrades = tradeStats._count.id;
  const adherenceScore =
    totalTrades > 0 ? Math.round((adherentCount / totalTrades) * 100) : 0;

  // Load example images
  const exampleImages = await db.strategyExampleImage.findMany({
    where: { strategyId: strategy.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Top action bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/playbook"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to Playbook
          </Link>
          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Link href={`/playbook/${strategy.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit Strategy
            </Link>
          </Button>
        </div>

        <StrategyDetail
          strategy={strategy}
          exampleImages={exampleImages}
          tradeCount={totalTrades}
          adherenceScore={adherenceScore}
        />

        <div className="mt-6">
          <DisclaimerBanner
            variant="subtle"
            message="This playbook is your personal trading strategy document. Adherence scores and rule checks are based solely on your own defined criteria. Nothing in this platform constitutes financial advice or investment recommendations."
          />
        </div>
      </div>
    </div>
  );
}
