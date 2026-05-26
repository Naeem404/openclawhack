import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortHash(hash: string, head = 6, tail = 4) {
  if (!hash) return "";
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function shortAddr(addr: string) {
  return shortHash(addr, 6, 4);
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatRelative(ts: number | string | Date) {
  const t = typeof ts === "number" ? ts : new Date(ts).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Deterministic-ish 0xfeed… style hash for demo mode. */
export function fakeTxHash(seed?: string) {
  const src =
    (seed ?? Math.random().toString(36)) + Date.now().toString(36);
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  const hex = Array.from({ length: 64 }, (_, i) => {
    const v = (h ^ (i * 2654435761)) >>> 0;
    return v.toString(16).padStart(2, "0").slice(-1);
  }).join("");
  return ("0x" + hex).slice(0, 66);
}

export function fakeAddress(seed?: string) {
  const src = (seed ?? "") + Math.random().toString(36) + Date.now();
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 33 + src.charCodeAt(i)) >>> 0;
  const hex = Array.from({ length: 40 }, (_, i) =>
    ((h ^ (i * 16807)) >>> 0).toString(16).slice(-1),
  ).join("");
  return ("0x" + hex).slice(0, 42);
}
