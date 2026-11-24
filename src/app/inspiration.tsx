import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, TextInput, View } from 'react-native';

import { Button, Eyebrow, H1, Screen, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { lookbook, NO_KEY } from '@/lib/gemini';
import { pinterestUrl } from '@/lib/inspiration';
import { getProfile, useCloset } from '@/lib/store';

export default function InspirationScreen() {
  const t = useTheme();
  const { q, ids, context } = useLocalSearchParams<{ q?: string; ids?: string; context?: string }>();
  const items = useCloset();
  const pieces = (ids ?? '').split(',').flatMap((id) => items.filter((i) => i.id === id));
  const [query, setQuery] = useState(q ?? 'tenue minimaliste');
  const [image, setImage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const refs = await Promise.all(pieces.map(async (item) => ({ item, base64: await new File(item.photo).base64() })));
      setImage(await lookbook(refs, context ?? 'quotidien', getProfile().body));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === NO_KEY ? 'Ajoutez votre clé Gemini dans Paramètres pour générer un lookbook.' : `Génération impossible : ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Idées de tenues</Eyebrow>
        <H1>Inspirations</H1>
      </View>

      {pieces.length ? (
        <View style={styles.block}>
          <View style={[styles.frame, { backgroundColor: t.backgroundElement }]}>
            {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
            {busy ? <ActivityIndicator /> : !image ? <T muted style={styles.center}>Gemini imagine cette tenue portée, à partir des photos de vos pièces.</T> : null}
          </View>
          {error ? <T muted>{error}</T> : null}
          <Button primary label={image ? 'Générer une autre version' : 'Générer le lookbook'} onPress={generate} disabled={busy} />
          <T muted style={{ fontSize: 11 }}>Image créée par IA (filigrane SynthID). Chaque génération est facturée sur votre clé Gemini.</T>
        </View>
      ) : null}

      <View style={styles.block}>
        <Eyebrow>Chercher sur Pinterest</Eyebrow>
        <TextInput
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => Linking.openURL(pinterestUrl(query.trim() || 'tenue'))}
          accessibilityLabel="Recherche Pinterest"
          style={[styles.input, { borderColor: t.line, color: t.text }]}
        />
        <Button label="Voir sur Pinterest" onPress={() => Linking.openURL(pinterestUrl(query.trim() || 'tenue'))} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  frame: { width: '100%', aspectRatio: 3 / 4, borderRadius: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center', paddingHorizontal: 32, fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
});
