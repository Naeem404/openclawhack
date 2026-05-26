/**
 * Pre-baked demo scenarios. Each one is a self-contained pitch moment:
 * the user clicks "Run scenario" → the orchestrator processes a case
 * end-to-end in ~15-20 seconds with live logs + on-chain confirmations.
 */
import type { Order, Shipment } from "@/lib/types";

export interface DemoScenario {
  slug: string;
  title: string;
  blurb: string;
  expectedDurationMs: number;
  customerNote: string;
  order: Omit<Order, "orderedAt" | "expectedDeliveryAt"> & { offsetHours: number };
  shipment: Omit<Shipment, "lastUpdate">;
}

export const demoScenarios: DemoScenario[] = [
  {
    slug: "damaged-headphones",
    title: "Damaged $400 headphones",
    blurb:
      "High-value damaged-on-arrival case. Watch RefundRex classify → contact → settle with x402 fee in under 20s.",
    expectedDurationMs: 18_000,
    customerNote:
      "These arrived smashed. The box was crushed and the right cup is loose. I want a full refund.",
    order: {
      id: "ORD-A1-9981",
      merchantId: "gigabit",
      merchantName: "Gigabit Electronics",
      customerEmail: "demo@refundrex.xyz",
      customerName: "Demo Customer",
      itemName: "ARC-2 Pro Headphones",
      itemSku: "GB-ARC-2-PRO",
      category: "electronics",
      amountUsd: 399.99,
      currency: "USD",
      carrier: "GoFleet",
      trackingNumber: "GF-DMG-001",
      offsetHours: -96,
    },
    shipment: {
      trackingNumber: "GF-DMG-001",
      carrier: "GoFleet",
      status: "delivered",
      events: [
        { ts: new Date(Date.now() - 90 * 36e5).toISOString(), location: "Mississauga, ON", status: "Label created" },
        { ts: new Date(Date.now() - 80 * 36e5).toISOString(), location: "Mississauga, ON", status: "Picked up" },
        { ts: new Date(Date.now() - 60 * 36e5).toISOString(), location: "Toronto, ON", status: "In transit" },
        { ts: new Date(Date.now() - 24 * 36e5).toISOString(), location: "Toronto, ON", status: "Delivered — left at door" },
      ],
    },
  },
  {
    slug: "lost-package",
    title: "Lost package — $129 lamp",
    blurb:
      "Carrier silence for 12 days. Watch RefundRex auto-escalate twice and recover a full refund.",
    expectedDurationMs: 22_000,
    customerNote:
      "My package never arrived. Tracking hasn't moved in almost two weeks. I think it's lost.",
    order: {
      id: "ORD-A1-2271",
      merchantId: "lumencraft",
      merchantName: "Lumencraft",
      customerEmail: "demo@refundrex.xyz",
      customerName: "Demo Customer",
      itemName: "Aurora Smart Lamp",
      itemSku: "LC-AS-01",
      category: "home",
      amountUsd: 129.0,
      currency: "USD",
      carrier: "GoFleet",
      trackingNumber: "GF-LOST-019",
      offsetHours: -340,
    },
    shipment: {
      trackingNumber: "GF-LOST-019",
      carrier: "GoFleet",
      status: "lost",
      events: [
        { ts: new Date(Date.now() - 320 * 36e5).toISOString(), location: "Mississauga, ON", status: "Label created" },
        { ts: new Date(Date.now() - 300 * 36e5).toISOString(), location: "Mississauga, ON", status: "Picked up" },
        { ts: new Date(Date.now() - 280 * 36e5).toISOString(), location: "Toronto, ON", status: "Arrived at sort facility" },
      ],
    },
  },
  {
    slug: "delayed-keyboard",
    title: "Delayed $189 keyboard",
    blurb:
      "Agent-to-agent path. Shopzilla's agent endpoint accepts the dispute payload — settled in one round-trip.",
    expectedDurationMs: 14_000,
    customerNote:
      "This was supposed to arrive 5 days ago for my workshop. It's still stuck at the sort facility.",
    order: {
      id: "ORD-A1-5500",
      merchantId: "shopzilla",
      merchantName: "Shopzilla",
      customerEmail: "demo@refundrex.xyz",
      customerName: "Demo Customer",
      itemName: "Ergonomic Mechanical Keyboard",
      itemSku: "SZ-KB-77",
      category: "electronics",
      amountUsd: 189.0,
      currency: "USD",
      carrier: "GoFleet",
      trackingNumber: "GF-DLY-705",
      offsetHours: -168,
    },
    shipment: {
      trackingNumber: "GF-DLY-705",
      carrier: "GoFleet",
      status: "delayed",
      events: [
        { ts: new Date(Date.now() - 160 * 36e5).toISOString(), location: "Mississauga, ON", status: "Label created" },
        { ts: new Date(Date.now() - 150 * 36e5).toISOString(), location: "Mississauga, ON", status: "Picked up" },
        { ts: new Date(Date.now() - 120 * 36e5).toISOString(), location: "Toronto, ON", status: "Arrived at sort facility" },
        { ts: new Date(Date.now() - 96 * 36e5).toISOString(), location: "Toronto, ON", status: "Exception scan — delayed" },
      ],
    },
  },
];

export function findScenario(slug: string): DemoScenario | undefined {
  return demoScenarios.find((s) => s.slug === slug);
}
