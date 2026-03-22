import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as typeof session.user & { onboardingDone?: boolean };
  if (!user.onboardingDone) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
