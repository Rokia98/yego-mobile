import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Logo from '../components/Logo';
import Button from '../components/Button';
import {
  IllustrationRecherche,
  IllustrationPaiement,
  IllustrationTicket,
} from '../components/illustrations';
import { COLORS } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { useLangue } from '../i18n';
import { vibrer } from '../haptics';

type Slide = {
  cle: string;
  Illustration: (p: { size?: number }) => React.JSX.Element;
  titre: string;
  texte: string;
};

const ILLUSTRATIONS = [IllustrationRecherche, IllustrationPaiement, IllustrationTicket];

export default function OnboardingScreen() {
  const { terminerOnboarding } = useAuth();
  const { t } = useLangue();
  const { width } = useWindowDimensions();
  const SLIDES: Slide[] = t.onboarding.slides.map((s, i) => ({
    cle: String(i),
    Illustration: ILLUSTRATIONS[i],
    titre: s.titre,
    texte: s.texte,
  }));
  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const dernier = index === SLIDES.length - 1;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
      vibrer.selection();
    }
  }

  function suivant() {
    if (dernier) {
      vibrer.succes();
      terminerOnboarding();
    } else {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    }
  }

  return (
    <SafeAreaView style={styles.conteneur}>
      <View style={styles.haut}>
        <Logo size={30} />
        <TouchableOpacity onPress={terminerOnboarding} hitSlop={12}>
          <Text style={styles.passer}>{t.onboarding.passer}</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false, // on anime aussi la largeur des puces
        })}
        onMomentumScrollEnd={onScrollEnd}
      >
        {SLIDES.map((slide, i) => {
          const entree = [(i - 1) * width, i * width, (i + 1) * width];
          const illuDecalage = scrollX.interpolate({
            inputRange: entree,
            outputRange: [width * 0.3, 0, -width * 0.3],
            extrapolate: 'clamp',
          });
          const texteDecalage = scrollX.interpolate({
            inputRange: entree,
            outputRange: [width * 0.5, 0, -width * 0.5],
            extrapolate: 'clamp',
          });
          const opacite = scrollX.interpolate({
            inputRange: entree,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          return (
            <View key={slide.cle} style={[styles.slide, { width }]}>
              <Animated.View
                style={[styles.illu, { opacity: opacite, transform: [{ translateX: illuDecalage }] }]}
              >
                <slide.Illustration size={Math.min(width - 80, 300)} />
              </Animated.View>
              <Animated.View style={{ opacity: opacite, transform: [{ translateX: texteDecalage }] }}>
                <Text style={styles.titre}>{slide.titre}</Text>
                <Text style={styles.texte}>{slide.texte}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={styles.bas}>
        <View style={styles.points}>
          {SLIDES.map((s, i) => {
            const entree = [(i - 1) * width, i * width, (i + 1) * width];
            const largeur = scrollX.interpolate({
              inputRange: entree,
              outputRange: [7, 22, 7],
              extrapolate: 'clamp',
            });
            const opacite = scrollX.interpolate({
              inputRange: entree,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={s.cle}
                style={[styles.point, { width: largeur, opacity: opacite }]}
              />
            );
          })}
        </View>

        <Button titre={dernier ? t.onboarding.commencer : t.onboarding.suivant} onPress={suivant} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COLORS.background },
  haut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  passer: { color: COLORS.gray, fontSize: 14, fontWeight: '500' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  illu: {
    width: '100%',
    aspectRatio: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  titre: { fontSize: 24, fontWeight: '700', color: COLORS.dark, textAlign: 'center', marginBottom: 12 },
  texte: { fontSize: 15, lineHeight: 22, color: COLORS.gray, textAlign: 'center' },
  bas: { paddingHorizontal: 24, paddingBottom: 12, gap: 22 },
  points: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 8 },
  point: { height: 7, borderRadius: 4, backgroundColor: COLORS.orange },
});
