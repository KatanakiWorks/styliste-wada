import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Mannequin } from '@/components/mannequin';
import { Mannequin3D } from '@/components/mannequin-3d';
import { Button, Chip, Eyebrow, H1, Header, IconButton, Screen, Swatch, T } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contextTips, getWeather, OCCASIONS, type Occasion, type Weather } from '@/lib/advice';
import { basicColorName, outfitsFor, outfitsOfTheDay, rankByTaste, SLOT_LABELS, SLOTS, styleNote, type Item, type Outfit, type Slot } from '@/lib/color';
import { NO_KEY, stylingTips } from '@/lib/gemini';
import { getHowTo, getLooks, getTaste, howToKey, keepLook, recordSwipe, saveHowTo, useCloset, useProfile } from '@/lib/store';
import { colorOf, COMBOS, hexOf, NEUTRALS } from '@/lib/wada';

/** Search words for an outfit, e.g. "chemise col cubain terracotta pantalon fluide kaki sabots marron tenue". */
const inspirationQuery = (o: Outfit) =>
  SLOTS.filter((s) => s !== 'accessory' && o.pick[s])
    .map((s) => `${o.pick[s]!.type} ${basicColorName(hexOf(o.pick[s]!.color))}`)
    .concat('tenue')
    .join(' ');

// Wada's rule of surfaces: how much of the silhouette each piece covers.
const SURFACE: Record<Slot, number> = { top: 38, bottom: 47, shoes: 10, accessory: 5 };

