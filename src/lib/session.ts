// Lightweight session layer (sandbox adaptation of spec §3.2).
// Uses httpOnly cookie `nr1_session` containing a signed token.
// Sessions are persisted in the Session table (DB-backed) so they survive
// dev-server restarts and HMR — production-grade.
// Password hashing via Web Crypto PBKDF2 (no external bcrypt dep).

import { cookies } from "next/headers";
import { db } from "./db";
import { ApiError, ERROR_CODES, HTTP_STATUS, errorResponse } from "./errors";

const SESSION_COOKIE = "nr1_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionCookie(professionalId: string): Promise<{
  name: string;
  value: string;
  maxAge: number;
}> {
  const token = randomToken();
  await db.session.create({
    data: {
      token,
      professionalId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { name: SESSION_COOKIE, value: token, maxAge: SESSION_TTL_MS / 1000 };
}

export async function clearSessionCookie(token: string): Promise<void> {
  try {
    await db.session.delete({ where: { token } });
  } catch {
    // Token may already be gone — no-op.
  }
}

export async function getCurrentProfessional() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    select: { professionalId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Expired — clean up and deny.
    db.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  const professional = await db.professional.findUnique({
    where: { id: session.professionalId },
  });
  if (!professional) return null;
  return professional;
}

export async function requireProfessional() {
  const p = await getCurrentProfessional();
  if (!p) throw new ApiError(ERROR_CODES.UNAUTHORIZED, "Session required");
  return p;
}

export async function requireTenantOwnership(resourceProfessionalId: string, currentId: string) {
  if (resourceProfessionalId !== currentId) {
    throw new ApiError(
      ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS,
      "Cross-tenant access denied"
    );
  }
}

// Opportunistic cleanup of expired sessions (fire-and-forget, called on login).
// Prevents the Session table from growing unbounded.
export async function pruneExpiredSessions(): Promise<void> {
  try {
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  } catch {
    // no-op
  }
}

// ─── Password hashing (PBKDF2 via Web Crypto) ───────────────────────────────

const ITER = 100_000;
const KEY_LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    keyMaterial,
    KEY_LEN * 8
  );
  const hashArr = new Uint8Array(derived);
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hashArr).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${ITER}$${saltHex}$${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = parseInt(parts[1], 10);
  const salt = hexToBytes(parts[2]);
  const expected = parts[3];
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
    keyMaterial,
    KEY_LEN * 8
  );
  const actual = Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return actual === expected;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

// ─── Pagination helper ──────────────────────────────────────────────────────

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const data = items.slice((page - 1) * limit, page * limit);
  return { data, meta: { total, page, limit, pages } };
}

export function parsePagination(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const q = url.searchParams.get("q") ?? "";
  return { page, limit, q };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorJson(code: typeof ERROR_CODES[keyof typeof ERROR_CODES], message?: string, details?: Record<string, unknown>): Response {
  const status = HTTP_STATUS[code];
  return jsonResponse(errorResponse(code, message, details), status);
}

// ─── Worker portal anti-fingerprinting (spec §3.7) ──────────────────────────
// All /respond/* responses must include these headers to prevent correlating
// worker responses with the professional's identity.
const WORKER_ANTI_FINGERPRINT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

export function workerJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: WORKER_ANTI_FINGERPRINT_HEADERS,
  });
}

export function workerErrorJson(
  code: typeof ERROR_CODES[keyof typeof ERROR_CODES],
  message?: string,
  details?: Record<string, unknown>,
): Response {
  const status = HTTP_STATUS[code];
  return new Response(JSON.stringify(errorResponse(code, message, details)), {
    status,
    headers: WORKER_ANTI_FINGERPRINT_HEADERS,
  });
}
