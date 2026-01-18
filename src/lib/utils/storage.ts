// Storage utilities for Zustand persistence

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

/**
 * Custom JSON storage that properly handles Date serialization
 * Dates are serialized as ISO strings and deserialized back to Date objects
 */
export const createDateAwareStorage = (): StateStorage => ({
  getItem: async (name: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(name);
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
});

/**
 * Reviver function for JSON.parse that converts ISO date strings back to Date objects
 */
export function dateReviver(_key: string, value: unknown): unknown {
  // Check if value is an ISO date string
  if (typeof value === 'string') {
    // ISO 8601 date format regex
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoDateRegex.test(value)) {
      const date = new Date(value);
      // Verify it's a valid date
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return value;
}

/**
 * Custom JSON storage with Date deserialization support
 */
export const dateAwareStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(name);
    if (value) {
      try {
        // Parse with date reviver and re-stringify
        // This allows Zustand to parse it again but with Dates intact
        const parsed = JSON.parse(value, dateReviver);
        return JSON.stringify(parsed);
      } catch {
        return value;
      }
    }
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

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
