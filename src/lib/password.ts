import bcrypt from 'bcryptjs';

const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

export function isHashed(value: string | undefined | null): boolean {
  return !!value && BCRYPT_PREFIX.test(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Verifies a password against a stored value. Supports legacy plaintext values so
 * existing accounts keep working; callers should re-hash when `needsRehash` is true.
 */
export async function verifyPassword(
  plain: string,
  stored: string | undefined | null
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (!stored) return { ok: false, needsRehash: false };
  if (isHashed(stored)) {
    return { ok: await bcrypt.compare(plain, stored), needsRehash: false };
  }
  const ok = plain === stored;
  return { ok, needsRehash: ok };
}

/** Random temporary password, e.g. for admin resets. */
export function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export const MIN_PASSWORD_LENGTH = 6;
