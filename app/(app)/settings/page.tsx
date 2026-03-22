import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStrategies } from "@/lib/actions/strategy.actions";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { StrategyRow } from "@/types";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, strategies] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        timezone: true,
        language: true,
        accountType: true,
        primaryMarkets: true,
        goals: true,
      },
    }),
    getStrategies(userId),
  ]);

  if (!user) redirect("/login");

  return <SettingsClient user={user} strategies={strategies as unknown as StrategyRow[]} />;
}
