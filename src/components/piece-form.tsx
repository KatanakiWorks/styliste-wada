import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Eyebrow, Mono, Swatch, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { nearestColors, SLOT_LABELS, type Slot } from '@/lib/color';
import { COLORS, hexOf } from '@/lib/wada';

export type PieceValue = { slot?: Slot; type: string; material: string; color?: string };

/** Category, name, material and colour of a piece. Used to add a piece and to edit one. */
export function PieceForm({ value, onChange, measured }: { value: PieceValue; onChange: (v: PieceValue) => void; measured?: string }) {
  const t = useTheme();
  const [showAll, setShowAll] = useState(!measured);
  const near = measured ? nearestColors(measured, COLORS, 4) : [];
  const set = (patch: Partial<PieceValue>) => onChange({ ...value, ...patch });
  const input = [styles.input, { borderColor: t.line, color: t.text }];

  return (
    <>
      <View style={styles.block}>
        <Eyebrow>Catégorie</Eyebrow>
        <View style={styles.wrap}>
          {(Object.keys(SLOT_LABELS) as Slot[]).map((s) => (
            <Chip key={s} label={SLOT_LABELS[s]} selected={value.slot === s} onPress={() => set({ slot: s })} />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Eyebrow>Pièce et matière</Eyebrow>
        <TextInput value={value.type} onChangeText={(type) => set({ type })} placeholder="ex. chemise col cubain" placeholderTextColor={t.textSecondary} style={input} />
        <TextInput value={value.material} onChangeText={(material) => set({ material })} placeholder="ex. lin froissé" placeholderTextColor={t.textSecondary} style={input} />
      </View>

      <View style={styles.block}>
        {measured ? (
          <View style={[styles.measure, { backgroundColor: t.backgroundElement }]}>
            <Swatch hex={measured} size={34} radius={8} />
            <View>
              <Eyebrow>Couleur mesurée sur la photo</Eyebrow>
              <Mono>{measured}</Mono>
            </View>
          </View>
        ) : null}
        <Eyebrow>{near.length ? 'Teinte la plus proche · touchez pour corriger' : 'Choisissez la teinte du vêtement'}</Eyebrow>
        {near.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => set({ color: c.name })}
            accessibilityRole="radio"
            accessibilityState={{ selected: value.color === c.name }}
            style={[styles.near, { borderColor: value.color === c.name ? t.text : t.line, borderWidth: value.color === c.name ? 2 : 1 }]}>
            <Swatch hex={c.hex} size={34} radius={8} />
            <View style={{ flex: 1 }}>
              <T>{c.name}</T>
              <Mono muted>{c.hex}</Mono>
            </View>
            <Mono muted>ΔE {c.dE.toFixed(1)}</Mono>
          </Pressable>
        ))}
        {near.length ? <Button label={showAll ? 'Masquer les teintes' : `Voir les ${COLORS.length} teintes (basiques + Wada)`} onPress={() => setShowAll(!showAll)} /> : null}
        {showAll ? (
          <View style={styles.grid}>
            {COLORS.map((c) => (
              <Pressable
                key={c.name}
                onPress={() => set({ color: c.name })}
                accessibilityLabel={c.name}
                style={[styles.cell, { backgroundColor: c.hex, borderColor: value.color === c.name ? t.text : 'transparent' }]}
              />
            ))}
          </View>
        ) : null}
        {value.color ? (
          <View style={styles.row}>
            <Swatch hex={hexOf(value.color)} />
            <T>Teinte retenue : {value.color}</T>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  measure: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 2 },
  near: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 36, height: 36, borderRadius: 8, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
