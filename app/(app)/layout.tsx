import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as typeof session.user & { onboardingDone?: boolean };

  // If user hasn't finished onboarding, render without the full app shell.
  // The /onboarding page itself handles rendering the wizard and checking
  // that the user shouldn't already be past onboarding.
  if (!user.onboardingDone) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar user={session.user} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar user={session.user} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
