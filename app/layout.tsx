import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "PVASF Market Surveillance & Scrip Analysis Suite",
  description: "Institutional Conduct, Compliance & Price-Volume Surveillance Suite"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <UserProvider>
          <AppShell>{children}</AppShell>
        </UserProvider>
      </body>
    </html>
  );
}
