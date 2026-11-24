import { getApiKey } from '@/lib/api-key';
import type { Item, Slot } from '@/lib/color';
import { SLOTS } from '@/lib/color';

// Calls go straight from the phone to Google with the user's own key (see api-key.ts).
// Tried in order: the next one is used when a model is overloaded (503), rate-limited (429) or too slow.
// shortcut: order picked from response times measured on 2026-11-14 (3.8 overloaded); revisit when 3.8-flash is stable.
const TEXT_MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.6-flash'];

export const NO_KEY = 'NO_KEY';

class GeminiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** POST an interaction and return the model's output blocks. */
async function interact(body: object, timeoutMs = 20000): Promise<any[]> {
  const key = getApiKey();
  if (!key) throw new Error(NO_KEY);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json',
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = text.slice(0, 200);
      try {
        const body = JSON.parse(text);
        msg = (Array.isArray(body) ? body[0] : body)?.error?.message ?? msg; // errors come as an object or a one-item array
      } catch {}
      // same project for every model: no point trying the next one
      if (res.status === 402) throw new GeminiError(402, 'crédits Gemini épuisés. Rechargez-les sur ai.studio/projects (Facturation).');
      throw new GeminiError(res.status, msg);
    }
    const json = await res.json();
    return (json.steps ?? []).filter((s: any) => s.type === 'model_output').flatMap((s: any) => s.content ?? []);
  } catch (e) {
    if (ctl.signal.aborted) throw new GeminiError(408, 'Gemini met trop de temps à répondre');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const jpeg = (data: string) => ({
  type: 'image',
  data,
  mime_type: 'image/jpeg',
});
const retryable = (e: unknown) => e instanceof GeminiError && [408, 429, 500, 503].includes(e.status);

async function ask<T>(prompt: string, imageBase64: string | null, schema: object): Promise<T> {
  let last: unknown;
  for (const model of TEXT_MODELS) {
    try {
      const out = await interact({
        model,
        input: [{ type: 'text', text: prompt }, ...(imageBase64 ? [jpeg(imageBase64)] : [])],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema,
        },
      });
      const text = out.find((c) => c.type === 'text')?.text;
      if (!text) throw new Error('Réponse Gemini vide');
      return JSON.parse(text) as T;
    } catch (e) {
      last = e;
      if (!retryable(e)) throw e;
    }
  }
  throw last;
}

/** Editorial lookbook photo of an outfit, using the closet photos as references. Returns a data URI. */
export async function lookbook(pieces: { item: Item; base64: string }[], context: string, body: 'homme' | 'femme'): Promise<string> {
  const list = pieces.map(({ item }, i) => `image ${i + 1} : ${item.type} (${item.material})`).join(' ; ');
  const out = await interact(
    {
      model: 'gemini-nano-banana-2.1',
      input: [
        {
          type: 'text',
          text: `Photo de mode éditoriale, plein pied, ${body === 'femme' ? "d'une femme" : "d'un homme"} qui porte exactement ces pièces : ${list}.
Reproduis fidèlement chaque pièce des images de référence : couleur, matière, coupe. Contexte : ${context}.
Composition sobre et minimaliste, lumière naturelle douce, fond simple. Aucun texte, aucun logo.`,
        },
        ...pieces.map((p) => jpeg(p.base64)),
      ],
      response_format: {
        type: 'image',
        mime_type: 'image/jpeg',
        aspect_ratio: '3:4',
        image_size: '1K',
      },
    },
    90000,
  ).catch((e) => {
    // the free tier has a zero quota for image models
    if (e instanceof GeminiError && e.status === 429 && /free tier/i.test(e.message))
      throw new Error('la génération d’images demande d’activer la facturation sur votre compte Google AI Studio');
    throw e;
  });
  const img = out.filter((c) => c.type === 'image' && c.data).pop();
  if (!img) throw new Error('Gemini n’a pas renvoyé d’image');
  return `data:${img.mime_type ?? 'image/jpeg'};base64,${img.data}`;
}

export type GarmentAnalysis = {
  slot: Slot;
  type: string;
  material: string;
  hex?: string;
};

