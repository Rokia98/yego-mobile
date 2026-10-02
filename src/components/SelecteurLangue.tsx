import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PressableScale from './PressableScale';
import { useLangue, type Langue } from '../i18n';
import { COLORS, RADIUS } from '../theme';

// Sélecteur FR/EN générique — barre pleine largeur (variante par défaut, pour
// une carte) ou pastille compacte (variante 'compacte', pour un en-tête).
export default function SelecteurLangue({ compact = false }: { compact?: boolean }) {
  const { langue, definirLangue } = useLangue();

  return (
    <View style={[styles.ligne, compact && styles.ligneCompacte]}>
      {(['fr', 'en'] as const).map((l) => (
        <Option key={l} langue={l} actif={l === langue} compact={compact} onPress={definirLangue} />
      ))}
    </View>
  );
}

function Option({
  langue,
  actif,
  compact,
  onPress,
}: {
  langue: Langue;
  actif: boolean;
  compact: boolean;
  onPress: (l: Langue) => void;
}) {
  return (
    <PressableScale
      onPress={() => onPress(langue)}
      style={[
        styles.option,
        compact && styles.optionCompacte,
        actif && (compact ? styles.optionCompacteActive : styles.optionActive),
      ]}
    >
      <Text
        style={[
          compact ? styles.texteCompact : styles.texte,
          actif && (compact ? styles.texteCompactActif : styles.texteActif),
        ]}
      >
        {compact ? langue.toUpperCase() : langue === 'fr' ? 'Français' : 'English'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', gap: 4 },
  ligneCompacte: { gap: 2 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: RADIUS.sm },
  optionActive: { backgroundColor: COLORS.orangeWash },
  texte: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  texteActif: { color: COLORS.orange, fontWeight: '800' },

  optionCompacte: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  optionCompacteActive: { backgroundColor: COLORS.orangeWash },
  texteCompact: { fontSize: 11, fontWeight: '800', color: COLORS.grayClair, letterSpacing: 0.4 },
  texteCompactActif: { color: COLORS.orange },
});
