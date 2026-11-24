import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { KeyBanner } from '@/components/key-banner';
import { Button, Eyebrow, H1, Rule, Screen, T } from '@/components/ui';
import { Camera as C, Fonts } from '@/constants/theme';
import { useFittedSize } from '@/hooks/use-fitted-size';
import { useTheme } from '@/hooks/use-theme';
import { CRITERIA, mirrorCheck, NO_KEY, type MirrorReview } from '@/lib/gemini';
import { pickPhoto, ratioOf, shrink, type Photo } from '@/lib/pick';
import { useCloset } from '@/lib/store';

/** Score bar that fills from 0 when the verdict appears. */
function ScoreFill({ score, color }: { score: number; color: string }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: score, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, score]);
  return <Animated.View style={{ height: '100%', backgroundColor: color, width: v.interpolate({ inputRange: [0, 10], outputRange: ['0%', '100%'] }) }} />;
}

export default function MirrorScreen() {
  const t = useTheme();
  const { look } = useLocalSearchParams<{ look?: string }>();
  const items = useCloset();
  const pieces = (look ?? '').split(',').flatMap((id) => items.filter((i) => i.id === id));
  const cam = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<Photo>();
  const size = useFittedSize(photo ? ratioOf(photo) : 3 / 4);
  const [review, setReview] = useState<MirrorReview>();
  const overall = review ? (review.beauty.score + review.colors.score + review.drip.score) / 3 : 0;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function analyze(source: 'camera' | 'library') {
    if (busy || (source === 'camera' && !cam.current)) return;
    setBusy(true);
    setError('');
    try {
      let pic: Photo | null;
      if (source === 'camera') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const shot = await cam.current!.takePictureAsync({ quality: 0.9 });
        pic = shot?.uri ? await shrink(shot.uri, shot.width, shot.height) : null;
      } else pic = await pickPhoto();
      if (source === 'library' && !pic) return; // picker cancelled
      if (!pic) throw new Error('Aucune image reçue.');
      setPhoto(pic);
      setReview(await mirrorCheck(pic.base64, pieces));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === NO_KEY ? 'Ajoutez votre clé Gemini dans Paramètres pour activer le Mirror Check.' : `Analyse impossible : ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!photo) return;
    if (!(await Sharing.isAvailableAsync())) return Alert.alert('Partage indisponible sur cet appareil');
    await Sharing.shareAsync(photo.uri, { mimeType: 'image/jpeg', dialogTitle: 'Partager le look' });
  }

  function retake() {
    setPhoto(undefined);
    setReview(undefined);
    setError('');
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Mirror Check · tenue portée</Eyebrow>
        <H1>{review ? 'Le verdict' : 'Devant le miroir'}</H1>
      </View>

      {/* the frame takes the photo's own proportions, so the whole outfit stays visible */}
      <View style={[styles.frame, size, { backgroundColor: photo ? t.backgroundElement : C.background }]}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        ) : (
          <>
            <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="front" mirror />
            <Pressable style={styles.shutter} onPress={() => analyze('camera')} disabled={busy} accessibilityLabel="Prendre la photo du look">
              <View style={styles.shutterInner} />
            </Pressable>
          </>
        )}
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={C.text} />
          </View>
        ) : null}
      </View>

      <KeyBanner what="le Mirror Check" />
      {!photo ? <T muted style={{ fontSize: 12 }}>Placez-vous en entier dans le cadre, tenue complète, chaussures comprises.</T> : null}
      {error ? <T muted>{error}</T> : null}

      {review ? (
        <View style={{ gap: 18 }}>
          <View style={styles.overall}>
            <T style={styles.big}>{overall.toFixed(1).replace('.', ',')}</T>
            <T muted style={{ fontSize: 14, marginBottom: 10 }}>
              / 10
            </T>
          </View>
          {review.verdict ? <T style={styles.verdict}>{review.verdict}</T> : null}
          <Rule />
          {CRITERIA.map(({ key, label }) => (
            <View key={key} style={{ gap: 8 }}>
              <View style={styles.criterionHead}>
                <Eyebrow style={{ color: t.text }}>{label}</Eyebrow>
                <T style={styles.score}>{String(review[key].score)}</T>
              </View>
              <View style={[styles.track, { backgroundColor: t.line }]} accessibilityLabel={`${label} : ${review[key].score} sur 10`}>
                <ScoreFill score={review[key].score} color={t.text} />
              </View>
              <T muted style={{ fontSize: 13 }}>
                {review[key].comment}
              </T>
            </View>
          ))}
          <Rule />
          <Eyebrow>Ajustements</Eyebrow>
        </View>
      ) : null}

      {review?.tips.map((tip, i) => (
        <View key={tip.title} style={[styles.tip, { borderBottomColor: t.line }]}>
          <View style={[styles.n, { borderColor: t.line }]}>
            <T style={{ fontSize: 11 }}>{String(i + 1)}</T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T weight="medium">{tip.title}</T>
            <T muted style={{ fontSize: 12 }}>
              {tip.detail}
            </T>
          </View>
        </View>
      ))}

      {photo ? (
        <View style={styles.row}>
          <Button label="Reprendre" onPress={retake} style={{ flex: 1 }} />
          <Button primary label="Partager le look" onPress={share} style={{ flex: 1 }} />
        </View>
      ) : (
        <View style={styles.row}>
          <Button label="Retour" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button label="Importer une photo" onPress={() => analyze('library')} disabled={busy} style={{ flex: 1.4 }} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  shutter: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: C.text, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.text },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  n: { width: 24, height: 24, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  overall: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  big: { fontFamily: Fonts.display, fontSize: 72, lineHeight: 78 },
  verdict: { fontFamily: Fonts.displayItalic, fontSize: 20, lineHeight: 27 },
  criterionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  score: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30 },
  track: { height: 3, overflow: 'hidden' },
});
