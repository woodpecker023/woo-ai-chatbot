import { randomBytes } from 'crypto';

/**
 * Generate a secure random API key
 */
export function generateApiKey(prefix: string = 'wai'): string {
  const randomPart = randomBytes(32).toString('hex');
  return `${prefix}_${randomPart}`;
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a random token
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}
