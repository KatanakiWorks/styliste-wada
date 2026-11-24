import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Camera as C, Fonts } from '@/constants/theme';
import { pickPhoto, shrink } from '@/lib/pick';
import { setPending, useCloset } from '@/lib/store';

// Camera-first home: shoot a garment, or swipe right for the closet and left for the composer.
export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(true);
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);
  const items = useCloset();

  // only one camera preview may run at a time
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx > 70) router.navigate('/closet');
          else if (g.dx < -70) router.navigate('/composer');
        },
      }),
    [],
  );

  async function shoot() {
    if (!cam.current || busy) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const pic = await cam.current.takePictureAsync({ quality: 0.9 });
      if (!pic?.uri) throw new Error('Aucune image reçue de la caméra.');
      setPending(await shrink(pic.uri, pic.width, pic.height));
      router.push('/add');
    } catch (e) {
      Alert.alert('Photo impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function importPhoto() {
    try {
      const pic = await pickPhoto();
      if (!pic) return;
      setPending(pic);
      router.push('/add');
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
    }
  }

  if (!permission) return <View style={styles.root} />;
  if (!permission.granted)
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.eyebrow}>Bienvenue</Text>
        <Text style={styles.title}>Votre placard commence ici</Text>
        <Text style={styles.dim}>La caméra sert à photographier vos vêtements et votre tenue devant le miroir.</Text>
        <Pressable style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.75 : 1 }]} onPress={requestPermission} accessibilityRole="button">
          <Text style={styles.ctaText}>Autoriser la caméra</Text>
        </Pressable>
      </SafeAreaView>
    );

  const last = items[0];
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <View>
          <Text style={styles.eyebrow}>Nouvelle pièce</Text>
          <Text style={styles.count}>{items.length ? `${items.length} dans le placard` : 'Placard vide'}</Text>
        </View>
        <Pressable onPress={() => router.push('/mirror')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Mirror Check" style={styles.topBtn}>
          <Icon name="mirror" color={C.text} size={20} />
          <Text style={styles.topBtnText}>Miroir</Text>
        </Pressable>
      </View>

      <View style={styles.viewfinder} {...swipe.panHandlers}>
        <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" active={focused} />
        <View style={[styles.corner, { top: '12%', left: '10%', borderRightWidth: 0, borderBottomWidth: 0 }]} />
        <View style={[styles.corner, { top: '12%', right: '10%', borderLeftWidth: 0, borderBottomWidth: 0 }]} />
        <View style={[styles.corner, { bottom: '14%', left: '10%', borderRightWidth: 0, borderTopWidth: 0 }]} />
        <View style={[styles.corner, { bottom: '14%', right: '10%', borderLeftWidth: 0, borderTopWidth: 0 }]} />
        <Text style={styles.hint}>Posez la pièce à plat, à la lumière du jour</Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.side} onPress={importPhoto} accessibilityRole="button" accessibilityLabel="Importer une photo depuis la galerie">
          <View style={styles.round}>
            <Icon name="image" color={C.text} />
          </View>
          <Text style={styles.sideText}>Galerie</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.shutter, { transform: [{ scale: pressed ? 0.94 : 1 }] }]} onPress={shoot} disabled={busy} accessibilityLabel="Prendre la photo">
          {busy ? <ActivityIndicator color={C.background} /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Pressable style={styles.side} onPress={() => router.navigate('/closet')} accessibilityRole="button" accessibilityLabel="Ouvrir le placard">
          <View style={[styles.round, { overflow: 'hidden' }]}>
            {last ? <Image source={{ uri: last.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="closet" color={C.text} />}
          </View>
          <Text style={styles.sideText}>Placard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },
  title: { color: C.text, fontSize: 32, lineHeight: 38, fontFamily: Fonts.display, textAlign: 'center' },
  dim: { color: C.dim, textAlign: 'center', lineHeight: 20, fontFamily: Fonts.body },
  cta: { backgroundColor: C.text, height: 52, paddingHorizontal: 28, justifyContent: 'center', marginTop: 10, borderRadius: 2 },
  ctaText: { color: C.background, fontFamily: Fonts.semibold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  eyebrow: { color: C.text, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', fontFamily: Fonts.semibold },
  count: { color: C.dim, fontSize: 12, marginTop: 3, fontFamily: Fonts.body },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, height: 36, borderRadius: 18 },
  topBtnText: { color: C.text, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: Fonts.medium },
  viewfinder: { flex: 1, marginHorizontal: 10, borderRadius: 4, overflow: 'hidden', backgroundColor: '#111' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: C.text, borderWidth: 1, opacity: 0.9 },
  hint: { position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: C.dim, fontSize: 12, fontFamily: Fonts.body },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, paddingVertical: 18 },
  side: { alignItems: 'center', gap: 6, width: 64 },
  round: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  sideText: { color: C.dim, fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: Fonts.medium },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: C.text, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.text },
});
