import data from '@/data/wada.json';
import { buildCombos, type WadaColor } from '@/lib/color';

// Sanzo Wada, "A Dictionary of Color Combinations" — dataset by Matt DesLauriers (MIT).
const WADA = data as WadaColor[];

// Wardrobe basics Wada's dictionary lacks or uses rarely; they go with every palette.
const BASICS: WadaColor[] = [
  ['Marine', '#1f2a44'],
  ['Denim brut', '#2c3e5c'],
  ['Denim clair', '#7f9bbd'],
  ['Anthracite', '#3a3b3d'],
  ['Gris chiné', '#8f8f8d'],
  ['Écru', '#ece4d2'],
  ['Beige', '#d6c4a5'],
  ['Camel', '#b98a57'],
  ['Kaki', '#7a7650'],
].map(([name, hex]) => ({ name, hex, cmyk: [], combos: [], neutral: true }));
const WADA_NEUTRALS = new Set(['Black', 'White', 'Neutral Gray', 'Warm Gray']);

export const COLORS: WadaColor[] = [...BASICS, ...WADA.map((c) => (WADA_NEUTRALS.has(c.name) ? { ...c, neutral: true } : c))];
export const COMBOS = buildCombos(WADA);
export const NEUTRALS = new Set(COLORS.filter((c) => c.neutral).map((c) => c.name));
const BY_NAME = new Map(COLORS.map((c) => [c.name, c]));
export const colorOf = (name: string) => BY_NAME.get(name);
export const hexOf = (name: string) => BY_NAME.get(name)?.hex ?? '#888888';
