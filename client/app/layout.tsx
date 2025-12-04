import type React from "react";
import type { Metadata } from "next";
import { DM_Sans, Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { getAppConfigServer } from "@/lib/config-server";

// Databricks primary font - DM Sans
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Databricks accent font - Montserrat
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

// Inter font
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Generate metadata (server-side)
export function generateMetadata(): Metadata {
  const config = getAppConfigServer();

  return {
    title: config.branding.tabTitle,
    description: config.branding.description,
    generator: "v0.dev",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${montserrat.variable} ${inter.variable} font-sans antialiased texture-overlay`}
      >
        {children}
      </body>
    </html>
  );
}
