import { NextResponse } from "next/server";
import { erc8004 } from "@/lib/chain/erc8004";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await erc8004.register();
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    manifest: erc8004.buildManifest(),
    registry: erc8004.registry,
    scanUrl: erc8004.scanUrl(),
  });
}