export default function ComposerScreen() {
  const t = useTheme();
  const items = useCloset();
  const { anchor: anchorParam } = useLocalSearchParams<{ anchor?: string }>();
  const [anchorId, setAnchorId] = useState(anchorParam);
  // no starting piece (or it was deleted): "outfit of the day" mode across the whole closet
  const anchor = items.find((i) => i.id === anchorId);
  const [occasion, setOccasion] = useState<Occasion>('date');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [idx, setIdx] = useState(0);
  const [kept, setKept] = useState(0);
  // a new ?anchor= (from the closet) restarts the deck around that piece
  const [lastParam, setLastParam] = useState(anchorParam);
  if (anchorParam !== lastParam) {
    setLastParam(anchorParam);
    setAnchorId(anchorParam);
    setIdx(0);
    setKept(0);
  }

  const { weather: useWeather } = useProfile();
  useEffect(() => {
    let live = true;
    // turned off in the settings: no location request, and any previous reading is cleared
    (useWeather ? getWeather() : Promise.resolve(null)).then((w) => live && setWeather(w));
    return () => {
      live = false;
    };
  }, [useWeather]);

  // pieces kept in the last 3 days count as recently worn
  const [since] = useState(() => Date.now() - 3 * 24 * 3600 * 1000);
  // taste and looks are read once per deck (not subscribed), so cards don't reshuffle while swiping
  const deck = useMemo(() => {
    const opts = { neutrals: NEUTRALS, hexOf: (n: string) => colorOf(n)?.hex };
    if (anchor) return rankByTaste(outfitsFor(anchor, items, COMBOS, { ...opts, limit: 50 }), getTaste()).slice(0, 10);
    const recent = new Set(getLooks().filter((l) => l.at > since).flatMap((l) => l.ids));
    return outfitsOfTheDay(items, COMBOS, opts, getTaste(), { temp: weather?.temp, rain: weather?.rain }, recent);
  }, [anchor, items, weather, since]);
  const missing = (['top', 'bottom'] as Slot[]).filter((s) => !items.some((i) => i.slot === s)).map((s) => SLOT_LABELS[s].toLowerCase());
  const current = deck[idx];

  function pickAnchor(id: string | undefined) {
    Haptics.selectionAsync();
    setAnchorId(id);
    setIdx(0);
    setKept(0);
  }
  function decide(dir: 1 | -1) {
    if (!current) return;
    if (dir > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordSwipe(current, dir > 0);
    if (dir > 0) {
      keepLook({ ids: Object.values(current.pick).map((i) => i!.id), combo: current.combo, occasion, at: Date.now() });
      setKept((k) => k + 1);
    }
    setIdx((i) => i + 1);
  }

  if (!items.length)
    return (
      <Screen>
        <Header eyebrow="Composer" title="Votre placard est vide" />
        <T muted>Ajoutez au moins un haut et un bas pour recevoir des tenues.</T>
        <Button primary icon="camera" label="Photographier une pièce" onPress={() => router.navigate('/')} />
      </Screen>
    );

  return (
    <Screen scroll={false}>
      <View style={styles.topRow}>
        <Eyebrow>{weather ? `Composer · ${weather.temp} °C, ${weather.label}` : 'Composer'}</Eyebrow>
        {deck.length ? <Eyebrow>{`${Math.min(idx + 1, deck.length)} / ${deck.length}`}</Eyebrow> : null}
      </View>

      <View style={{ gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.anchors}>
          <Pressable
            onPress={() => pickAnchor(undefined)}
            accessibilityRole="button"
            accessibilityLabel="Tenue du jour"
            accessibilityState={{ selected: !anchor }}
            style={[styles.anchor, styles.daily, { borderColor: !anchor ? t.text : t.line, backgroundColor: !anchor ? t.backgroundSelected : 'transparent' }]}>
            <Icon name="spark" size={18} color={!anchor ? t.onSelected : t.text} />
            <T style={{ fontSize: 9, fontFamily: Fonts.semibold, letterSpacing: 1, color: !anchor ? t.onSelected : t.text }}>DU JOUR</T>
          </Pressable>
          {items.map((i) => (
            <Pressable
              key={i.id}
              onPress={() => pickAnchor(i.id)}
              accessibilityLabel={i.type}
              accessibilityState={{ selected: i.id === anchor?.id }}
              style={[styles.anchor, { borderColor: i.id === anchor?.id ? t.text : 'transparent' }]}>
              <Image source={{ uri: i.photo }} style={[styles.anchorImg, { opacity: i.id === anchor?.id ? 1 : 0.55 }]} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
        <T style={styles.anchorName} numberOfLines={1}>
          {anchor ? anchor.type : 'Tenue du jour'}
        </T>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0 }}>
        {OCCASIONS.map(([k, label]) => (
          <Chip key={k} label={label} selected={occasion === k} onPress={() => setOccasion(k)} />
        ))}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {!deck.length ? (
          <View style={[styles.empty, { borderColor: t.line }]}>
            <T muted>
              {missing.length
                ? `Il manque au moins un ${missing.join(' et un ')} dans votre placard pour composer une tenue. Photographiez-en un depuis la caméra.`
                : anchor
                  ? `Aucune combinaison Wada ne réunit ${anchor.color} avec les autres pièces de votre placard. Choisissez une autre pièce de départ, ajoutez des pièces, ou ajoutez un basique (noir, blanc, denim…) qui va avec tout.`
                  : 'Aucune tenue complète pour aujourd’hui avec votre placard actuel. Ajoutez des pièces, ou un basique (noir, blanc, denim…) qui va avec tout.'}
            </T>
          </View>
        ) : !current ? (
          <View style={[styles.empty, { borderColor: t.line, alignItems: 'center' }]}>
            <Eyebrow>{`${deck.length} tenues vues`}</Eyebrow>
            <H1>{`${kept} gardée${kept > 1 ? 's' : ''}`}</H1>
            <Button primary label="Voir mes looks" onPress={() => router.navigate('/looks')} style={{ alignSelf: 'stretch' }} />
            <Button ghost label="Revoir les tenues" onPress={() => setIdx(0)} />
          </View>
        ) : (
          <>
            {deck[idx + 1] ? (
              <View style={[styles.card, styles.behind, { backgroundColor: t.background, borderColor: t.line }]} pointerEvents="none">
                <OutfitCard outfit={deck[idx + 1]} occasion={occasion} weather={weather} preview />
              </View>
            ) : null}
            <SwipeCard key={`${anchor?.id}-${idx}`} onDecide={decide}>
              <OutfitCard outfit={current} occasion={occasion} weather={weather} />
            </SwipeCard>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <IconButton icon="close" label="Passer cette tenue" onPress={() => decide(-1)} disabled={!current} />
        <Button
          icon="mirror"
          label="Essayer"
          onPress={() => router.push({ pathname: '/mirror', params: { look: current ? Object.values(current.pick).map((i) => i!.id).join(',') : '' } })}
          style={{ flex: 1 }}
        />
        <IconButton icon="check" label="Garder cette tenue" onPress={() => decide(1)} disabled={!current} primary />
      </View>
    </Screen>
  );
}

function SwipeCard({ children, onDecide }: { children: React.ReactNode; onDecide: (dir: 1 | -1) => void }) {
  const t = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  // the next card settles into place instead of popping in
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    // JS driver like the swipe: native and JS animations can't share one transform
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 60, useNativeDriver: false }).start();
  }, [enter]);
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const [gone, setGone] = useState<0 | 1 | -1>(0);
  const fired = useRef(false);
  useEffect(() => {
    if (gone && !fired.current) {
      fired.current = true;
      onDecide(gone);
    }
  }, [gone, onDecide]);
  const [responder] = useState(() =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: Animated.event([null, { dx: x }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 110) {
            const dir = g.dx > 0 ? 1 : -1;
            Animated.timing(x, { toValue: dir * 500, duration: 200, useNativeDriver: false }).start(() => setGone(dir));
          } else Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        },
      }),
  );
  const rotate = x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-10deg', '0deg', '10deg'] });
  const keep = x.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
  const pass = x.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.card, { backgroundColor: t.background, borderColor: t.line, transform: [{ translateX: x }, { rotate }, { scale }] }]}>
      {children}
      <Animated.Text style={[styles.stamp, { left: 16, color: t.text, borderColor: t.text, opacity: keep, transform: [{ rotate: '-8deg' }] }]}>Garder</Animated.Text>
      <Animated.Text style={[styles.stamp, { right: 16, color: t.text, borderColor: t.text, opacity: pass, transform: [{ rotate: '8deg' }] }]}>Passer</Animated.Text>
    </Animated.View>
  );
}

