import crypto from "crypto";
import type { OAuthState } from "./types";

// OAuth `state` is signed (not just base64'd) so a caller can't forge a
// request that connects a different agency's client to their own tokens.
function sign(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeOAuthState(state: OAuthState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function decodeOAuthState(encoded: string): OAuthState {
  const [payload, signature] = encoded.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    throw new Error("Invalid or tampered OAuth state.");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
}
