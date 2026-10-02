import React, { useState } from 'react';
import { Text, Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS } from '../theme';

function initiales(nom?: string | null): string {
  if (!nom) return '?';
  // si ça ressemble à un e-mail ou un numéro, on prend le début lisible
  let base = nom.trim();
  if (base.includes('@')) base = base.split('@')[0];
  base = base.replace(/[^\p{L}\s]/gu, ' ').trim();
  const mots = base.split(/\s+/).filter(Boolean);
  if (mots.length === 0) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

export default function Avatar({
  nom,
  photoUri,
  taille = 36,
  ton = 'defaut',
  style,
}: {
  nom?: string | null;
  /** Photo de profil (locale ou distante) ; repli sur les initiales si absente/en échec. */
  photoUri?: string | null;
  taille?: number;
  /** 'sombre' = fond orange, pour un usage sur fond foncé */
  ton?: 'defaut' | 'sombre';
  style?: StyleProp<ViewStyle>;
}) {
  const [erreurImage, setErreurImage] = useState(false);
  const afficherPhoto = !!photoUri && !erreurImage;

  return (
    <View
      style={[
        styles.cercle,
        ton === 'sombre' && styles.cercleSombre,
        { width: taille, height: taille, borderRadius: taille / 2 },
        style,
      ]}
    >
      {afficherPhoto ? (
        <Image
          source={{ uri: photoUri as string }}
          style={{ width: taille, height: taille, borderRadius: taille / 2 }}
          onError={() => setErreurImage(true)}
        />
      ) : (
        <Text style={[styles.texte, { fontSize: taille * 0.36 }]}>{initiales(nom)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cercle: {
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cercleSombre: { backgroundColor: COLORS.orange },
  texte: {
    color: COLORS.white,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
});
