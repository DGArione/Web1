import { randomBytes } from "crypto";

/** Cryptographically-random, URL-safe token for one-time invitation links. */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
