import * as Location from 'expo-location';

import type { Outfit } from '@/lib/color';

export type Weather = { temp: number; code: number; label: string; rain: boolean };

const LABELS: [number, string][] = [
  [0, 'dégagé'], [3, 'nuageux'], [48, 'brouillard'], [67, 'pluie'], [77, 'neige'], [82, 'averses'], [99, 'orage'],
];

export async function getWeather(): Promise<Weather | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
    // 2 decimals (~1 km) is enough for weather and avoids sending a precise position
    const lat = pos.coords.latitude.toFixed(2);
    const lon = pos.coords.longitude.toFixed(2);
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
    const j = await res.json();
    const code = Number(j.current.weather_code);
    return {
      temp: Math.round(j.current.temperature_2m),
      code,
      label: LABELS.find(([max]) => code <= max)?.[1] ?? '',
      rain: (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95,
    };
  } catch {
    return null; // no weather: the composer still works without it
  }
}

export const OCCASIONS = [
  ['date', 'Premier rendez-vous'],
  ['office', 'Bureau'],
  ['terrace', 'Terrasse'],
  ['evening', 'Soirée'],
] as const;
export type Occasion = (typeof OCCASIONS)[number][0];

/** Rule-based adjustments for occasion and weather. */
export function contextTips(o: Outfit, occasion: Occasion, w: Weather | null): string[] {
  const t = (s: keyof Outfit['pick']) => (o.pick[s] ? `${o.pick[s]!.type} ${o.pick[s]!.material}` : '').toLowerCase();
  const tips: string[] = [];
  if (occasion === 'date' && /sabot|claquette|tong|mule/.test(t('shoes')))
    tips.push('Rendez-vous : des sandales en cuir ou des mocassins feraient plus soigné.');
  if (occasion === 'office' && /lunette/.test(t('accessory'))) tips.push('Bureau : retire les lunettes teintées une fois à l’intérieur.');
  if (occasion === 'office' && /short|bermuda/.test(t('bottom'))) tips.push('Bureau : préfère un pantalon long.');
  if (occasion === 'evening' && /basket|sneaker/.test(t('shoes'))) tips.push('Soirée : une chaussure en cuir élèverait la tenue.');
  if (w) {
    if (w.rain && /daim|suède|suede/.test(t('shoes'))) tips.push(`${w.label} annoncée : évite le daim aujourd’hui.`);
    if (w.temp <= 12) tips.push(`${w.temp} °C : ajoute une couche dans une teinte de la palette.`);
    if (w.temp >= 26 && /laine|cuir/.test(t('top') + t('bottom'))) tips.push(`${w.temp} °C : la laine ou le cuir risquent d’être trop chauds.`);
  }
  return tips;
}
