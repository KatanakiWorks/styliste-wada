import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { KeyBanner } from '@/components/key-banner';
import { Button, Chip, Header, IconButton, Rule, Screen, Swatch, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { SLOT_LABELS, type Slot } from '@/lib/color';
import { useCloset, useLooks } from '@/lib/store';
import { hexOf } from '@/lib/wada';

const START = 10; // onboarding: 3 tops, 3 bottoms, 2 pairs of shoes, 2 accessories

export default function ClosetScreen() {
  const t = useTheme();
  const items = useCloset();
  const looks = useLooks();
  const [filter, setFilter] = useState<Slot | 'all'>('all');
  const shown = items.filter((i) => filter === 'all' || i.slot === filter);

  return (
    <Screen>
      <Header
        eyebrow={`${items.length} pièce${items.length > 1 ? 's' : ''} · ${looks.length} look${looks.length > 1 ? 's' : ''}`}
        title="Placard"
        right={
          <View style={styles.bodyRow}>
            <IconButton icon="settings" label="Paramètres" onPress={() => router.push('/settings')} size={46} />
            <IconButton icon="camera" label="Ajouter une pièce" onPress={() => router.navigate('/')} size={46} primary />
          </View>
        }
      />
      <Rule />
      <KeyBanner />

      {items.length < START ? (
        <View style={[styles.onboard, { borderColor: t.line }]}>
          <T>
            {items.length}/{START} pièces pour démarrer
          </T>
          <T muted style={{ fontSize: 12 }}>Photographiez vos pièces préférées : 3 hauts, 3 bas, 2 paires de chaussures, 2 accessoires.</T>
          <View style={[styles.bar, { backgroundColor: t.backgroundElement }]}>
            <View style={{ width: `${(items.length / START) * 100}%`, backgroundColor: t.text, height: '100%' }} />
          </View>
          <Button primary icon="camera" label="Photographier une pièce" onPress={() => router.navigate('/')} />
        </View>
      ) : null}

      <View style={styles.wrap}>
        <Chip label="Tout" selected={filter === 'all'} onPress={() => setFilter('all')} />
        {(Object.keys(SLOT_LABELS) as Slot[]).map((s) => (
          <Chip key={s} label={SLOT_LABELS[s]} selected={filter === s} onPress={() => setFilter(s)} />
        ))}
      </View>

      <View style={styles.grid}>
        {shown.map((i) => (
          <Pressable
            key={i.id}
            onPress={() => router.push(`/item/${i.id}`)}
            accessibilityLabel={`Modifier ${i.type}`}
            style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.8 : 1 }]}>
            <Image source={{ uri: i.photo }} style={[styles.photo, { backgroundColor: t.backgroundElement }]} contentFit="contain" />
            <View style={{ gap: 2 }}>
              <T numberOfLines={1} weight="medium" style={{ textTransform: 'capitalize' }}>
                {i.type}
              </T>
              <T muted numberOfLines={1} style={{ fontSize: 12 }}>
                {i.material}
              </T>
              <View style={styles.meta}>
                <Swatch hex={hexOf(i.color)} size={10} />
                <T muted numberOfLines={1} style={{ fontSize: 11, flex: 1 }}>
                  {i.color}
                </T>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      {items.length ? <T muted style={{ fontSize: 12 }}>Touchez une pièce pour la modifier, la supprimer ou composer une tenue autour d’elle.</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onboard: { borderWidth: 1, padding: 18, gap: 12 },
  bar: { height: 2, overflow: 'hidden' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 22 },
  tile: { width: '47.8%', gap: 10 },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
