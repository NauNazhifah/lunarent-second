import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw, stored) {
  const [scheme, salt, hex] = String(stored).split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = scryptSync(pw, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
