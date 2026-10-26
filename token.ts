import { createHash, createHmac } from "node:crypto";

export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** Deterministic per (restaurant, idempotency key) so a retried submit returns the SAME tracking link. */
export const makeTrackingToken = (secret: string, restaurantId: string, idempotencyKey: string) =>
  createHmac("sha256", secret).update(`${restaurantId}:${idempotencyKey}`).digest("base64url");

/** Only the hash is stored; a database leak does not reveal usable tracking links. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
