import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, RADIUS } from '../theme';

type Variante = 'primaire' | 'secondaire' | 'fantome';
type Taille = 'md' | 'lg';

type Props = {
  titre: string;
  onPress: () => void;
  variante?: Variante;
  taille?: Taille;
  chargement?: boolean;
  desactive?: boolean;
  pleineLargeur?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  titre,
  onPress,
  variante = 'primaire',
  taille = 'lg',
  chargement = false,
  desactive = false,
  pleineLargeur = true,
  icone,
  style,
}: Props) {
  const inactif = desactive || chargement;
  // Désactivé « en attente » (pas en chargement) : fond neutre net plutôt qu'orange délavé.
  const bloque = desactive && !chargement;
  const couleurTexte = bloque
    ? COLORS.grayClair
    : variante === 'primaire'
      ? COLORS.white
      : COLORS.orange;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactif}
      haptique
      echelle={0.96}
      opaciteDesactive={bloque ? 1 : chargement ? 0.85 : 0.45}
      style={[
        styles.base,
        taille === 'lg' ? styles.lg : styles.md,
        variantes[variante],
        bloque && styles.bloque,
        pleineLargeur && styles.pleineLargeur,
        style,
      ]}
    >
      <View style={styles.contenu}>
        {chargement ? (
          <ActivityIndicator color={couleurTexte} />
        ) : (
          <>
            {icone && <Ionicons name={icone} size={18} color={couleurTexte} />}
            <Text style={[styles.texte, { color: couleurTexte }]}>{titre}</Text>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  pleineLargeur: { alignSelf: 'stretch' },
  md: { paddingVertical: 12, paddingHorizontal: 18 },
  lg: { paddingVertical: 16, paddingHorizontal: 22 },
  contenu: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 22 },
  texte: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  bloque: { backgroundColor: '#E9ECEF', borderWidth: 0 },
});

const variantes = StyleSheet.create({
  primaire: { backgroundColor: COLORS.orange },
  secondaire: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.orange },
  fantome: { backgroundColor: 'transparent' },
});
