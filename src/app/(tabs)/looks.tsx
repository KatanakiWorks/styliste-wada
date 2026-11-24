import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Mannequin } from '@/components/mannequin';
import { Button, Eyebrow, H1, Mono, Screen, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { OCCASIONS } from '@/lib/advice';
import { SLOTS, type Outfit } from '@/lib/color';
import { removeLook, useCloset, useLooks, useProfile } from '@/lib/store';

export default function LooksScreen() {
  const t = useTheme();
  const looks = useLooks();
  const items = useCloset();
  const { body } = useProfile();

  return (
    <Screen>
      <View style={styles.head}>
        <H1>Mes looks</H1>
        <Mono muted>{`${looks.length} gardé${looks.length > 1 ? 's' : ''}`}</Mono>
      </View>
      {!looks.length ? (
        <View style={[styles.empty, { borderColor: t.line }]}>
          <T muted>Les tenues que vous gardez dans le Composer (swipe à droite ou « Garder ») apparaissent ici.</T>
          <Button label="Ouvrir le Composer" onPress={() => router.push('/composer')} />
        </View>
      ) : null}
      {looks.map((look) => {
        const pieces = look.ids.flatMap((id) => items.filter((i) => i.id === id));
        const pick: Outfit['pick'] = Object.fromEntries(pieces.map((i) => [i.slot, i]));
        const occasion = OCCASIONS.find(([k]) => k === look.occasion)?.[1] ?? '';
        return (
          <View key={look.at} style={[styles.card, { borderColor: t.line }]}>
            <View style={styles.figure}>
              <Mannequin pick={pick} body={body} />
            </View>
            <View style={styles.info}>
              <Pressable onPress={() => router.push(`/palette/${look.combo}`)} hitSlop={6}>
                <Eyebrow>{`Wada n° ${look.combo}`}</Eyebrow>
              </Pressable>
              <T muted style={{ fontSize: 12 }}>
                {[occasion, new Date(look.at).toLocaleDateString('fr-FR')].filter(Boolean).join(' · ')}
              </T>
              {SLOTS.map((s) =>
                pick[s] ? (
                  <View key={s} style={styles.row}>
                    <Image source={{ uri: pick[s]!.photo }} style={[styles.thumb, { backgroundColor: t.backgroundElement }]} contentFit="cover" />
                    <T numberOfLines={1} style={{ fontSize: 12, flex: 1 }}>
                      {pick[s]!.type}
                    </T>
                  </View>
                ) : null,
              )}
              <Pressable onPress={() => removeLook(look.at)} accessibilityRole="button" hitSlop={6}>
                <T muted style={{ fontSize: 12, textDecorationLine: 'underline' }}>
                  Retirer ce look
                </T>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 2, padding: 16, gap: 12 },
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 2, padding: 10, gap: 10 },
  figure: { width: '38%', aspectRatio: 200 / 410 },
  info: { flex: 1, gap: 6, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 34, height: 34, borderRadius: 8 },
});
