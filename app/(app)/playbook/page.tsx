import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";

import { auth } from "@/lib/auth";
import { getStrategies } from "@/lib/actions/strategy.actions";
import { PlaybookList } from "@/components/playbook/PlaybookList";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Playbook – Playbook AI",
  description: "Manage your trading strategies and playbooks.",
};

export default async function PlaybookPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const strategies = await getStrategies(session.user.id);

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Strategy Playbook
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Define, manage, and track adherence to your trading strategies.
            </p>
          </div>
          <Button
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Link href="/playbook/new">
              <Plus className="h-4 w-4" />
              Create Strategy
            </Link>
          </Button>
        </div>

        {strategies.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20">
              <BookOpen className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-100">
              No strategies yet
            </h2>
            <p className="mb-6 max-w-sm text-sm text-slate-400">
              Build your first trading playbook to start tracking adherence,
              identifying your best setups, and improving your discipline.
            </p>
            <Button
              asChild
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Link href="/playbook/new">
                <Plus className="h-4 w-4" />
                Create Your First Strategy
              </Link>
            </Button>
          </div>
        ) : (
          <PlaybookList strategies={strategies} userId={session.user.id} />
        )}
      </div>
    </div>
  );
}
