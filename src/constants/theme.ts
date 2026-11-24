// Editorial black & white: the only colour on screen comes from the garments and the Wada palettes.
export const Colors = {
  light: {
    text: '#0A0A0A',
    textSecondary: '#737373',
    background: '#FFFFFF',
    backgroundElement: '#F5F5F4',
    backgroundSelected: '#0A0A0A',
    onSelected: '#FFFFFF',
    line: '#E5E5E3',
  },
  dark: {
    text: '#F5F5F4',
    textSecondary: '#8A8A88',
    background: '#000000',
    backgroundElement: '#121212',
    backgroundSelected: '#F5F5F4',
    onSelected: '#000000',
    line: '#262626',
  },
} as const;

// The camera is black in both themes.
export const Camera = { background: '#000000', text: '#FFFFFF', dim: 'rgba(255,255,255,0.6)', line: 'rgba(255,255,255,0.3)' };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Fonts are loaded in app/_layout.tsx. Each weight is its own family (fontWeight is unreliable with custom fonts on Android).
export const Fonts = {
  display: 'BodoniModa_500Medium',
  displayItalic: 'BodoniModa_400Regular_Italic',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export const Spacing = { one: 4, two: 8, three: 16, four: 24, five: 32 } as const;
