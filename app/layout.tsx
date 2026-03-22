import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { DEFAULT_LOCALE, getLocaleDirection } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Playbook AI – Trade Smarter",
  description:
    "AI-powered trading journal and playbook adherence tracker for disciplined traders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = DEFAULT_LOCALE;
  const direction = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={direction} className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100 font-sans">
        <I18nProvider locale={locale}>
          <SessionProvider>{children}</SessionProvider>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
