import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Eyebrow, H1, Mono, Screen, Swatch, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { COMBOS, colorOf } from '@/lib/wada';

const WEIGHTS = [5, 3, 1.4, 0.8]; // dominant colour first, accent last

export default function PaletteScreen() {
  const t = useTheme();
  const { no } = useLocalSearchParams<{ no: string }>();
  const names = COMBOS.get(Number(no)) ?? [];
  const colors = names.map(colorOf).filter((c) => c !== undefined);

  return (
    <Screen>
      <View>
        <Eyebrow>Dictionnaire de Sanzo Wada</Eyebrow>
        <H1>Combinaison n° {no}</H1>
      </View>
      {colors.length ? (
        <>
          <View style={styles.blocks}>
            {colors.map((c, i) => (
              <View key={c.name} style={{ flex: WEIGHTS[i], backgroundColor: c.hex }} />
            ))}
          </View>
          <View>
            {colors.map((c) => (
              <View key={c.name} style={[styles.row, { borderBottomColor: t.line }]}>
                <Swatch hex={c.hex} />
                <T style={{ flex: 1 }}>{c.name}</T>
                <View style={{ alignItems: 'flex-end' }}>
                  <Mono muted>{c.hex}</Mono>
                  <Mono muted>CMJN {c.cmyk.join(' ')}</Mono>
                </View>
              </View>
            ))}
          </View>
          <T muted style={{ fontSize: 13 }}>
            Wada rappelle que la quantité de chaque couleur change l’équilibre. La teinte dominante couvre le haut et le bas ; la plus sombre ou la plus vive reste en
            petite surface, aux chaussures ou en accessoire.
          </T>
        </>
      ) : (
        <T muted>Cette combinaison n’existe pas.</T>
      )}
      <Button label="Fermer" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  blocks: { flexDirection: 'row', height: 160, borderRadius: 2, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
