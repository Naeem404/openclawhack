/**
 * FileSpec skill — deterministic file-type / dimension / size checks.
 *
 * Given a deliverable URL (data: or http(s):) and a FileSpecCriterion, returns a
 * Verdict. Pure-JS implementation: parses PNG/JPEG headers inline so we don't
 * pull in `sharp` or `image-size` (avoids native-build pain on Windows).
 */
import type { FileSpecCriterion, Verdict } from "@herd/shared/types";

export interface FileSpecSpec {
  criterion: FileSpecCriterion;
  deliverableUrl: string;
  deliverableHash?: string;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface ProbeResult {
  ok: boolean;
  mime?: string;
  widthPx?: number;
  heightPx?: number;
  bytes: number;
  reason?: string;
}

/** Decode a data: URI into a Buffer + claimed MIME type. */
function decodeDataUri(uri: string): { buf: Buffer; mime: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(uri);
  if (!m) return null;
  const mime = m[1] ?? "application/octet-stream";
  const payload = m[2] ?? "";
  return { buf: Buffer.from(payload, "base64"), mime };
}

async function fetchBuffer(url: string): Promise<{ buf: Buffer; claimedMime?: string }> {
  if (url.startsWith("data:")) {
    const decoded = decodeDataUri(url);
    if (!decoded) throw new Error("malformed data URI");
    return { buf: decoded.buf, claimedMime: decoded.mime };
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const ab = await res.arrayBuffer();
    return { buf: Buffer.from(ab), claimedMime: res.headers.get("content-type") ?? undefined };
  }
  throw new Error("unsupported url scheme");
}

/** Identify MIME from magic bytes; fall back to claimedMime if unknown. */
function detectMime(buf: Buffer, claimed?: string): string {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return claimed?.split(";")[0]?.trim() ?? "application/octet-stream";
}

/** PNG dimensions live in the IHDR chunk: width @ bytes 16-19, height @ 20-23, big-endian. */
function parsePngDimensions(buf: Buffer): { widthPx: number; heightPx: number } | null {
  if (buf.length < 24) return null;
  return {
    widthPx: buf.readUInt32BE(16),
    heightPx: buf.readUInt32BE(20),
  };
}

/** Very small JPEG SOFx scanner. Returns dimensions or null on failure. */
function parseJpegDimensions(buf: Buffer): { widthPx: number; heightPx: number } | null {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1] ?? 0;
    i += 2;
    // Start Of Frame markers (SOF0..SOF15, skip SOF4 DHT and SOF8/SOF12/SOFC reserved variants)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (i + 7 > buf.length) return null;
      return {
        heightPx: buf.readUInt16BE(i + 3),
        widthPx: buf.readUInt16BE(i + 5),
      };
    }
    const segLen = buf.readUInt16BE(i);
    i += segLen;
  }
  return null;
}

function probe(buf: Buffer, claimedMime?: string): ProbeResult {
  const mime = detectMime(buf, claimedMime);
  const bytes = buf.byteLength;
  if (mime === "image/png") {
    const d = parsePngDimensions(buf);
    if (!d) return { ok: false, mime, bytes, reason: "malformed PNG header" };
    return { ok: true, mime, bytes, ...d };
  }
  if (mime === "image/jpeg") {
    const d = parseJpegDimensions(buf);
    if (!d) return { ok: false, mime, bytes, reason: "could not locate JPEG SOF marker" };
    return { ok: true, mime, bytes, ...d };
  }
  // Non-image MIME types still get a verdict — we just can't measure pixels.
  return { ok: true, mime, bytes };
}

export async function checkFileSpec(spec: FileSpecSpec): Promise<Verdict> {
  let buf: Buffer;
  let claimedMime: string | undefined;
  try {
    const fetched = await fetchBuffer(spec.deliverableUrl);
    buf = fetched.buf;
    claimedMime = fetched.claimedMime;
  } catch (err) {
    return {
      pass: false,
      confidence: 1,
      reasoning: `Could not fetch deliverable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const result = probe(buf, claimedMime);
  const c = spec.criterion;
  const reasons: string[] = [];

  if (!result.ok) {
    return {
      pass: false,
      confidence: 1,
      reasoning: result.reason ?? "file probe failed",
      details: { detected: result },
    };
  }

  if (result.mime !== c.mime) {
    reasons.push(`expected MIME ${c.mime}, got ${result.mime}`);
  }
  if (c.widthPx !== undefined && result.widthPx !== c.widthPx) {
    reasons.push(`expected width ${c.widthPx}px, got ${result.widthPx ?? "?"}px`);
  }
  if (c.heightPx !== undefined && result.heightPx !== c.heightPx) {
    reasons.push(`expected height ${c.heightPx}px, got ${result.heightPx ?? "?"}px`);
  }
  if (c.minBytes !== undefined && result.bytes < c.minBytes) {
    reasons.push(`file too small: ${result.bytes} < ${c.minBytes} bytes`);
  }
  if (c.maxBytes !== undefined && result.bytes > c.maxBytes) {
    reasons.push(`file too large: ${result.bytes} > ${c.maxBytes} bytes`);
  }

  const pass = reasons.length === 0;
  return {
    pass,
    confidence: 1,
    reasoning: pass
      ? `Matched all file-spec criteria (${result.mime}${result.widthPx ? `, ${result.widthPx}x${result.heightPx}` : ""}, ${result.bytes} bytes).`
      : `Failed checks: ${reasons.join("; ")}.`,
    details: { detected: result, criterion: c },
  };
}
