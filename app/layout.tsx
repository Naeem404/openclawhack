import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/shared/nav";
import { AnimatedBackground } from "@/components/shared/animated-background";

export const metadata: Metadata = {
  title: "RefundRex — Autonomous Refund & Dispute Agent",
  description:
    "RefundRex is an autonomous AI agent on GOAT Network. Owns its identity (ERC-8004), runs its own wallet, and resolves refund disputes via agent-native x402 payments.",
  metadataBase: new URL("https://refundrex.xyz"),
  openGraph: {
    title: "RefundRex",
    description:
      "Autonomous refund agent · ERC-8004 · GOAT Network · x402 · OpenClaw",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="relative min-h-screen bg-background text-foreground antialiased">
        <AnimatedBackground />
        <Nav />
        <main className="container mx-auto py-8 relative">{children}</main>
        <footer className="container mx-auto py-12 mt-8 border-t border-border text-[11px] text-muted-foreground font-mono flex flex-wrap items-center justify-between gap-3">
          <span>
            © 2026 RefundRex. Built on{" "}
            <a
              href="https://www.goat.network"
              target="_blank"
              rel="noreferrer"
              className="text-rex-orange hover:underline"
            >
              GOAT Network
            </a>{" "}
            with OpenClaw · ERC-8004 · x402 · AgentKit.
          </span>
          <span>
            agent ·{" "}
            <a
              href="https://8004scan.io/agents?chain=2345"
              className="hover:underline text-rex-cyan"
              target="_blank"
              rel="noreferrer"
            >
              8004scan
            </a>{" "}
            ·{" "}
            <a
              href="https://explorer.goat.network"
              className="hover:underline text-rex-cyan"
              target="_blank"
              rel="noreferrer"
            >
              GOAT explorer
            </a>
          </span>
        </footer>
      </body>
    </html>
  );
}
