import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { getStrategy } from "@/lib/actions/strategy.actions";
import { PlaybookWizard } from "@/components/playbook/PlaybookWizard";

interface Props {
  params: Promise<{ strategyId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { strategyId } = await params;
  const session = await auth();
  if (!session?.user?.id) return { title: "Edit Strategy – Playbook AI" };

  const strategy = await getStrategy(strategyId, session.user.id);
  return {
    title: strategy
      ? `Edit ${strategy.title} – Playbook AI`
      : "Edit Strategy – Playbook AI",
  };
}

export default async function EditPlaybookPage({ params }: Props) {
  const { strategyId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const strategy = await getStrategy(strategyId, session.user.id);
  if (!strategy) notFound();

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href={`/playbook/${strategy.id}`}
            className="mb-4 inline-block text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Back to Strategy
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            Edit Strategy
          </h1>
          <p className="mt-1 text-sm text-slate-400">{strategy.title}</p>
        </div>
        <PlaybookWizard mode="edit" userId={session.user.id} strategy={strategy} />
      </div>
    </div>
  );
}
