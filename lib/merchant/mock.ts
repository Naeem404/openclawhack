/**
 * Mock merchant APIs — tracking, support tickets, and agent-to-agent endpoints.
 *
 * In demo mode these are deterministic but realistic. The shapes mirror what a
 * real Shopify/Amazon/Shippo integration would return so the rest of the
 * agent code can be swapped onto real APIs by replacing this module.
 */
import { nanoid } from "nanoid";
import { sleep, randomBetween, fakeTxHash } from "@/lib/utils";
import { merchantsById } from "@/data/seed-merchants";
import type { MerchantProfile, Shipment, ShipmentEvent } from "@/lib/types";

const shipmentDB = new Map<string, Shipment>();

function syntheticShipment(tracking: string, carrier: string): Shipment {
  const baseEvents: ShipmentEvent[] = [
    {
      ts: new Date(Date.now() - 5 * 864e5).toISOString(),
      location: "Mississauga, ON",
      status: "Label created",
    },
    {
      ts: new Date(Date.now() - 4 * 864e5).toISOString(),
      location: "Mississauga, ON",
      status: "Picked up by carrier",
    },
    {
      ts: new Date(Date.now() - 3 * 864e5).toISOString(),
      location: "Toronto, ON",
      status: "Arrived at sort facility",
    },
    {
      ts: new Date(Date.now() - 2 * 864e5).toISOString(),
      location: "Toronto, ON",
      status: "Delayed at sort facility",
      detail: "Carrier reported processing delay",
    },
  ];
  return {
    trackingNumber: tracking,
    carrier,
    status: "delayed",
    events: baseEvents,
    lastUpdate: baseEvents.at(-1)!.ts,
  };
}

export const merchantApi = {
  async trackShipment(tracking: string, carrier: string): Promise<Shipment> {
    await sleep(randomBetween(180, 420));
    if (!shipmentDB.has(tracking)) {
      shipmentDB.set(tracking, syntheticShipment(tracking, carrier));
    }
    return shipmentDB.get(tracking)!;
  },

  /** Pretend a delivery problem became visible since last poll. */
  injectShipmentProblem(
    tracking: string,
    problem: "delayed" | "lost" | "returned" = "delayed",
  ) {
    const s =
      shipmentDB.get(tracking) ?? syntheticShipment(tracking, "GoFleet");
    s.status = problem;
    s.events.push({
      ts: new Date().toISOString(),
      location: "Carrier hub",
      status:
        problem === "lost"
          ? "Tracking event missing — package presumed lost"
          : problem === "returned"
          ? "Package returned to sender"
          : "Package delayed — exception scan recorded",
    });
    s.lastUpdate = new Date().toISOString();
    shipmentDB.set(tracking, s);
    return s;
  },

  getMerchant(id: string): MerchantProfile | undefined {
    return merchantsById[id];
  },

  /**
   * Agent-to-agent endpoint. In production this would HTTP-POST a signed
   * x402 dispute payload to merchant.agentEndpoint and parse the response.
   */
  async contactAgent(
    merchantId: string,
    endpoint: string,
    payload: Record<string, unknown>,
  ): Promise<{
    accepted: boolean;
    counterOffer?: { type: "refund" | "replacement" | "credit"; amount?: number };
    requestId: string;
    signature: string;
  }> {
    const merchant = merchantsById[merchantId];
    await sleep(randomBetween(500, 1100));
    if (!merchant) {
      return {
        accepted: false,
        requestId: "req_" + nanoid(8),
        signature: "0x" + fakeTxHash("a2a-deny").slice(2, 130),
      };
    }
    const accept = Math.random() < merchant.refundFriendliness;
    return {
      accepted: accept,
      counterOffer: accept
        ? { type: "refund", amount: (payload.amount as number) ?? 0 }
        : { type: "credit", amount: Math.floor(((payload.amount as number) ?? 0) * 0.5) },
      requestId: "req_" + nanoid(8),
      signature: "0x" + fakeTxHash(endpoint + JSON.stringify(payload)).slice(2, 130),
    };
  },
};
