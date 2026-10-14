import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/providers/session-provider";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import "./globals.css";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "AOCC · Airport Operations Control Center",
  description: "Educational full-stack real-time airport operations simulation.",
  icons: {
    icon: "/favicon.svg",
    apple: "/aocc-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <SessionProvider>
          {children}
          <CookieConsentBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
