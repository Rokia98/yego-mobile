import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme';

type Props = TextInputProps & {
  label: string;
  erreur?: string | null;
  icone?: keyof typeof Ionicons.glyphMap;
  avant?: React.ReactNode;
  apres?: React.ReactNode;
};

// Champ de saisie avec libellé, icône optionnelle, bordure animée au focus, erreur.
export default function Field({ label, erreur, icone, avant, apres, style, onFocus, onBlur, ...reste }: Props) {
  const [actif, setActif] = useState(false);
  const t = useRef(new Animated.Value(0)).current;

  const anime = (vers: number) =>
    Animated.timing(t, { toValue: vers, duration: 140, useNativeDriver: false }).start();

  const couleurBordure = erreur
    ? COLORS.danger
    : t.interpolate({ inputRange: [0, 1], outputRange: [COLORS.border, COLORS.orange] });

  return (
    <View style={styles.bloc}>
      <Text style={[styles.label, actif && styles.labelActif]}>{label}</Text>
      <Animated.View style={[styles.enveloppe, { borderColor: couleurBordure }]}>
        {icone && (
          <Ionicons
            name={icone}
            size={18}
            color={actif ? COLORS.orange : COLORS.grayClair}
            style={styles.icone}
          />
        )}
        {avant ? <View style={styles.avant}>{avant}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.grayClair}
          onFocus={(e) => {
            setActif(true);
            anime(1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setActif(false);
            anime(0);
            onBlur?.(e);
          }}
          {...reste}
        />
        {apres ? <View style={styles.apres}>{apres}</View> : null}
      </Animated.View>
      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { marginBottom: 14 },
  label: { fontSize: 13, color: COLORS.gray, marginBottom: 6, fontWeight: '600' },
  labelActif: { color: COLORS.orange },
  enveloppe: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
  },
  icone: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.dark },
  avant: { paddingRight: 8, marginRight: 8, borderRightWidth: 1, borderRightColor: COLORS.border },
  apres: { paddingLeft: 6 },
  erreur: { color: COLORS.danger, fontSize: 12, marginTop: 5 },
});
