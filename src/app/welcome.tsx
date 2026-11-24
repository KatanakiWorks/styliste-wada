import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiKeyForm } from '@/components/api-key-form';
import { Mannequin } from '@/components/mannequin';
import { Button, Eyebrow, Screen, T } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateProfile, useProfile, type Body } from '@/lib/store';
import { COMBOS, hexOf } from '@/lib/wada';

const STEPS = 3;
const SAMPLE = [COMBOS.get(212), COMBOS.get(88), COMBOS.get(305)].flatMap((c) => c ?? []);

export default function WelcomeScreen() {
  const t = useTheme();
  const { body } = useProfile();
  const [step, setStep] = useState(0);

  function next() {
    Haptics.selectionAsync();
    if (step < STEPS - 1) return setStep(step + 1);
    updateProfile({ onboarded: true });
    router.replace('/');
  }

  const choose = (b: Body) => {
    Haptics.selectionAsync();
    updateProfile({ body: b });
  };

  return (
    <Screen>
      <View style={styles.dots} accessibilityLabel={`Étape ${step + 1} sur ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? t.text : t.line }]} />
        ))}
      </View>

      {step === 0 ? (
        <View style={styles.step}>
          <Eyebrow>Bienvenue</Eyebrow>
          <T style={styles.title}>Votre styliste de poche.</T>
          <T muted style={styles.lead}>
            Photographiez vos vêtements. L’app les associe selon les 348 combinaisons de couleurs du peintre japonais Sanzo Wada (1933), apprend vos goûts à chaque swipe et
            juge votre tenue devant le miroir.
          </T>
          <View style={styles.swatches}>
            {SAMPLE.map((c, i) => (
              <View key={`${c}-${i}`} style={{ flex: 1, backgroundColor: hexOf(c) }} />
            ))}
          </View>
          <T muted style={{ fontSize: 12 }}>Tout reste sur votre téléphone.</T>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.step}>
          <Eyebrow>Étape 2</Eyebrow>
          <T style={styles.title}>Votre silhouette.</T>
          <T muted style={styles.lead}>Elle sert à montrer les tenues portées. Modifiable à tout moment dans les paramètres.</T>
          <View style={styles.bodies}>
            {(['homme', 'femme'] as Body[]).map((b) => (
              <Pressable
                key={b}
                onPress={() => choose(b)}
                accessibilityRole="radio"
                accessibilityState={{ selected: body === b }}
                style={[styles.bodyCard, { borderColor: body === b ? t.text : t.line, borderWidth: body === b ? 1.5 : 1 }]}>
                <View style={styles.figure}>
                  <Mannequin pick={{}} body={b} />
                </View>
                <Eyebrow style={{ color: t.text, textAlign: 'center' }}>{b === 'homme' ? 'Homme' : 'Femme'}</Eyebrow>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.step}>
          <Eyebrow>Étape 3</Eyebrow>
          <T style={styles.title}>Votre clé Gemini.</T>
          <ApiKeyForm />
          <T muted style={{ fontSize: 12 }}>Pas de clé pour l’instant ? Vous pourrez l’ajouter plus tard dans Placard › Paramètres.</T>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button primary label={step === STEPS - 1 ? 'Entrer dans l’app' : step === 0 ? 'Commencer' : 'Continuer'} onPress={next} />
        {step > 0 ? <Button ghost label="Retour" onPress={() => setStep(step - 1)} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { flex: 1, height: 2 },
  step: { gap: 16, paddingTop: 12 },
  title: { fontFamily: Fonts.display, fontSize: 44, lineHeight: 50, letterSpacing: -0.6 },
  lead: { fontSize: 15, lineHeight: 23 },
  swatches: { flexDirection: 'row', height: 64, marginTop: 8 },
  bodies: { flexDirection: 'row', gap: 12 },
  bodyCard: { flex: 1, paddingVertical: 16, gap: 10 },
  figure: { height: 220 },
  actions: { gap: 4, marginTop: 8 },
});
