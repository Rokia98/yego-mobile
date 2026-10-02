import React from 'react';
import { Image, View, Text, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';
import { COLORS } from '../theme';
import type { MoyenPaiement } from '../api/types';

// Marques des opérateurs (PNG générés par scripts/generate-logos-paiement.mjs
// à partir des logos officiels — voir assets/paiements/).
const LOGOS: Partial<Record<MoyenPaiement, ReturnType<typeof require>>> = {
  orange_money: require('../../assets/paiements/orange.png'),
  mtn_money: require('../../assets/paiements/mtn.png'),
  moov_money: require('../../assets/paiements/moov-money.png'),
  wave: require('../../assets/paiements/wave.png'),
};

// Djamo (ajouté avec Jèko, yego-api 0.28.0) n'a pas encore de logo officiel
// intégré — repli monogramme coloré en attendant un vrai asset (voir le
// script generate-logos-paiement.mjs pour l'ajouter proprement).
const COULEUR_REPLI: Partial<Record<MoyenPaiement, string>> = {
  djamo: '#5B2EFF',
};

export default function LogoPaiement({
  moyen,
  taille = 34,
  style,
}: {
  moyen: MoyenPaiement;
  taille?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const source = LOGOS[moyen];

  if (!source) {
    return (
      <View
        style={[
          styles.repli,
          {
            width: taille,
            height: taille,
            borderRadius: 8,
            backgroundColor: COULEUR_REPLI[moyen] ?? COLORS.dark,
          },
          style,
        ]}
      >
        <Text style={[styles.repliTexte, { fontSize: taille * 0.3 }]}>{moyen.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[{ width: taille, height: taille }, styles.image, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 8 },
  repli: { alignItems: 'center', justifyContent: 'center' },
  repliTexte: { color: COLORS.white, fontWeight: '800', letterSpacing: 0.3 },
});
