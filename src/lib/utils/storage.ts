// Storage utilities for Zustand persistence

/**
 * Helper to ensure a value is a Date object
 * Useful for values that might be strings after hydration
 */
export function ensureDate(value: Date | string | undefined | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}
