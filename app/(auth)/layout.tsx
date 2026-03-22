import type { Metadata } from "next";
import { Target } from "lucide-react";

export const metadata: Metadata = {
  title: "Playbook AI – Sign In",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel – branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-12 border-r border-slate-800">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Playbook AI
          </span>
        </div>

        {/* Hero copy */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Trade with discipline.
              <br />
              <span className="text-indigo-400">Backed by data.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Log trades, track your playbook adherence, and let AI surface
              exactly where discipline is breaking down.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {[
              "AI-powered playbook adherence scoring",
              "Emotion & behavior pattern tracking",
              "Daily review with coaching insights",
              "Multi-strategy journal with deep analytics",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                  <svg
                    className="w-2.5 h-2.5 text-indigo-400"
                    fill="currentColor"
                    viewBox="0 0 8 8"
                  >
                    <path d="M6.41 1L3 4.41 1.59 3 .5 4.09 3 6.59 7.5 2.09z" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Playbook AI. All rights reserved.
        </p>
      </div>

      {/* Right panel – auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Playbook AI</span>
        </div>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
