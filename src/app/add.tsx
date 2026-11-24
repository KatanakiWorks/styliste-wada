import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PieceForm, type PieceValue } from '@/components/piece-form';
import { KeyBanner } from '@/components/key-banner';
import { Button, H1, Screen, T } from '@/components/ui';
import { useFittedSize } from '@/hooks/use-fitted-size';
import { useTheme } from '@/hooks/use-theme';
import { nearestColors } from '@/lib/color';
import { analyzeGarment, NO_KEY } from '@/lib/gemini';
import { ratioOf } from '@/lib/pick';
import { addItem, getPending, setPending } from '@/lib/store';
import { COLORS } from '@/lib/wada';

export default function AddScreen() {
  const t = useTheme();
  const [pending] = useState(getPending);
  const size = useFittedSize(ratioOf(pending ?? undefined));
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [error, setError] = useState('');
  const [measured, setMeasured] = useState<string>();
  const [value, setValue] = useState<PieceValue>({ type: '', material: '' });

  useEffect(() => {
    if (!pending) return;
    let live = true;
    analyzeGarment(pending.base64)
      .then((a) => {
        if (!live) return;
        setMeasured(a.hex);
        setValue({ slot: a.slot, type: a.type, material: a.material, color: a.hex ? nearestColors(a.hex, COLORS, 1)[0].name : undefined });
        setStatus('done');
      })
      .catch((e: Error) => {
        if (!live) return;
        setError(
          e.message === NO_KEY
            ? 'Analyse IA désactivée : ajoutez votre clé Gemini dans Paramètres. En attendant, renseignez la pièce à la main.'
            : `Analyse impossible (${e.message}). Renseignez la pièce à la main.`,
        );
        setStatus('error');
      });
    return () => {
      live = false;
    };
  }, [pending]);

  if (!pending) return <Redirect href="/" />;

  const { slot, type, material, color } = value;
  function save() {
    if (!slot || !color || !pending) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem({ slot, type: type.trim().toLowerCase(), material: material.trim().toLowerCase(), color, measuredHex: measured }, pending.uri);
    setPending(null);
    router.replace('/closet');
  }

  return (
    <Screen>
      <H1>Nouvelle pièce</H1>
      <KeyBanner what="l’analyse automatique de la pièce" />
      <Image source={{ uri: pending.uri }} style={[styles.photo, size, { backgroundColor: t.backgroundElement }]} contentFit="contain" />

      {status === 'loading' ? (
        <View style={styles.row}>
          <ActivityIndicator />
          <T muted>Analyse de la pièce…</T>
        </View>
      ) : (
        <>
          {error ? <T muted>{error}</T> : null}
          {/* mounted once the analysis is done, so the colour picker starts from the measured colour */}
          <PieceForm value={value} onChange={setValue} measured={measured} />
          <T muted style={{ fontSize: 12 }}>La lumière fausse souvent la couleur. Choisissez la teinte qui ressemble le plus au vêtement réel.</T>
          <Button primary label="Ajouter au placard" onPress={save} disabled={!slot || !color || !type.trim()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { alignSelf: 'center', borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
