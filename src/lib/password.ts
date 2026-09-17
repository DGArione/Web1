import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifySecret(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