function Piece({ item, flex }: { item: Item; flex: number }) {
  const t = useTheme();
  return (
    <View style={[styles.piece, { flex, backgroundColor: t.backgroundElement }]}>
      <Image source={{ uri: item.photo }} style={StyleSheet.absoluteFill} contentFit="contain" />
      <View style={[styles.pieceLabel, { backgroundColor: t.background }]}>
        <Swatch hex={hexOf(item.color)} size={8} />
        <T numberOfLines={1} style={{ fontSize: 10, flexShrink: 1 }}>
          {item.type}
        </T>
      </View>
    </View>
  );
}

/** `preview`: the card waiting behind the top one, drawn in 2D to keep a single 3D view running. */
function OutfitCard({ outfit, occasion, weather, preview }: { outfit: Outfit; occasion: Occasion; weather: Weather | null; preview?: boolean }) {
  const t = useTheme();
  const p = outfit.pick;
  const pieces = SLOTS.flatMap((s) => (p[s] ? [p[s]!] : []));
  const occasionLabel = OCCASIONS.find(([k]) => k === occasion)?.[1] ?? '';
  const context = [occasionLabel, weather && `${weather.temp} °C, ${weather.label}`].filter(Boolean).join(', ');
  const tips = contextTips(outfit, occasion, weather);
  const { body, figure3d } = useProfile();
  const [view, setView] = useState<'figure' | 'pieces'>('figure');
  const cacheKey = howToKey(
    pieces.map((i) => i.id),
    context,
  );
  const [howTo, setHowTo] = useState<string[] | undefined>(() => getHowTo(cacheKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function askHowTo() {
    setLoading(true);
    setError('');
    try {
      const tips = await stylingTips(
        pieces.map((i) => ({ ...i, colorWord: basicColorName(hexOf(i.color)) })),
        context,
      );
      saveHowTo(cacheKey, tips);
      setHowTo(tips);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === NO_KEY ? 'Ajoutez votre clé Gemini dans Paramètres pour recevoir des conseils.' : `Conseils indisponibles : ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={styles.cardHead}>
        <Pressable onPress={() => router.push(`/palette/${outfit.combo}`)} accessibilityRole="link" hitSlop={8} style={{ flexShrink: 1, gap: 2 }}>
          <Eyebrow>Palette Wada</Eyebrow>
          <T style={styles.comboNo}>{`N° ${outfit.combo}`}</T>
        </Pressable>
        <View style={styles.toggle}>
          {(
            [
              ['figure', 'Silhouette'],
              ['pieces', 'Pièces'],
            ] as const
          ).map(([k, label]) => (
            <Pressable key={k} onPress={() => setView(k)} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: view === k }}>
              <Eyebrow style={view === k ? { color: t.text, textDecorationLine: 'underline' } : undefined}>{label}</Eyebrow>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.swatches}>
        {outfit.colors.map((c) => (
          <View key={c} style={{ flex: 1, backgroundColor: hexOf(c) }} />
        ))}
      </View>

      {view === 'figure' ? (
        // mannequin wearing the outfit's colours, real photos alongside
        <View style={styles.silhouette}>
          <View style={{ flex: 1 }}>
            {figure3d && !preview ? (
              <>
                <Mannequin3D pick={p} body={body} />
                <View style={styles.rotateHint} pointerEvents="none">
                  <Icon name="rotate" size={14} color={t.textSecondary} />
                  <Eyebrow style={{ fontSize: 9 }}>Glissez pour tourner</Eyebrow>
                </View>
              </>
            ) : (
              <Mannequin pick={p} body={body} />
            )}
          </View>
          <View style={styles.thumbs}>
            {pieces.map((i) => (
              <View key={i.id} style={[styles.thumb, { backgroundColor: t.backgroundElement }]}>
                <Image source={{ uri: i.photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={i.type} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        // pieces stacked as worn, heights following Wada's rule of surfaces
        <View style={styles.silhouette}>
          <View style={{ flex: 1, gap: 4 }}>
            {p.top ? <Piece item={p.top} flex={SURFACE.top} /> : null}
            {p.bottom ? <Piece item={p.bottom} flex={SURFACE.bottom} /> : null}
            {p.shoes ? <Piece item={p.shoes} flex={SURFACE.shoes + 8} /> : null}
          </View>
          {p.accessory ? (
            <View style={styles.side}>
              <Piece item={p.accessory} flex={1} />
            </View>
          ) : null}
        </View>
      )}

      <ScrollView style={styles.info} contentContainerStyle={{ gap: 6 }} nestedScrollEnabled>
        <T style={{ fontSize: 13 }}>{styleNote(pieces.map((i) => ({ name: basicColorName(hexOf(i.color)), hex: hexOf(i.color) })))}</T>
        {tips.map((tip) => (
          <T key={tip} muted style={{ fontSize: 12 }}>
            {tip}
          </T>
        ))}
        {howTo?.map((tip, i) => (
          <View key={tip} style={styles.howTo}>
            <T muted style={{ fontSize: 12, width: 14 }}>{String(i + 1)}</T>
            <T style={{ fontSize: 12.5, flex: 1 }}>{tip}</T>
          </View>
        ))}
        {error ? <T muted style={{ fontSize: 12 }}>{error}</T> : null}
        <View style={styles.cardLinks}>
          {!howTo ? (
            <Pressable onPress={askHowTo} disabled={loading} accessibilityRole="button" hitSlop={6} style={styles.cardLink}>
              {loading ? <ActivityIndicator size="small" /> : <Icon name="spark" size={16} color={t.text} />}
              <Eyebrow style={{ color: t.text }}>Comment le porter</Eyebrow>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => router.push({ pathname: '/inspiration', params: { q: inspirationQuery(outfit), ids: pieces.map((i) => i.id).join(','), context } })}
            accessibilityRole="link"
            hitSlop={6}
            style={styles.cardLink}>
            <Icon name="arrow" size={16} color={t.text} />
            <Eyebrow style={{ color: t.text }}>Inspirations</Eyebrow>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  anchors: { gap: 8 },
  anchor: { width: 52, height: 64, borderRadius: 2, borderWidth: 1.5, overflow: 'hidden' },
  anchorImg: { width: '100%', height: '100%' },
  daily: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1 },
  anchorName: { fontFamily: Fonts.displayItalic, fontSize: 22, lineHeight: 28, textTransform: 'capitalize' },
  empty: { flex: 1, borderWidth: 1, padding: 24, gap: 14, justifyContent: 'center' },
  card: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1, borderRadius: 4, padding: 16 },
  behind: { transform: [{ translateY: 8 }, { scale: 0.96 }], opacity: 0.6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 },
  comboNo: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 34 },
  swatches: { flexDirection: 'row', height: 6, overflow: 'hidden' },
  silhouette: { flex: 1, flexDirection: 'row', gap: 6, minHeight: 200 },
  side: { width: '30%', aspectRatio: 1, alignSelf: 'center' },
  toggle: { flexDirection: 'row', gap: 14, paddingBottom: 4 },
  rotateHint: { position: 'absolute', bottom: 2, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  thumbs: { width: 52, gap: 6, justifyContent: 'center' },
  thumb: { width: 52, height: 64, borderRadius: 2, overflow: 'hidden' },
  piece: { borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end', minHeight: 44 },
  pieceLabel: { margin: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2, alignSelf: 'flex-start', maxWidth: '92%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  info: { flexGrow: 0, maxHeight: '36%' },
  howTo: { flexDirection: 'row', gap: 6 },
  cardLinks: { flexDirection: 'row', gap: 20, paddingTop: 4 },
  cardLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stamp: { position: 'absolute', top: 18, borderWidth: 1.5, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 3, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingBottom: 10, alignItems: 'center' },
});
