import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressableScale from './PressableScale';
import { COLORS, RADIUS } from '../theme';
import { vibrer } from '../haptics';

type Props = {
  capacite: number;
  occupes: string[];
  selection: string[];
  max: number;
  onToggle: (siege: string) => void;
  /** marge horizontale totale de l'écran parent (padding gauche + droite) */
  insetHorizontal?: number;
  t: { avantDuBus: string; libre: string; votrePlace: string; occupe: string };
};

const GAP = 8;
const LARGEUR_COULOIR = 26;

// Plan 2 + couloir + 2, sièges numérotés de 1 à `capacite` en balayant chaque
// rangée de gauche à droite. Entièrement dimensionné à partir de la largeur
// d'écran → lisible du petit téléphone à la tablette.
export default function PlanBus({
  capacite,
  occupes,
  selection,
  max,
  onToggle,
  insetHorizontal = 40,
  t,
}: Props) {
  const { width } = useWindowDimensions();

  const taille = useMemo(() => {
    const utile = width - insetHorizontal - 32; // 32 = padding interne du cadre
    const brut = (utile - LARGEUR_COULOIR - GAP * 4) / 4;
    return Math.max(30, Math.min(46, Math.floor(brut)));
  }, [width, insetHorizontal]);

  const rangees = useMemo(() => {
    const occ = new Set(occupes);
    const sel = new Set(selection);
    const nbRangees = Math.ceil(capacite / 4);
    return Array.from({ length: nbRangees }, (_, r) =>
      [0, 1, 2, 3]
        .map((c) => r * 4 + c + 1)
        .filter((n) => n <= capacite)
        .map((n) => {
          const num = String(n);
          return {
            num,
            etat: occ.has(num) ? 'occupe' : sel.has(num) ? 'selection' : 'libre',
          } as const;
        }),
    );
  }, [capacite, occupes, selection]);

  function toucher(num: string, etat: string) {
    if (etat === 'occupe') {
      vibrer.erreur();
      return;
    }
    if (etat === 'libre' && selection.length >= max) {
      // remplace la plus ancienne sélection
      onToggle(selection[0]);
    }
    vibrer.selection();
    onToggle(num);
  }

  return (
    <View>
      <View style={styles.cadre}>
        <View style={styles.avant}>
          <Ionicons name="disc-outline" size={16} color={COLORS.gray} />
          <Text style={styles.avantTexte}>{t.avantDuBus}</Text>
        </View>

        {rangees.map((rangee, i) => (
          <View key={i} style={styles.rangee}>
            {rangee.map((siege, j) => (
              <React.Fragment key={siege.num}>
                <Siege siege={siege} taille={taille} onPress={() => toucher(siege.num, siege.etat)} />
                {j === 1 && <View style={{ width: LARGEUR_COULOIR }} />}
              </React.Fragment>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legende}>
        <Puce style={styles.libre} label={t.libre} />
        <Puce style={styles.selection} label={t.votrePlace} />
        <Puce style={styles.occupe} label={t.occupe} />
      </View>
    </View>
  );
}

function Siege({
  siege,
  taille,
  onPress,
}: {
  siege: { num: string; etat: 'occupe' | 'selection' | 'libre' };
  taille: number;
  onPress: () => void;
}) {
  const dims = { width: taille, height: taille, borderRadius: Math.round(taille * 0.28) };
  const etatStyle =
    siege.etat === 'occupe' ? styles.occupe : siege.etat === 'selection' ? styles.selection : styles.libre;
  return (
    <PressableScale
      onPress={onPress}
      echelle={siege.etat === 'occupe' ? 1 : 0.9}
      style={[styles.siege, dims, etatStyle]}
    >
      <Text style={[styles.siegeTexte, siege.etat === 'selection' && styles.siegeTexteSel]}>
        {siege.num}
      </Text>
    </PressableScale>
  );
}

function Puce({ style, label }: { style: object; label: string }) {
  return (
    <View style={styles.legendeItem}>
      <View style={[styles.legendePuce, style]} />
      <Text style={styles.legendeTexte}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  avant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderStyle: 'dashed',
  },
  avantTexte: { fontSize: 11, color: COLORS.gray, fontWeight: '600' },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: GAP, marginBottom: GAP },
  siege: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  libre: { backgroundColor: COLORS.white, borderColor: COLORS.grayClair },
  selection: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  occupe: { backgroundColor: COLORS.border, borderColor: COLORS.border },
  siegeTexte: { fontSize: 12, fontWeight: '700', color: COLORS.dark },
  siegeTexteSel: { color: COLORS.white },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
  },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendePuce: { width: 14, height: 14, borderRadius: 5, borderWidth: 1.5 },
  legendeTexte: { fontSize: 12, color: COLORS.gray },
});
