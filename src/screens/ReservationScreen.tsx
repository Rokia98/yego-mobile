import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, RADIUS, SPACING } from '../theme';
import Button from '../components/Button';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import BoutonRetour from '../components/BoutonRetour';
import LogoCompagnie from '../components/LogoCompagnie';
import { rechercherDeparts } from '../api/departs';
import { extraireMessage } from '../api/erreurs';
import {
  ajouterJours,
  formatDateCourt,
  formatHeure,
  formatJourSection,
  formatPrix,
  montant,
} from '../format';
import { vibrer } from '../haptics';
import { useLangue } from '../i18n';
import type { DepartResultat } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reservation'>;

// L'API filtre les départs sur une fourchette de dates ; on demande la date
// choisie + quelques semaines pour couvrir les horaires clairsemés.
const FENETRE_RECHERCHE_JOURS = 60;

function Skeleton() {
  const p = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(p, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(p, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    ).start();
  }, [p]);
  return (
    <View style={styles.liste}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Animated.View key={i} style={[styles.carte, styles.skelCarte, { opacity: p }]}>
          <View style={styles.skelRow}>
            <View style={[styles.skelBloc, { width: 68, height: 22 }]} />
            <View style={[styles.skelBloc, { width: 88, height: 16 }]} />
          </View>
          <View style={[styles.skelRow, { marginTop: 12 }]}>
            <View style={[styles.skelBloc, { width: 150, height: 14 }]} />
            <View style={[styles.skelBloc, { width: 54, height: 14 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export default function ReservationScreen({ route, navigation }: Props) {
  const { t, locale } = useLangue();
  const { depart, arrivee, date, passagers } = route.params;
  const [departs, setDeparts] = useState<DepartResultat[]>([]);
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState<string | null>(null);

  async function charger() {
    setErreurRecherche(null);
    try {
      const liste = await rechercherDeparts({
        depart,
        arrivee,
        date,
        dateFin: ajouterJours(date, FENETRE_RECHERCHE_JOURS),
      });
      setDeparts(
        [...liste].sort(
          (a, b) =>
            a.dateDepart.localeCompare(b.dateDepart) ||
            a.trajet.heureDepart.localeCompare(b.trajet.heureDepart),
        ),
      );
    } catch (e) {
      setDeparts([]);
      setErreurRecherche(extraireMessage(e));
    }
  }

  useEffect(() => {
    setChargement(true);
    charger().finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depart, arrivee, date]);

  const sections = useMemo(() => {
    const parJour = new Map<string, DepartResultat[]>();
    for (const d of departs) {
      const cle = d.dateDepart.slice(0, 10);
      const groupe = parJour.get(cle);
      if (groupe) groupe.push(d);
      else parJour.set(cle, [d]);
    }
    return [...parJour.entries()].map(([jour, data]) => ({ jour, data }));
  }, [departs]);

  function allerAuxPlaces() {
    const choisi = departs.find((d) => d.id === selectionId);
    if (!choisi) return;
    navigation.navigate('ChoixPlaces', {
      departId: choisi.id,
      passagers,
      prixUnitaire: montant(choisi.trajet.prix),
      compagnie: choisi.trajet.compagnie.nom,
      route: `${choisi.trajet.villeDepart.nom} → ${choisi.trajet.villeArrivee.nom}`,
      dateDepart: choisi.dateDepart,
      heureDepart: choisi.trajet.heureDepart,
    });
  }

  const compte = departs.length;
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.bande, { paddingTop: insets.top + 6 }]}>
        <View style={styles.bandeHaut}>
          <BoutonRetour ton="sombre" />
          <PressableScale style={styles.modifier} haptique onPress={() => navigation.goBack()}>
            <Ionicons name="create-outline" size={14} color={COLORS.white} />
            <Text style={styles.modifierTexte}>{t.reservation.modifier}</Text>
          </PressableScale>
        </View>

        <View style={styles.bandeRoute}>
          <Text style={styles.bVille} numberOfLines={1}>
            {depart}
          </Text>
          <Ionicons name="arrow-forward" size={17} color={COLORS.orange} />
          <Text style={styles.bVille} numberOfLines={1}>
            {arrivee}
          </Text>
        </View>
        <Text style={styles.bMeta} numberOfLines={1}>
          {chargement
            ? t.reservation.rechercheEnCours
            : `${formatDateCourt(date, locale)} · ${t.commun.nVoyageurs(passagers)}` +
              (compte > 0 ? ` · ${t.commun.nTrajets(compte)}` : '')}
        </Text>
      </View>

      {chargement ? (
        <Skeleton />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={rafraichit}
              onRefresh={() => {
                setRafraichit(true);
                charger().finally(() => setRafraichit(false));
              }}
              tintColor={COLORS.orange}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitre}>{formatJourSection(section.jour, locale)}</Text>
          )}
          ListEmptyComponent={
            <FadeIn style={styles.videBloc}>
              <View style={styles.videIcone}>
                <Ionicons
                  name={erreurRecherche ? 'cloud-offline-outline' : 'bus-outline'}
                  size={34}
                  color={COLORS.grayClair}
                />
              </View>
              <Text style={styles.videTitre}>
                {erreurRecherche ? t.reservation.rechercheImpossible : t.reservation.aucunTrajetTrouve}
              </Text>
              <Text style={styles.vide}>
                {erreurRecherche ??
                  t.reservation.rienPour(depart, arrivee, formatDateCourt(date, locale).toLowerCase())}
              </Text>
              <Button
                titre={erreurRecherche ? t.commun.reessayer : t.reservation.modifierRecherche}
                variante="secondaire"
                pleineLargeur={false}
                onPress={() => {
                  if (erreurRecherche) {
                    setChargement(true);
                    charger().finally(() => setChargement(false));
                  } else {
                    navigation.goBack();
                  }
                }}
              />
            </FadeIn>
          }
          renderItem={({ item, index }) => {
            const selectionne = item.id === selectionId;
            const complet = item.placesDisponibles < passagers;
            const restantes = item.placesDisponibles;
            const presquePlein = !complet && restantes <= 5;
            return (
              <FadeIn delai={Math.min(index * 45, 260)}>
                <PressableScale
                  disabled={complet}
                  onPress={() => {
                    vibrer.selection();
                    setSelectionId(item.id);
                  }}
                  style={[styles.carte, selectionne && styles.carteSelectionnee]}
                >
                  <View style={styles.ligneHaut}>
                    <View style={styles.heureBloc}>
                      <Text style={styles.heure}>{formatHeure(item.trajet.heureDepart, locale)}</Text>
                      <Text style={styles.heureLabel}>{t.recherche.depart}</Text>
                    </View>
                    <View style={styles.prixBloc}>
                      <Text style={styles.prix}>{formatPrix(item.trajet.prix, locale)}</Text>
                      <Text style={styles.prixNote}>{t.reservation.parPlace}</Text>
                    </View>
                  </View>

                  <View style={styles.ligneBas}>
                    <View style={styles.compagnie}>
                      <LogoCompagnie compagnie={item.trajet.compagnie} taille={28} />
                      <Text style={styles.compagnieNom} numberOfLines={1}>
                        {item.trajet.compagnie.nom}
                      </Text>
                    </View>

                    {selectionne ? (
                      <View style={styles.pastilleChoisi}>
                        <Ionicons name="checkmark" size={12} color={COLORS.white} />
                        <Text style={styles.pastilleChoisiTexte}>{t.reservation.choisi}</Text>
                      </View>
                    ) : complet ? (
                      <Text style={[styles.places, styles.placesRouge]}>{t.reservation.complet}</Text>
                    ) : (
                      <Text style={[styles.places, presquePlein && styles.placesChaud]}>
                        {presquePlein ? t.reservation.placesRestantes(restantes) : t.commun.nPlaces(restantes)}
                      </Text>
                    )}
                  </View>
                </PressableScale>
              </FadeIn>
            );
          }}
        />
      )}

      <View style={styles.pied}>
        {selectionId != null && (
          <Text style={styles.piedInfo}>
            {t.reservation.departSelectionne} · {t.commun.nVoyageurs(passagers)}
          </Text>
        )}
        <Button
          titre={t.reservation.choisirLesPlaces}
          icone="arrow-forward"
          onPress={allerAuxPlaces}
          desactive={!selectionId}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  bande: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bandeHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modifier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modifierTexte: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  bandeRoute: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  bVille: { fontSize: 21, fontWeight: '800', color: COLORS.white, flexShrink: 1 },
  bMeta: { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 6 },

  liste: { padding: SPACING.lg, paddingTop: SPACING.md, flexGrow: 1 },
  sectionTitre: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },

  videBloc: { marginTop: 44, alignItems: 'center', gap: 10, paddingHorizontal: SPACING.xl },
  videIcone: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  videTitre: { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  vide: { textAlign: 'center', color: COLORS.gray, lineHeight: 20, marginBottom: 8 },

  carte: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 10,
    gap: 12,
  },
  carteSelectionnee: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeWash },

  ligneHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heureBloc: {},
  heure: { fontSize: 22, fontWeight: '800', color: COLORS.dark, letterSpacing: -0.5, lineHeight: 24 },
  heureLabel: { fontSize: 10, color: COLORS.grayClair, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  prixBloc: { alignItems: 'flex-end' },
  prix: { fontSize: 16, fontWeight: '800', color: COLORS.orange },
  prixNote: { fontSize: 10, color: COLORS.grayClair, marginTop: 1 },

  ligneBas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  compagnie: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  compagnieNom: { fontSize: 14, fontWeight: '700', color: COLORS.dark, flexShrink: 1 },

  places: { fontSize: 12, color: COLORS.gray, fontWeight: '600', flexShrink: 0 },
  placesChaud: { color: COLORS.orange },
  placesRouge: { color: COLORS.danger },
  pastilleChoisi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pastilleChoisiTexte: { color: COLORS.white, fontSize: 11, fontWeight: '800' },

  skelCarte: { borderColor: COLORS.border },
  skelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  skelBloc: { backgroundColor: COLORS.border, borderRadius: 6 },

  pied: {
    padding: SPACING.lg,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  piedInfo: { fontSize: 12, color: COLORS.gray, textAlign: 'center' },
});
