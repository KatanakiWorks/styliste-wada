import { useWindowDimensions } from 'react-native';

/**
 * Size of a photo shown whole: at most 45 % of the screen height (and 440 px), never wider than the
 * screen minus its margins, with the photo's own proportions. Centre it with alignSelf: 'center'.
 */
export function useFittedSize(ratio: number) {
  const { width, height } = useWindowDimensions();
  const maxW = width - 40; // Screen's 20 px side padding
  const maxH = Math.min(height * 0.45, 440);
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  return { width: Math.round(w), height: Math.round(h) };
}
