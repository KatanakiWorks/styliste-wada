import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

// Each user brings their own Gemini key. It is kept in the phone's encrypted store
// (iOS Keychain / Android Keystore), never in the code or the repository.
// EXPO_PUBLIC_GEMINI_API_KEY in .env is only a fallback for local development.

const NAME = 'gemini_api_key';
const DEV_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || null;

let stored: string | null = null;
try {
  stored = SecureStore.getItem(NAME);
} catch {
  stored = null; // secure store unavailable (e.g. web): fall back to the dev key
}

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());

/** The key used for Gemini calls: the user's own, else the dev .env key. */
export const getApiKey = () => stored ?? DEV_KEY;

/** Where the active key comes from, for the settings screen. */
export function useApiKey(): { key: string | null; source: 'device' | 'dev' | null } {
  const own = useSyncExternalStore(subscribe, () => stored);
  return own ? { key: own, source: 'device' } : DEV_KEY ? { key: DEV_KEY, source: 'dev' } : { key: null, source: null };
}

export async function saveApiKey(key: string) {
  await SecureStore.setItemAsync(NAME, key);
  stored = key;
  emit();
}

export async function deleteApiKey() {
  await SecureStore.deleteItemAsync(NAME);
  stored = null;
  emit();
}

/** Shows only the ends of a key, e.g. "AIza…x9Qk". */
export const maskKey = (key: string) => (key.length > 10 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '••••');

/**
 * Checks a key with Google by listing models, which costs nothing.
 * 'invalid' = Google refused the key; 'network' = no answer (offline, timeout).
 */
export async function testApiKey(key: string): Promise<'ok' | 'invalid' | 'network'> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      headers: { 'x-goog-api-key': key },
      signal: ctl.signal,
    });
    return res.ok ? 'ok' : 'invalid';
  } catch {
    return 'network';
  } finally {
    clearTimeout(timer);
  }
}
