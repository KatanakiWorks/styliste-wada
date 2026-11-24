import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Eyebrow, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useApiKey } from '@/lib/api-key';

/** Shown where an AI feature is used and no Gemini key is set yet. Renders nothing once a key exists. */
export function KeyBanner({ what = 'l’analyse des pièces, les conseils et le Mirror Check' }: { what?: string }) {
  const t = useTheme();
  const { key } = useApiKey();
  if (key) return null;
  return (
    <View style={[styles.box, { borderColor: t.text }]}>
      <Eyebrow style={{ color: t.text }}>Clé Gemini requise</Eyebrow>
      <T muted style={{ fontSize: 13 }}>
        {`Ajoutez votre propre clé Gemini gratuite pour activer ${what}. Elle reste chiffrée sur ce téléphone.`}
      </T>
      <Button primary label="Ajouter ma clé" onPress={() => router.push('/settings')} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, padding: 16, gap: 10 },
});
