import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PieceForm, type PieceValue } from '@/components/piece-form';
import { Button, H1, Screen } from '@/components/ui';
import { useFittedSize } from '@/hooks/use-fitted-size';
import { useTheme } from '@/hooks/use-theme';
import { getItem, removeItem, updateItem } from '@/lib/store';

export default function EditItemScreen() {
  const t = useTheme();
  const size = useFittedSize(3 / 4);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item] = useState(() => getItem(id));
  const [value, setValue] = useState<PieceValue>(() => ({ slot: item?.slot, type: item?.type ?? '', material: item?.material ?? '', color: item?.color }));

  if (!item) return <Redirect href="/closet" />;
  const { slot, type, material, color } = value;
  const changed = slot !== item.slot || type !== item.type || material !== item.material || color !== item.color;

  function save() {
    if (!slot || !color || !type.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateItem(item!.id, { slot, type: type.trim().toLowerCase(), material: material.trim().toLowerCase(), color });
    router.back();
  }

  function confirmDelete() {
    Alert.alert('Supprimer cette pièce ?', `${item!.type} sera retirée du placard avec sa photo, ainsi que les looks qui la contiennent.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removeItem(item!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <H1>Modifier la pièce</H1>
      <Image source={{ uri: item.photo }} style={[styles.photo, size, { backgroundColor: t.backgroundElement }]} contentFit="contain" />
      <Button label="Composer une tenue avec cette pièce" onPress={() => router.push({ pathname: '/composer', params: { anchor: item.id } })} />
      <PieceForm value={value} onChange={setValue} measured={item.measuredHex} />
      <View style={styles.row}>
        <Button label="Supprimer" onPress={confirmDelete} style={{ flex: 1 }} />
        <Button primary label="Enregistrer" onPress={save} disabled={!changed || !slot || !color || !type.trim()} style={{ flex: 1.4 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { alignSelf: 'center', borderRadius: 2 },
  row: { flexDirection: 'row', gap: 8 },
});
