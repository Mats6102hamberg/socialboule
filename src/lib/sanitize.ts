/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize a string by trimming whitespace and limiting length
 * Optionally removes potentially dangerous characters
 */
export function sanitizeString(
  input: string,
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    allowSpecialChars?: boolean;
  } = {}
): string {
  const { maxLength = 1000, allowHtml = false, allowSpecialChars = true } = options;

  let sanitized = input.trim();

  // Limit length to prevent DoS attacks
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Remove HTML tags if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  }

  // Remove potentially dangerous special characters if not allowed
  if (!allowSpecialChars) {
    // Keep only alphanumeric, spaces, and basic punctuation
    sanitized = sanitized.replace(/[^a-zA-Z0-9\såäöÅÄÖ .,!?'-]/g, "");
  }

  return sanitized;
}

/**
 * Validate and sanitize an email address
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Limit length
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize a numeric input, ensuring it's a valid number within bounds
 */
export function sanitizeNumber(
  input: unknown,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): number | null {
  const { min, max, integer = false } = options;

  const num = Number(input);

  if (!Number.isFinite(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return null;
  }

  if (max !== undefined && num > max) {
    return null;
  }

  if (integer) {
    return Math.floor(num);
  }

  return num;
}

/**
 * Sanitize a date string to ensure it's a valid date
 */
export function sanitizeDate(input: string | Date): Date | null {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
