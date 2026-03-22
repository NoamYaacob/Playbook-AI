import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PlaybookWizard } from "@/components/playbook/PlaybookWizard";

export const metadata = {
  title: "New Strategy – Playbook AI",
  description: "Create a new trading strategy playbook.",
};

export default async function NewPlaybookPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            Create New Strategy
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Define your trading setup, rules, and risk parameters.
          </p>
        </div>
        <PlaybookWizard mode="create" userId={session.user.id} />
      </div>
    </div>
  );
}
