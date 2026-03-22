import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getPreMarketContext } from "@/lib/pre-market/context";
import { PreMarketAnalyzer } from "@/components/pre-market/PreMarketAnalyzer";

export const metadata = {
  title: "Pre-Market Analyzer – Playbook AI",
  description: "Reflective pre-market preparation based on your existing playbook and risk rules.",
};

export default async function PreMarketPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const context = await getPreMarketContext(session.user.id);

  return <PreMarketAnalyzer context={context} />;
}
