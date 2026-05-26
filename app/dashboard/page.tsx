import { Badge } from "@/components/ui/badge";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { CaseList } from "@/components/dashboard/case-list";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { ReputationCard } from "@/components/dashboard/reputation-card";
import { ChainFeed } from "@/components/dashboard/chain-feed";
import { TerminalLog } from "@/components/shared/terminal-log";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Badge variant="success" className="font-mono mb-3">
            ● agent online · processing autonomously
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Mission control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view of RefundRex's wallet, reputation, open cases, and
            on-chain footprint.
          </p>
        </div>
      </header>

      <StatsGrid />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <CaseList />
          <TerminalLog height={300} />
        </div>
        <div className="space-y-5">
          <WalletCard />
          <ReputationCard />
          <ChainFeed />
        </div>
      </div>
    </div>
  );
}
