import { Directory, File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { learnTaste, type Item, type Outfit, type Slot, type Taste } from '@/lib/color';
import type { Photo } from '@/lib/pick';

// Everything lives on the phone: SQLite kv-store for data, the document directory for photos.

/** A value persisted under `key`, readable from React with `use()`. */
function persisted<T>(key: string, fallback: T) {
  let value: T = fallback;
  try {
    const raw = Storage.getItemSync(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    // unreadable data: start from the fallback rather than crash
  }
  const listeners = new Set<() => void>();
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  return {
    get: () => value,
    set(next: T) {
      value = next;
      Storage.setItemSync(key, JSON.stringify(next));
      listeners.forEach((l) => l());
    },
    use: () => useSyncExternalStore(subscribe, () => value),
  };
}

// ---- closet ----
const closet = persisted<Item[]>('closet', []);
export const useCloset = closet.use;
export const getItem = (id: string) => closet.get().find((i) => i.id === id);

export type ItemDraft = { slot: Slot; type: string; material: string; color: string; measuredHex?: string };

export function addItem(draft: ItemDraft, cacheUri: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const dir = new Directory(Paths.document, 'closet');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${id}.jpg`);
  new File(cacheUri).copy(dest); // the camera writes to cache, which the OS may clear
  const item: Item = { ...draft, id, photo: dest.uri, createdAt: Date.now() };
  closet.set([item, ...closet.get()]);
  return item;
}

export function updateItem(id: string, patch: Partial<ItemDraft>) {
  closet.set(closet.get().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function removeItem(id: string) {
  const item = getItem(id);
  closet.set(closet.get().filter((i) => i.id !== id));
  looks.set(looks.get().filter((l) => !l.ids.includes(id))); // a look missing a piece can't be shown any more
  try {
    if (item) new File(item.photo).delete();
  } catch {
    // photo already gone: nothing to clean up
  }
}

// ---- kept looks ----
export type Look = { ids: string[]; combo: number; occasion: string; at: number };
const looks = persisted<Look[]>('looks', []);
export const useLooks = looks.use;
export const getLooks = looks.get;
export const keepLook = (look: Look) => looks.set([look, ...looks.get()].slice(0, 200));
export const removeLook = (at: number) => looks.set(looks.get().filter((l) => l.at !== at));

// ---- profile & settings ----
export type Body = 'homme' | 'femme';
export type Profile = { body: Body; theme: 'system' | 'light' | 'dark'; weather: boolean; figure3d: boolean; onboarded: boolean };
const DEFAULT_PROFILE: Profile = { body: 'homme', theme: 'system', weather: true, figure3d: true, onboarded: false };
const profile = persisted<Profile>('profile', DEFAULT_PROFILE);
// profiles saved by older versions lack the newer fields
export const useProfile = (): Profile => ({ ...DEFAULT_PROFILE, ...profile.use() });
export const getProfile = (): Profile => ({ ...DEFAULT_PROFILE, ...profile.get() });
export const updateProfile = (patch: Partial<Profile>) => profile.set({ ...getProfile(), ...patch });
export const setBody = (body: Body) => updateProfile({ body });

// ---- taste learned from swipes ----
const taste = persisted<Taste>('taste', {});
export const getTaste = taste.get;
export const recordSwipe = (o: Outfit, liked: boolean) => taste.set(learnTaste(taste.get(), o, liked));
export const resetTaste = () => taste.set({});

// ---- "Comment le porter" answers, so the same outfit in the same context isn't asked (and paid) twice ----
const howTo = persisted<Record<string, string[]>>('howto', {});
export const howToKey = (ids: string[], context: string) => `${[...ids].sort().join(',')}|${context}`;
export const getHowTo = (key: string) => howTo.get()[key];
export function saveHowTo(key: string, tips: string[]) {
  const entries = Object.entries({ ...howTo.get(), [key]: tips });
  howTo.set(Object.fromEntries(entries.slice(-100))); // keep the 100 most recent
}

// ---- wipe ----
export const clearLooks = () => looks.set([]);
export function clearCloset() {
  for (const i of closet.get()) removeItem(i.id);
}

// ---- photo handed from the camera to the next screen (base64 is too big for route params) ----
let pending: Photo | null = null;
export const setPending = (p: typeof pending) => (pending = p);
export const getPending = () => pending;
