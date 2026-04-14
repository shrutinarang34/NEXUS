
import { randomBytes, createHash } from 'crypto';

/**
 * Generates a cryptographically secure 6-digit token.
 * @returns {string} A 6-digit numeric string.
 */
export function generateSecureToken(): string {
  // Generate a number between 100000 and 999999
  const value = randomBytes(4).readUInt32BE(0);
  const token = (value % 900000) + 100000;
  return token.toString();
}

/**
 * Hashes a token using SHA-256 for secure storage.
 * @param {string} token - The plain text token to hash.
 * @returns {Promise<string>} The SHA-256 hash of the token.
 */
export async function hashToken(token: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(token);
  return hash.digest('hex');
}
