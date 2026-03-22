import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // If onboarding already complete, skip to dashboard
  const user = session.user as typeof session.user & { onboardingDone?: boolean };
  if (user.onboardingDone) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      userId={session.user.id as string}
      initialName={session.user.name ?? ""}
    />
  );
}
