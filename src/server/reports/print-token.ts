import crypto from "crypto";

// Short-lived signed token so the headless PDF renderer can load a report's
// print view without carrying browser session cookies into Playwright.
const TTL_MS = 5 * 60 * 1000;

export function createPrintToken(reportId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  const expires = Date.now() + TTL_MS;
  const payload = `${reportId}.${expires}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${expires}.${signature}`;
}

export function verifyPrintToken(reportId: string, token: string): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const [expiresStr, signature] = token.split(".");
  const expires = Number(expiresStr);
  if (!expires || !signature || Date.now() > expires) return false;
  const payload = `${reportId}.${expires}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
