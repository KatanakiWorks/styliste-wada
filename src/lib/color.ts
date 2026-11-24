// Pure colour science + outfit matching. No imports, so `node --test` can load it directly.

export type Lab = [number, number, number];
export type WadaColor = { name: string; hex: string; cmyk: number[]; combos: number[]; neutral?: boolean };
export type Slot = 'top' | 'bottom' | 'shoes' | 'accessory';
export type Item = {
  id: string;
  slot: Slot;
  type: string; // "chemise col cubain"
  material: string; // "lin froissé"
  color: string; // Wada colour name
  photo: string; // file uri
  measuredHex?: string;
  createdAt: number;
};
export type Outfit = { combo: number; colors: string[]; pick: Partial<Record<Slot, Item>> };

export const SLOTS: Slot[] = ['top', 'bottom', 'shoes', 'accessory'];
export const SLOT_LABELS: Record<Slot, string> = { top: 'Haut', bottom: 'Bas', shoes: 'Chaussures', accessory: 'Accessoire' };

export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047);
  const y = f(r * 0.2126729 + g * 0.7151522 + b * 0.072175);
  const z = f((r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// CIEDE2000 (Sharma, Wu & Dalal 2005).
export function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const d = Math.atan2(b, a) / rad;
    return d < 0 ? d + 360 : d;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const zero = C1p * C2p === 0;
  let dhp = zero ? 0 : h2p - h1p;
  if (dhp > 180) dhp -= 360;
  else if (dhp < -180) dhp += 360;
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (!zero) {
    if (Math.abs(h1p - h2p) > 180) hbp += hbp < 360 ? 360 : -360;
    hbp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

export function nearestColors(hex: string, colors: WadaColor[], n = 4) {
  const lab = hexToLab(hex);
  return colors
    .map((c) => ({ ...c, dE: deltaE2000(lab, hexToLab(c.hex)) }))
    .sort((a, b) => a.dE - b.dE)
    .slice(0, n);
}

/** combination number -> colour names */
export function buildCombos(colors: WadaColor[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  for (const c of colors) for (const n of c.combos) map.set(n, [...(map.get(n) ?? []), c.name]);
  return map;
}

const CLOSE = new Map<string, boolean>();

export type MatchOptions = {
  /** Colours that go with any palette (black, white, grey, navy, denim, beige…). */
  neutrals?: Set<string>;
  /** Colour name -> hex, to accept shades close to a palette colour. */
  hexOf?: (name: string) => string | undefined;
  /** Max ΔE2000 for a shade to count as a palette colour. */
  tolerance?: number;
  limit?: number;
};

/**
 * Outfits around `anchor`: every Wada combination holding its colour (or a close shade), filled from the closet.
 * Top and bottom are required; shoes and accessory are added when the closet has a match.
 * Neutrals go with any palette and fill a slot the palette cannot.
 */
export function outfitsFor(anchor: Item, items: Item[], combos: Map<number, string[]>, opts: MatchOptions = {}): Outfit[] {
  const { neutrals = new Set<string>(), hexOf, tolerance = 10, limit = 10 } = opts;
  const labs = new Map<string, Lab | null>();
  const labOf = (name: string) => {
    if (!labs.has(name)) {
      const hex = hexOf?.(name);
      labs.set(name, hex ? hexToLab(hex) : null);
    }
    return labs.get(name)!;
  };
  // a garment colour belongs to a palette when it is one of its colours or a close shade of one;
  // colour names are a fixed set, so each pair is compared once per session
  const close = (a: string, b: string) => {
    const k = `${a}|${b}|${tolerance}`;
    const cached = CLOSE.get(k);
    if (cached !== undefined) return cached;
    const la = labOf(a);
    const lb = labOf(b);
    if (!la || !lb) return false; // unknown colour: not cached, a later call may know its hex
    const v = deltaE2000(la, lb) < tolerance;
    CLOSE.set(k, v);
    return v;
  };
  const inPalette = (color: string, palette: string[]) => palette.includes(color) || palette.some((p) => close(color, p));

  const anchorNeutral = neutrals.has(anchor.color);
  const out: { o: Outfit; hits: number; filled: number }[] = [];
  const seen = new Set<string>();
  for (const [combo, colors] of combos) {
    if (!anchorNeutral && !inPalette(anchor.color, colors)) continue;
    const pick: Outfit['pick'] = { [anchor.slot]: anchor };
    const used = new Set([anchor.color]);
    for (const slot of SLOTS) {
      if (pick[slot]) continue;
      const cands = items.filter((i) => i.slot === slot && !neutrals.has(i.color) && inPalette(i.color, colors));
      // prefer a palette colour not used yet, then any palette colour, then a neutral
      const best = cands.find((i) => !used.has(i.color)) ?? cands[0] ?? items.find((i) => i.slot === slot && neutrals.has(i.color));
      if (best) {
        pick[slot] = best;
        used.add(best.color);
      }
    }
    if (!pick.top || !pick.bottom) continue;
    const pieces = Object.values(pick);
    const hits = pieces.filter((i) => !neutrals.has(i!.color) && inPalette(i!.color, colors)).length;
    const key = pieces.map((i) => i!.id).sort().join();
    if (hits === 0 || seen.has(key)) continue; // all-neutral or same pieces as a better combination
    seen.add(key);
    out.push({ o: { combo, colors, pick }, hits, filled: pieces.length });
  }
  return out
    .sort((a, b) => b.hits - a.hits || b.filled - a.filled || a.o.combo - b.o.combo)
    .slice(0, limit)
    .map((x) => x.o);
}

// ---- personal taste learned from swipes: a weight per piece, palette colour and combination ----
export type Taste = Record<string, number>;
const features = (o: Outfit) => [...Object.values(o.pick).map((i) => `item:${i!.id}`), ...o.colors.map((c) => `color:${c}`), `combo:${o.combo}`];

/** A kept outfit counts +1, a passed one −0.5 (passing is a weaker signal), each weight capped to ±5. */
export function learnTaste(taste: Taste, o: Outfit, liked: boolean): Taste {
  const next = { ...taste };
  for (const f of features(o)) next[f] = Math.max(-5, Math.min(5, (next[f] ?? 0) + (liked ? 1 : -0.5)));
  return next;
}

/** Highest taste score first; ties keep the harmony order from outfitsFor. */
export function rankByTaste(outfits: Outfit[], taste: Taste): Outfit[] {
  const score = (o: Outfit) => features(o).reduce((s, f) => s + (taste[f] ?? 0), 0);
  return outfits
    .map((o, i) => ({ o, i, s: score(o) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.o);
}

// ---- outfit of the day ----
export type Day = { temp?: number; rain?: boolean };
const words = (i?: Item) => (i ? `${i.type} ${i.material}` : '').toLowerCase();

/** How well an outfit suits today: learned taste, weather fit, and pieces not worn (kept) in the last days. */
export function dayScore(o: Outfit, taste: Taste, day: Day, recent: Set<string>): number {
  let s = features(o).reduce((a, f) => a + (taste[f] ?? 0), 0);
  const top = words(o.pick.top);
  const bottom = words(o.pick.bottom);
  const shortTop = /t-shirt|tee|polo|débardeur|debardeur|crop/.test(top);
  const shortBottom = /short|bermuda|jupe/.test(bottom);
  const warm = /laine|pull|sweat|maille|velours|cachemire|polaire|doudoune|manteau/.test(`${top} ${bottom}`);
  if (day.temp !== undefined) {
    if (day.temp <= 12) s += (shortTop ? -2 : 1) + (shortBottom ? -3 : 1) + (warm ? 1.5 : 0);
    else if (day.temp >= 24) s += (shortTop ? 1 : -1) + (shortBottom ? 1.5 : 0) + (warm ? -2.5 : 0);
  }
  if (day.rain && /daim|suède|suede|toile/.test(words(o.pick.shoes))) s -= 2;
  for (const i of Object.values(o.pick)) if (recent.has(i!.id)) s -= 1.5;
  return s;
}

/** Best outfits for today across the whole closet (one anchor per top), without duplicates. */
export function outfitsOfTheDay(items: Item[], combos: Map<number, string[]>, opts: MatchOptions, taste: Taste, day: Day, recent: Set<string>, limit = 10): Outfit[] {
  const seen = new Set<string>();
  const all: { o: Outfit; s: number; i: number }[] = [];
  for (const anchor of items.filter((i) => i.slot === 'top')) {
    for (const o of outfitsFor(anchor, items, combos, { ...opts, limit: 15 })) {
      const key = Object.values(o.pick)
        .map((i) => i!.id)
        .sort()
        .join();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ o, s: dayScore(o, taste, day, recent), i: all.length });
    }
  }
  return all
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.o);
}

/** Everyday colour word for search queries ("terracotta", "bleu marine"…). */
export function basicColorName(hex: string): string {
  const [L, a, b] = hexToLab(hex);
  const C = Math.hypot(a, b);
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  if (C < 8) return L < 22 ? 'noir' : L > 90 ? 'blanc' : 'gris';
  if (C < 22 && L > 68 && h >= 40 && h < 110) return 'beige';
  if (h < 25 || h >= 345) return L > 70 ? 'rose' : L < 40 ? 'bordeaux' : 'rouge';
  if (h < 80) return L < 35 ? 'marron' : L < 58 && h < 60 ? 'terracotta' : C < 45 ? 'camel' : 'orange';
  if (h < 115) return L < 35 ? 'marron' : C < 30 ? 'kaki' : 'jaune';
  if (h < 175) return 'vert';
  if (h < 290) return L < 26 ? 'bleu marine' : 'bleu';
  return L > 65 ? 'rose' : 'violet';
}

/** Short style note from the palette's temperature and value contrast. */
export function styleNote(colors: { name: string; hex: string }[]): string {
  const labs = colors.map((c) => ({ ...c, lab: hexToLab(c.hex) }));
  const chroma = (l: Lab) => Math.hypot(l[1], l[2]);
  const hue = (l: Lab) => ((Math.atan2(l[2], l[1]) * 180) / Math.PI + 360) % 360;
  const warm = labs.filter((c) => chroma(c.lab) > 10 && (hue(c.lab) < 100 || hue(c.lab) > 330));
  const cool = labs.filter((c) => chroma(c.lab) > 10 && hue(c.lab) >= 150 && hue(c.lab) <= 300);
  const L = labs.map((c) => c.lab[0]);
  const range = Math.max(...L) - Math.min(...L);
  const parts: string[] = [];
  if (warm.length && cool.length) parts.push(`Contraste chaud/froid entre ${warm[0].name} et ${cool[0].name}.`);
  else if (warm.length === labs.length) parts.push('Palette entièrement chaude, très cohérente.');
  else if (cool.length === labs.length) parts.push('Palette froide et calme.');
  else parts.push('Les neutres de la palette laissent respirer la couleur.');
  if (range > 50) parts.push('Fort écart clair/foncé : la teinte la plus sombre structure la tenue.');
  else if (range < 20) parts.push('Valeurs proches : jouez sur les matières plutôt que sur le contraste.');
  return parts.join(' ');
}
