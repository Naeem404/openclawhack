/**
 * Outbound + inbound email transport for merchant support.
 * Demo mode keeps a local thread store; production swaps for Postmark/SES.
 */
import { nanoid } from "nanoid";
import { log } from "@/lib/store/events";
import { sleep, randomBetween } from "@/lib/utils";

export interface EmailThread {
  id: string;
  orderId: string;
  to: string;
  subject: string;
  messages: {
    role: "agent" | "merchant";
    body: string;
    ts: string;
  }[];
}

const threads = new Map<string, EmailThread>();

export const emailService = {
  async send(input: {
    to: string;
    subject: string;
    body: string;
    orderId: string;
  }) {
    await sleep(randomBetween(200, 500));
    const id = "thr_" + nanoid(8);
    const thread: EmailThread = {
      id,
      orderId: input.orderId,
      to: input.to,
      subject: input.subject,
      messages: [{ role: "agent", body: input.body, ts: new Date().toISOString() }],
    };
    threads.set(id, thread);
    log("email", "info", `📧  Email queued → ${input.to}  (thread ${id})`);
    return { threadId: id, status: "sent" as const };
  },

  /** Simulate a merchant replying back asynchronously. */
  async simulateReply(threadId: string, body: string) {
    const t = threads.get(threadId);
    if (!t) return undefined;
    t.messages.push({ role: "merchant", body, ts: new Date().toISOString() });
    threads.set(threadId, t);
    return t;
  },

  get(id: string) {
    return threads.get(id);
  },

  list() {
    return [...threads.values()];
  },
};