export async function analyzeGarment(imageBase64: string): Promise<GarmentAnalysis> {
  const r = await ask<{
    slot: string;
    type: string;
    material: string;
    hex: string;
  }>(
    `Tu es un styliste. Sur cette photo, identifie le vêtement ou l'accessoire principal.
slot : top (haut, veste incluse), bottom (bas), shoes (chaussures) ou accessory (lunettes, montre, sac, bijou, ceinture).
type : nom court et précis en français, en minuscules (ex. "chemise col cubain", "pantalon fluide", "sabots").
material : matière et texture visibles en français (ex. "lin froissé", "suède", "maille piquée").
hex : couleur dominante du tissu au format #RRGGBB, en corrigeant la dominante de la lumière si possible.`,
    imageBase64,
    {
      type: 'object',
      properties: {
        slot: { type: 'string', enum: SLOTS },
        type: { type: 'string' },
        material: { type: 'string' },
        hex: { type: 'string' },
      },
      required: ['slot', 'type', 'material', 'hex'],
    },
  );
  // validate what comes back from the model before it reaches the closet
  return {
    slot: (SLOTS as string[]).includes(r.slot) ? (r.slot as Slot) : 'top',
    type: String(r.type ?? '').slice(0, 60),
    material: String(r.material ?? '').slice(0, 60),
    hex: /^#[0-9a-f]{6}$/i.test(r.hex) ? r.hex : undefined,
  };
}

/** 3 concrete ways to wear these pieces together (tuck, roll, layer, where the accessory goes…). Text only. */
export async function stylingTips(pieces: (Item & { colorWord: string })[], context: string): Promise<string[]> {
  const list = pieces.map((p) => `${p.type} ${p.colorWord} (${p.material || 'matière inconnue'})`).join(', ');
  const r = await ask<{ tips: string[] }>(
    `Tu es un styliste. Tenue : ${list}. Contexte : ${context || 'quotidien'}.
Donne exactement 3 conseils concrets pour bien marier et porter ces pièces ensemble : rentrer ou non le haut, revers, manches, superposition, proportions, où placer l'accessoire, chaussettes.
Une phrase courte chacun, tutoiement, en français. Parle uniquement des vêtements, jamais du corps.`,
    null,
    { type: 'object', properties: { tips: { type: 'array', items: { type: 'string' } } }, required: ['tips'] },
  );
  return (r.tips ?? []).slice(0, 3).map(String);
}

export type Tip = { title: string; detail: string };
export type Score = { score: number; comment: string };
export type MirrorReview = { beauty: Score; colors: Score; drip: Score; verdict: string; tips: Tip[] };

export const CRITERIA: { key: 'beauty' | 'colors' | 'drip'; label: string }[] = [
  { key: 'beauty', label: 'Esthétique' },
  { key: 'colors', label: 'Mariage des couleurs' },
  { key: 'drip', label: 'Drip / flow' },
];

export async function mirrorCheck(imageBase64: string, pieces: Item[]): Promise<MirrorReview> {
  const planned = pieces.length ? pieces.map((p) => `${p.type} (${p.material}, ${p.color})`).join(', ') : 'non précisée';
  const score = { type: 'object', properties: { score: { type: 'integer' }, comment: { type: 'string' } }, required: ['score', 'comment'] };
  const r = await ask<MirrorReview>(
    `Tu es un styliste exigeant, honnête et bienveillant. Voici une photo de la tenue portée. Tenue prévue : ${planned}.
Note la TENUE de 0 à 10 sur trois critères, sans complaisance (5 = correct, 8 = très réussi, 10 = exceptionnel) :
- beauty (esthétique) : coupes, proportions entre les pièces, tombé, soin et cohérence d'ensemble.
- colors (mariage des couleurs) : harmonie, contrastes, dosage des teintes, accord avec les matières.
- drip (drip / flow) : style, personnalité, assurance que dégage la tenue, détails qui font la différence, justesse par rapport aux tendances.
Pour chaque critère, un commentaire d'une phrase qui justifie la note.
verdict : une phrase de synthèse, franche et motivante.
tips : exactement 3 micro-ajustements concrets, faisables tout de suite (ex. "Retire les chaussettes noires avec ces sabots", "Ouvre un bouton supplémentaire") ; title 8 mots maximum, detail une phrase.
Juge uniquement les vêtements, les accessoires et leur façon d'être portés : jamais le corps, le visage ni le physique de la personne. Français, tutoiement.`,
    imageBase64,
    {
      type: 'object',
      properties: {
        beauty: score,
        colors: score,
        drip: score,
        verdict: { type: 'string' },
        tips: {
          type: 'array',
          items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' } }, required: ['title', 'detail'] },
        },
      },
      required: ['beauty', 'colors', 'drip', 'verdict', 'tips'],
    },
  );
  // validate the model's output: scores clamped to 0–10, text forced to strings
  const clean = (s: Partial<Score> | undefined): Score => ({
    score: Math.max(0, Math.min(10, Math.round(Number(s?.score) || 0))),
    comment: String(s?.comment ?? ''),
  });
  return {
    beauty: clean(r.beauty),
    colors: clean(r.colors),
    drip: clean(r.drip),
    verdict: String(r.verdict ?? ''),
    tips: (r.tips ?? []).slice(0, 3).map((t) => ({ title: String(t.title), detail: String(t.detail) })),
  };
}
