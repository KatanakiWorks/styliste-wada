import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Thin line icons (24×24, 1.5 stroke), drawn here to keep one consistent style.
const PATHS = {
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  camera: (
    <>
      <Path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  closet: (
    <>
      <Path d="M12 6.5a1.8 1.8 0 1 1 1.8 1.8c-.9 0-1.8.6-1.8 1.5v.7" />
      <Path d="M12 10.5L3.5 17h17z" />
    </>
  ),
  compose: (
    <>
      <Rect x={5} y={4} width={14} height={16} rx={1} />
      <Path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  heart: <Path d="M12 19s-7-4.4-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 2.5C19 14.6 12 19 12 19z" />,
  image: (
    <>
      <Rect x={4} y={5} width={16} height={14} rx={1} />
      <Circle cx={9} cy={10} r={1.5} />
      <Path d="M4 17l5-5 4 4 2.5-2.5L20 17" />
    </>
  ),
  mirror: (
    <>
      <Rect x={7} y={3.5} width={10} height={17} rx={5} />
      <Path d="M10 8l3-2M10 11l5-3.5" />
    </>
  ),
  spark: <Path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2" />,
  arrow: <Path d="M5 12h14M13 6l6 6-6 6" />,
  settings: (
    <>
      <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <Circle cx={16} cy={7} r={2} />
      <Circle cx={10} cy={17} r={2} />
    </>
  ),
  rotate: <Path d="M4 12a8 8 0 0 1 14-5.3M20 5v4h-4M20 12a8 8 0 0 1-14 5.3M4 19v-4h4" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  );
}
