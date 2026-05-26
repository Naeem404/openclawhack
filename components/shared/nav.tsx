"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/demo", label: "Demo" },
  { href: "/pitch", label: "Pitch" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-rex-orange to-rex-amber overflow-hidden grid place-items-center">
            <span className="font-mono text-[10px] font-bold text-zinc-950">RRX</span>
            <div className="absolute inset-0 shimmer opacity-40" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-sm tracking-tight">RefundRex</span>
            <span className="text-[10px] text-muted-foreground">
              autonomous refund agent
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname === item.href
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-3 flex items-center gap-2">
            <Badge variant="success" className="font-mono">
              ● LIVE
            </Badge>
            <Button variant="cyan" size="sm" asChild>
              <Link href="/demo">Run demo</Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
