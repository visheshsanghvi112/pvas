import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "PVASF — Market Surveillance Suite",
  description: "Institutional Price-Volume Analysis & Surveillance Framework",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ height: "100%" }}>
      <body suppressHydrationWarning style={{ height: "100%", margin: 0, overflow: "hidden" }}>
        <UserProvider>
          <AppShell>{children}</AppShell>
        </UserProvider>
      </body>
    </html>
  );
}
