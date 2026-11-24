import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** A photo ready for storage and Gemini, with its real dimensions so it can be shown whole. */
export type Photo = { uri: string; base64: string; width: number; height: number };

const MAX_SIDE = 1280;

/**
 * Downsizes a photo so its longest side is at most 1280 px, keeping its proportions and the whole frame.
 * A 12 MP shot is ~10× bigger and analyses no better: it only uploads slower and costs more.
 */
export async function shrink(uri: string, width?: number, height?: number): Promise<Photo> {
  const ctx = ImageManipulator.manipulate(uri);
  if (!width || !height) ctx.resize({ width: 1024, height: null });
  else if (Math.max(width, height) > MAX_SIDE) ctx.resize(width >= height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!out.base64) throw new Error('Image illisible.');
  return { uri: out.uri, base64: out.base64, width: out.width, height: out.height };
}

/** Pick one photo from the library, uncropped and downsized. null when cancelled. */
export async function pickPhoto(): Promise<Photo | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
  const a = r.canceled ? undefined : r.assets[0];
  return a ? shrink(a.uri, a.width, a.height) : null;
}

/** Width / height of a photo, kept in a sane range so a panorama doesn't break the layout. */
export const ratioOf = (p?: { width?: number; height?: number }) => (p?.width && p?.height ? Math.min(2, Math.max(0.5, p.width / p.height)) : 3 / 4);
