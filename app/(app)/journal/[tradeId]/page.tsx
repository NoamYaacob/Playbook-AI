import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTrade } from "@/lib/actions/trade.actions";
import { TradeDetailPanel } from "@/components/journal/TradeDetailPanel";

interface PageProps {
  params: Promise<{ tradeId: string }>;
}

export default async function TradeDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tradeId } = await params;

  const trade = await getTrade(tradeId, session.user.id);

  if (!trade) notFound();

  return <TradeDetailPanel trade={trade} userId={session.user.id} />;
}
