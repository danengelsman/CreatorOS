import commonPasswords from './commonPasswords.json';

/**
 * Phase A — client-side password policy (free-tier Firebase compatible).
 *
 * Firebase enforces its own minimum (6) and maximum (4096) length, but that
 * floor accepts `123456`. This policy runs BEFORE registerWithEmail so weak
 * credentials never reach the auth backend, and stays entirely client-side:
 * no Identity Platform password-leak API, no custom crypto — Firebase still
 * handles all credential storage/hashing.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Case-insensitive lookup set over the bundled top-~1000 list (src/lib/commonPasswords.json). */
const COMMON_PASSWORD_SET: ReadonlySet<string> = new Set(
  commonPasswords.passwords.map((entry) => entry.toLowerCase()),
);

export interface PasswordValidation {
  valid: boolean;
  /** Human-readable reason when invalid; undefined when valid. */
  error?: string;
}

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORD_SET.has(password.toLowerCase());
}

/**
 * Validate a password against the Phase A policy:
 *  - at least MIN_PASSWORD_LENGTH characters,
 *  - not present in the bundled common-password list (case-insensitive).
 * Returns the FIRST failure so the UI can surface one actionable message.
 */
export function validatePassword(password: string): PasswordValidation {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }
  if (isCommonPassword(password)) {
    return {
      valid: false,
      error: 'That password is too common and easy to guess. Please choose a more unique one.',
    };
  }
  return { valid: true };
}
