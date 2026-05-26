/**
 * Demo runner — spins up a fresh case from a scripted scenario and runs
 * the full orchestrator loop. Designed to be invoked from the UI button
 * "Run scenario" and to drive the cinematic logs.
 */
import { caseStore } from "@/lib/store/cases";
import { orchestrator } from "@/lib/agent/orchestrator";
import { log } from "@/lib/store/events";
import { findScenario, demoScenarios } from "@/data/demo-scenarios";
import type { Order, Shipment } from "@/lib/types";

export const demoRunner = {
  list() {
    return demoScenarios;
  },

  async run(slug: string) {
    const scenario = findScenario(slug);
    if (!scenario) throw new Error(`unknown scenario: ${slug}`);

    log("demo", "info", `🎬  Starting scenario: ${scenario.title}`);

    const orderedAt = new Date(Date.now() + scenario.order.offsetHours * 36e5).toISOString();
    const expectedDeliveryAt = new Date(
      Date.now() + (scenario.order.offsetHours + 96) * 36e5,
    ).toISOString();
    const order: Order = {
      ...scenario.order,
      orderedAt,
      expectedDeliveryAt,
    };
    const shipment: Shipment = {
      ...scenario.shipment,
      lastUpdate: new Date().toISOString(),
    };

    const c = caseStore.create({
      order,
      shipment,
      customerNote: scenario.customerNote,
    });

    log(
      "demo",
      "success",
      `📂  Opened case ${c.id} for ${order.itemName} ($${order.amountUsd.toFixed(2)})`,
      c.id,
    );

    await orchestrator.run(c.id, 14);
    log("demo", "success", `🏁  Scenario ${scenario.slug} complete`, c.id);
    return caseStore.get(c.id)!;
  },
};
