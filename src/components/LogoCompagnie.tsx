import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../theme';
import type { CompagnieBref } from '../api/types';

// Couleurs de repli pour le monogramme (fond plein, texte blanc lisible).
const PALETTE = ['#2C3E50', '#E67E22', '#16A085', '#8E44AD', '#2980B9', '#C0392B', '#D68910'];

function monogramme(nom: string): string {
  return nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');
}

function couleur(cle: string): string {
  let h = 0;
  for (let i = 0; i < cle.length; i++) h = (h * 31 + cle.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

type Props = {
  compagnie: Pick<CompagnieBref, 'nom'> & Partial<Pick<CompagnieBref, 'id' | 'logoUrl'>>;
  taille?: number;
  style?: StyleProp<ViewStyle>;
};

// Logo d'une compagnie : image `logoUrl` si disponible, sinon monogramme coloré.
export default function LogoCompagnie({ compagnie, taille = 40, style }: Props) {
  const [erreurImage, setErreurImage] = useState(false);
  const rayon = Math.round(taille * 0.28);
  const url = compagnie.logoUrl;
  const afficheImage = !!url && !erreurImage;

  return (
    <View
      style={[
        styles.base,
        {
          width: taille,
          height: taille,
          borderRadius: rayon,
          backgroundColor: afficheImage
            ? COLORS.white
            : couleur(String(compagnie.id ?? compagnie.nom)),
        },
        afficheImage && styles.cadreImage,
        style,
      ]}
    >
      {afficheImage ? (
        <Image
          source={{ uri: url as string }}
          style={{ width: taille - 8, height: taille - 8, borderRadius: rayon - 2 }}
          resizeMode="contain"
          onError={() => setErreurImage(true)}
        />
      ) : (
        <Text style={[styles.mono, { fontSize: Math.max(11, taille * 0.36) }]}>
          {monogramme(compagnie.nom) || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cadreImage: { borderWidth: 1, borderColor: COLORS.border },
  mono: { color: COLORS.white, fontWeight: '800', letterSpacing: 0.3 },
});

export { monogramme, couleur as couleurCompagnie };
