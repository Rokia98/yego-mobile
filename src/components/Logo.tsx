import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../theme';

// Reproduction vectorielle du logo Yègo (public/assets/yego_icon.svg) :
// une épingle de localisation orange traversée d'une route.

type Props = {
  size?: number; // hauteur de l'épingle en points
  wordmark?: boolean; // afficher « Yègo » à côté
  tone?: 'clair' | 'sombre'; // « clair » = texte foncé (fond clair), « sombre » = texte blanc
};

export function PinIcon({ size = 40 }: { size?: number }) {
  // viewBox d'origine : 110 × 118
  const width = (size * 110) / 118;
  return (
    <Svg width={width} height={size} viewBox="0 0 110 118">
      <Path
        d="M55 0 C 25 0, 0 24, 0 55 C 0 95, 55 118, 55 118 C 55 118, 110 95, 110 55 C 110 24, 85 0, 55 0 Z"
        fill={COLORS.orange}
      />
      <Circle cx={55} cy={52} r={30} fill={COLORS.white} />
      <Path
        d="M30 60 C 42 40, 68 40, 80 60"
        stroke={COLORS.dark}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={30} cy={60} r={5} fill={COLORS.dark} />
      <Circle cx={80} cy={60} r={5} fill={COLORS.dark} />
    </Svg>
  );
}

export default function Logo({ size = 40, wordmark = true, tone = 'clair' }: Props) {
  const couleurTexte = tone === 'sombre' ? COLORS.white : COLORS.dark;
  return (
    <View style={styles.rangee}>
      <PinIcon size={size} />
      {wordmark && (
        <Text style={[styles.mot, { fontSize: size * 0.78, color: couleurTexte }]}>
          Y<Text style={{ color: COLORS.orange }}>è</Text>go
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mot: { fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false },
});
