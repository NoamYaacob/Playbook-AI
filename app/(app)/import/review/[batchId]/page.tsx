// ---------------------------------------------------------------------------
// Post-Import Review Page – Server Component
// ---------------------------------------------------------------------------

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createPostImportReview,
  getPostImportReview,
} from "@/lib/actions/import.actions";
import { PostImportReviewWizard } from "@/components/import/PostImportReviewWizard";
import { PageHeader } from "@/components/shared/PageHeader";
import type { TradeRow, PostImportReviewRow } from "@/types";

interface PageProps {
  params: Promise<{ batchId: string }>;
}

export default async function PostImportReviewPage({ params }: PageProps) {
  const { batchId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Verify the batch belongs to this user
  const batch = await db.importBatch.findFirst({
    where: { id: batchId, userId },
    select: { id: true, fileName: true, importedCount: true, createdAt: true },
  });
  if (!batch) notFound();

  // Load or create the review
  let review = await getPostImportReview(batchId, userId);
  if (!review) {
    review = await createPostImportReview(batchId, userId);
  }

  // Load the sample trades for the review
  const sampleTrades = await db.trade.findMany({
    where: { id: { in: review.sampleTradeIds }, userId },
    orderBy: { entryAt: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Trade Review"
        subtitle="Help us understand your trading patterns by reviewing a sample of your imported trades."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Import", href: "/import" },
          { label: "Review" },
        ]}
      />

      <PostImportReviewWizard
        batchId={batchId}
        review={review as PostImportReviewRow}
        sampleTrades={sampleTrades as unknown as TradeRow[]}
        userId={userId}
      />
    </div>
  );
}
