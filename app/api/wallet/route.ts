import { NextResponse } from "next/server";
import { wallet } from "@/lib/chain/wallet";
import { reputation } from "@/lib/store/reputation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    wallet: wallet.state(),
    reputation: reputation.current(),
  });
}

export async function POST() {
  const gen = wallet.generate();
  return NextResponse.json(gen);
}
