import bcrypt from "bcrypt";
import { env } from "../config/env";

// ─── Common Passwords Blocklist (top 100) ──────────────

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
  "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine",
  "princess", "football", "shadow", "superman", "michael", "letmein",
  "welcome", "admin", "login", "passw0rd", "starwars", "hello", "charlie",
  "donald", "password1", "qwerty123", "123456789", "1234567890",
  "access", "thunder", "batman", "matrix", "whatever", "passpass",
  "654321", "jennifer", "hunter", "buster", "soccer", "harley",
  "andrew", "tigger", "sunshine1", "2000", "test", "test123",
  "pass", "secret", "summer", "winter", "spring", "fall",
]);

// ─── Hash Password ─────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

// ─── Compare Password ──────────────────────────────────

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Validate Password Strength ────────────────────────

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push("Password must be at least 10 characters long");
  }
  if (password.length > 128) {
    errors.push("Password must be at most 128 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Password is too common. Please choose a stronger password");
  }
  // Check for repeated characters (e.g., "aaaaaa")
  if (/(.)\1{4,}/.test(password)) {
    errors.push("Password contains too many repeated characters");
  }
  // Check for sequential characters (e.g., "abcde", "12345")
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push("Password contains sequential characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
