import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, SHADOW } from '../theme';

type Props = {
  /** 'back' pour une pile (chevron gauche), 'down' pour une feuille modale */
  icone?: 'back' | 'down';
  /** 'sombre' quand posé sur un fond foncé (caméra, bandeau) */
  ton?: 'clair' | 'sombre';
  onPress?: () => void;
};

// Bouton de navigation arrière unifié : pastille ronde, retour haptique,
// grande zone tactile. Se masque de lui-même s'il n'y a nulle part où revenir.
export default function BoutonRetour({ icone = 'back', ton = 'clair', onPress }: Props) {
  const navigation = useNavigation();
  if (!onPress && !navigation.canGoBack()) return null;

  const sombre = ton === 'sombre';
  return (
    <PressableScale
      onPress={onPress ?? (() => navigation.goBack())}
      haptique
      echelle={0.9}
      hitSlop={12}
      accessibilityLabel="Retour"
      style={[styles.bouton, sombre ? styles.sombre : styles.clair]}
    >
      <Ionicons
        name={icone === 'down' ? 'chevron-down' : 'chevron-back'}
        size={22}
        color={sombre ? COLORS.white : COLORS.dark}
        style={icone === 'back' ? styles.decalage : undefined}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bouton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clair: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW,
  },
  sombre: { backgroundColor: 'rgba(255,255,255,0.16)' },
  decalage: { marginLeft: -2 },
});
