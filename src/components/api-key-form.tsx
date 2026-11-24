import { useState } from 'react';
import { Alert, Linking, StyleSheet, TextInput, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteApiKey, maskKey, saveApiKey, testApiKey, useApiKey } from '@/lib/api-key';

function confirm(title: string, message: string, action: () => void) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Confirmer', style: 'destructive', onPress: action },
  ]);
}

/** Paste, check, save or delete the user's own Gemini key. Used in the settings and the welcome flow. */
export function ApiKeyForm() {
  const t = useTheme();
  const { key, source } = useApiKey();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    const value = draft.trim();
    if (!value) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await testApiKey(value);
      if (result === 'invalid') {
        setMessage('Google refuse cette clé. Vérifiez qu’elle est copiée en entier, sans espace.');
        return;
      }
      await saveApiKey(value);
      setDraft('');
      setMessage(result === 'ok' ? 'Clé vérifiée et enregistrée.' : 'Clé enregistrée, mais pas vérifiée : pas de connexion.');
    } catch (e) {
      setMessage(`Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    if (!key) return;
    setBusy(true);
    const result = await testApiKey(key);
    setBusy(false);
    setMessage(result === 'ok' ? 'La clé fonctionne.' : result === 'invalid' ? 'Google refuse cette clé. Remplacez-la.' : 'Pas de connexion : réessayez plus tard.');
  }

  return (
    <View style={styles.form}>
      <T muted style={{ fontSize: 13 }}>
        L’analyse des pièces, les conseils, le Mirror Check et le lookbook utilisent votre propre clé Gemini. Elle est chiffrée sur ce téléphone et envoyée uniquement à Google.
      </T>
      {key ? (
        <View style={[styles.keyRow, { borderColor: t.line }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <T weight="medium">{maskKey(key)}</T>
            <T muted style={{ fontSize: 12 }}>
              {source === 'device' ? 'Enregistrée sur ce téléphone' : 'Clé de développement (fichier .env)'}
            </T>
          </View>
          <Button ghost label="Tester" onPress={check} disabled={busy} />
        </View>
      ) : null}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={key ? 'Coller une nouvelle clé' : 'Coller votre clé (AIza… ou AQ.…)'}
        placeholderTextColor={t.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Clé API Gemini"
        style={[styles.input, { borderColor: t.line, color: t.text, fontFamily: Fonts.body }]}
      />
      <Button primary label={busy ? 'Vérification…' : 'Vérifier et enregistrer'} onPress={save} disabled={busy || !draft.trim()} />
      {message ? <T style={{ fontSize: 13 }}>{message}</T> : null}
      <View style={styles.links}>
        <Button ghost label="Obtenir une clé gratuite" onPress={() => Linking.openURL('https://aistudio.google.com/apikey')} />
        {source === 'device' ? (
          <Button
            ghost
            label="Supprimer la clé"
            onPress={() =>
              confirm('Supprimer votre clé ?', 'Les fonctions IA seront désactivées jusqu’à ce que vous en ajoutiez une.', () => {
                deleteApiKey().then(() => setMessage('Clé supprimée.'));
              })
            }
          />
        ) : null}
      </View>
      <T muted style={{ fontSize: 12 }}>Les images de lookbook nécessitent la facturation activée sur Google AI Studio ; le reste fonctionne avec l’offre gratuite.</T>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  keyRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingLeft: 14, paddingVertical: 4 },
  input: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
