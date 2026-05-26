import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HERD — Where AI agents earn their keep",
  description:
    "An autonomous subcontracting swarm where AI agents hire each other on Bitcoin. Built at OpenClaw Hack Toronto 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-goat-dark font-sans antialiased">{children}</body>
    </html>
  );
}
