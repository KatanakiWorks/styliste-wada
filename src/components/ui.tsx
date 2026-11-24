import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.five }} showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

type Weight = 'regular' | 'medium' | 'semibold';
const FAMILY: Record<Weight, string> = { regular: Fonts.body, medium: Fonts.medium, semibold: Fonts.semibold };

export function T({
  children,
  style,
  muted,
  weight = 'regular',
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  weight?: Weight;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: muted ? t.textSecondary : t.text, fontSize: 14, lineHeight: 20, fontFamily: FAMILY[weight] }, style]}>
      {children}
    </Text>
  );
}

/** Screen title in the display serif. */
export const H1 = ({ children }: { children: ReactNode }) => <T style={styles.h1}>{children}</T>;
export const H3 = ({ children }: { children: ReactNode }) => <T style={styles.h3}>{children}</T>;
export const Eyebrow = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <T muted weight="medium" style={[styles.eyebrow, style]}>
    {children}
  </T>
);
export const Mono = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <T muted={muted} style={styles.mono}>
    {children}
  </T>
);

/** Title block used at the top of every screen. */
export function Header({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 6 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <H1>{title}</H1>
      </View>
      {right}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? t.backgroundSelected : t.line, backgroundColor: selected ? t.backgroundSelected : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={{ color: selected ? t.onSelected : t.text, fontSize: 13, fontFamily: Fonts.medium }}>{label}</Text>
    </Pressable>
  );
}

/** Rectangular button with a spaced capital label: primary (filled), secondary (outline) or ghost (text only). */
export function Button({
  label,
  onPress,
  primary,
  ghost,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  ghost?: boolean;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const fg = primary ? t.onSelected : t.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        ghost
          ? { borderColor: 'transparent', height: 40 }
          : { borderColor: primary ? t.backgroundSelected : t.text, backgroundColor: primary ? t.backgroundSelected : 'transparent' },
        { opacity: disabled ? 0.3 : pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        style,
      ]}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text numberOfLines={1} style={[styles.buttonLabel, { color: fg }, ghost && { textDecorationLine: 'underline' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Round icon-only button (swipe actions, camera controls). */
export function IconButton({
  icon,
  onPress,
  label,
  primary,
  size = 56,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  primary?: boolean;
  size?: number;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: primary ? t.backgroundSelected : t.text,
          backgroundColor: primary ? t.backgroundSelected : 'transparent',
          opacity: disabled ? 0.3 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}>
      <Icon name={icon} color={primary ? t.onSelected : t.text} />
    </Pressable>
  );
}

export const Swatch = ({ hex, size = 12, radius }: { hex: string; size?: number; radius?: number }) => (
  <View style={{ width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor: hex, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(127,127,127,0.5)' }} />
);

/** Thin rule between sections. */
export function Rule() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line }} />;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: Spacing.three, gap: Spacing.three + 2, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 2 },
  h1: { fontFamily: Fonts.display, fontSize: 38, lineHeight: 44, letterSpacing: -0.5 },
  h3: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28 },
  eyebrow: { fontSize: 10.5, lineHeight: 14, textTransform: 'uppercase', letterSpacing: 2 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  button: { height: 52, paddingHorizontal: 18, borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buttonLabel: { fontFamily: Fonts.semibold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
});
