import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

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
  return (
    <html lang="en" dir="ltr" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100 font-sans">
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
