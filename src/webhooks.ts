import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies an Inboxili webhook. `rawBody` must be the exact bytes received (not re-serialised JSON),
 * `signature` is the `X-Inboxili-Signature` header (hex HMAC-SHA256 of the body), and `secret` is the webhook's secret.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  if (!/^[0-9a-fA-F]+$/.test(signature) || signature.length !== expected.length * 2) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), expected);
}
