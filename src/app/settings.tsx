import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { ApiKeyForm } from '@/components/api-key-form';
import { Button, Chip, Eyebrow, Header, Rule, Screen, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { clearCloset, clearLooks, resetTaste, updateProfile, useCloset, useLooks, useProfile, type Profile } from '@/lib/store';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="medium">{label}</T>
        {hint ? (
          <T muted style={{ fontSize: 12 }}>
            {hint}
          </T>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: t.text, false: t.line }}
        thumbColor={t.background}
        ios_backgroundColor={t.line}
      />
    </View>
  );
}

/** Ask before a destructive action; nothing happens unless the user confirms. */
function confirm(title: string, message: string, action: () => void) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Confirmer', style: 'destructive', onPress: action },
  ]);
}

export default function SettingsScreen() {
  const profile = useProfile();
  const items = useCloset();
  const looks = useLooks();
  const set = (patch: Partial<Profile>) => updateProfile(patch);

  return (
    <Screen>
      <Header eyebrow="Réglages" title="Paramètres" />

      <Section title="Clé API Gemini">
        <ApiKeyForm />
      </Section>
      <Rule />

      <Section title="Silhouette">
        <View style={styles.row}>
          <Chip label="Homme" selected={profile.body === 'homme'} onPress={() => set({ body: 'homme' })} />
          <Chip label="Femme" selected={profile.body === 'femme'} onPress={() => set({ body: 'femme' })} />
        </View>
        <Toggle label="Silhouette 3D" hint="Mannequin en relief que l’on tourne du doigt. Désactivez-la si l’app est lente." value={profile.figure3d} onChange={(figure3d) => set({ figure3d })} />
      </Section>
      <Rule />

      <Section title="Apparence">
        <View style={styles.row}>
          <Chip label="Système" selected={profile.theme === 'system'} onPress={() => set({ theme: 'system' })} />
          <Chip label="Clair" selected={profile.theme === 'light'} onPress={() => set({ theme: 'light' })} />
          <Chip label="Sombre" selected={profile.theme === 'dark'} onPress={() => set({ theme: 'dark' })} />
        </View>
      </Section>
      <Rule />

      <Section title="Tenues">
        <Toggle
          label="Adapter à la météo"
          hint="Utilise votre position approximative (environ 1 km) pour la température et la pluie."
          value={profile.weather}
          onChange={(weather) => set({ weather })}
        />
      </Section>
      <Rule />

      <Section title="Données">
        <T muted style={{ fontSize: 12 }}>Tout est stocké sur ce téléphone : rien n’est envoyé sur un serveur, en dehors des analyses Gemini.</T>
        <Button label="Réinitialiser mes goûts" onPress={() => confirm('Réinitialiser vos goûts ?', 'Les tenues ne seront plus triées selon vos swipes passés.', resetTaste)} />
        <Button
          label={`Effacer mes looks (${looks.length})`}
          disabled={!looks.length}
          onPress={() => confirm('Effacer tous vos looks ?', `${looks.length} look(s) seront supprimés. Vos pièces restent dans le placard.`, clearLooks)}
        />
        <Button
          label={`Vider le placard (${items.length})`}
          disabled={!items.length}
          onPress={() => confirm('Vider le placard ?', `${items.length} pièce(s) et leurs photos seront supprimées définitivement, ainsi que vos looks.`, clearCloset)}
        />
      </Section>
      <Rule />

      <Section title="À propos">
        <T muted style={{ fontSize: 12 }}>
          Palettes : « A Dictionary of Color Combinations », Sanzo Wada (1933–1934). Données numérisées par Matt DesLauriers, licence MIT.
        </T>
        <T muted style={{ fontSize: 12 }}>{`Version ${Constants.expoConfig?.version ?? '1.0.0'}`}</T>
        <Button
          ghost
          label="Revoir l’accueil"
          onPress={() => {
            updateProfile({ onboarded: false });
            router.replace('/welcome');
          }}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
