import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { Item, Outfit } from '@/lib/color';
import type { Body } from '@/lib/store';
import { hexOf } from '@/lib/wada';

// A flat mannequin wearing the outfit's colours. Garment shapes follow the piece type
// (short or long sleeves, trousers, shorts or skirt) so the overall look reads at a glance.

export const has = (item: Item | undefined, re: RegExp) => !!item && re.test(`${item.type} ${item.material}`.toLowerCase());
const EDGE = { stroke: '#000', strokeOpacity: 0.15, strokeWidth: 1 };

/** Garment shapes read from the piece types; shared by the 2D and 3D mannequins. */
export function outfitShape(pick: Outfit['pick']) {
  const { top, bottom, accessory: acc } = pick;
  return {
    sleeve: (!top || has(top, /débardeur|debardeur|top sans manche|caraco/) ? 'none' : has(top, /t-shirt|tee|polo|crop/) ? 'short' : 'long') as 'none' | 'short' | 'long',
    legs: (has(bottom, /short|bermuda/) ? 'shorts' : has(bottom, /jupe|skirt/) ? 'skirt' : 'trousers') as 'shorts' | 'skirt' | 'trousers',
    accessory: (!acc
      ? null
      : has(acc, /lunette/)
        ? 'glasses'
        : has(acc, /casquette|chapeau|bonnet|bob/)
          ? 'hat'
          : has(acc, /sac|tote|besace/)
            ? 'bag'
            : has(acc, /ceinture/)
              ? 'belt'
              : has(acc, /collier|chaîne|chaine|pendentif/)
                ? 'necklace'
                : 'watch') as 'glasses' | 'hat' | 'bag' | 'belt' | 'necklace' | 'watch' | null,
  };
}

export function Mannequin({ pick, body }: { pick: Outfit['pick']; body: Body }) {
  const t = useTheme();
  const skin = t.textSecondary;
  const { top, bottom, shoes, accessory: acc } = pick;
  const cx = 100;
  const sh = body === 'homme' ? 38 : 30; // shoulder half-width
  const wa = body === 'homme' ? 35 : 23; // waist half-width
  const hp = body === 'homme' ? 37 : 36; // hip half-width
  const { sleeve, legs } = outfitShape(pick);
  const fill = (i: Item) => hexOf(i.color);

  const armSkin = `M${cx - sh} 74 L${cx - sh - 14} 80 L${cx - sh - 24} 202 L${cx - sh - 11} 204 L${cx - sh + 2} 112 Z`;
  const sleevePath =
    sleeve === 'long'
      ? `M${cx - sh} 72 L${cx - sh - 15} 79 L${cx - sh - 25} 194 L${cx - sh - 10} 196 L${cx - sh + 3} 110 Z`
      : `M${cx - sh} 72 L${cx - sh - 15} 79 L${cx - sh - 19} 122 L${cx - sh - 3} 124 L${cx - sh + 3} 104 Z`;
  const torso = `M${cx - sh} 70 L${cx + sh} 70 L${cx + sh + 3} 92 L${cx + wa} 150 L${cx + hp} 206 L${cx - hp} 206 L${cx - wa} 150 L${cx - sh - 3} 92 Z`;
  const legSkin = `M${cx - hp + 2} 204 L${cx - 2} 204 L${cx - 6} 382 L${cx - hp + 4} 382 Z`;
  const bottomPath =
    legs === 'skirt'
      ? `M${cx - wa - 3} 196 L${cx + wa + 3} 196 L${cx + hp + 18} 300 L${cx - hp - 18} 300 Z`
      : legs === 'shorts'
        ? `M${cx - hp} 198 L${cx + hp} 198 L${cx + hp + 2} 282 L${cx + 5} 282 L${cx} 246 L${cx - 5} 282 L${cx - hp - 2} 282 Z`
        : `M${cx - hp} 198 L${cx + hp} 198 L${cx + hp + 2} 380 L${cx + 6} 380 L${cx} 246 L${cx - 6} 380 L${cx - hp - 2} 380 Z`;
  const shoe = `M${cx - hp - 4} 380 L${cx - 6} 380 Q${cx - 2} 396 ${cx - 10} 398 L${cx - hp - 10} 398 Q${cx - hp - 14} 390 ${cx - hp - 4} 380 Z`;

  // left side drawn once, right side mirrored
  const mirror = (node: React.ReactNode) => (
    <>
      {node}
      <G transform={`translate(${2 * cx},0) scale(-1,1)`}>{node}</G>
    </>
  );

  return (
    <Svg viewBox="0 0 200 410" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {mirror(<Path d={armSkin} fill={skin} opacity={0.35} />)}
      {legs !== 'trousers' || !bottom ? mirror(<Path d={legSkin} fill={skin} opacity={0.35} />) : null}
      <Rect x={cx - 8} y={52} width={16} height={20} fill={skin} opacity={0.35} />
      <Circle cx={cx} cy={36} r={20} fill={skin} opacity={0.35} />
      {bottom ? <Path d={bottomPath} fill={fill(bottom)} {...EDGE} /> : null}
      <Path d={torso} fill={top ? fill(top) : skin} opacity={top ? 1 : 0.35} {...(top ? EDGE : {})} />
      {top && sleeve !== 'none' ? mirror(<Path d={sleevePath} fill={fill(top)} {...EDGE} />) : null}
      {shoes ? mirror(<Path d={shoe} fill={fill(shoes)} {...EDGE} />) : null}
      {acc ? <Accessory item={acc} cx={cx} sh={sh} hp={hp} /> : null}
    </Svg>
  );
}

function Accessory({ item, cx, sh, hp }: { item: Item; cx: number; sh: number; hp: number }) {
  const c = hexOf(item.color);
  if (has(item, /lunette/))
    return (
      <G {...EDGE}>
        <Rect x={cx - 16} y={30} width={14} height={9} rx={4} fill={c} />
        <Rect x={cx + 2} y={30} width={14} height={9} rx={4} fill={c} />
      </G>
    );
  if (has(item, /casquette|chapeau|bonnet|bob/)) return <Path d={`M${cx - 22} 30 Q${cx} 4 ${cx + 22} 30 L${cx + 30} 32 L${cx - 22} 32 Z`} fill={c} {...EDGE} />;
  if (has(item, /sac|tote|besace/))
    return (
      <G {...EDGE}>
        <Path d={`M${cx - sh + 6} 72 L${cx + hp + 10} 186`} stroke={c} strokeWidth={3} strokeOpacity={1} />
        <Rect x={cx + hp} y={180} width={28} height={24} rx={4} fill={c} />
      </G>
    );
  if (has(item, /ceinture/)) return <Rect x={cx - hp} y={196} width={hp * 2} height={7} fill={c} {...EDGE} />;
  if (has(item, /collier|chaîne|chaine|pendentif/)) return <Path d={`M${cx - 10} 72 Q${cx} 92 ${cx + 10} 72`} stroke={c} strokeWidth={2.5} fill="none" />;
  // watch, bracelet or anything else: on the left wrist
  return <Rect x={cx - sh - 26} y={184} width={14} height={9} rx={2} fill={c} {...EDGE} />;
}
