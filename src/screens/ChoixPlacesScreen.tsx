import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '../navigation/types';
import { COLORS, RADIUS } from '../theme';
import Card from '../components/Card';
import Button from '../components/Button';
import FadeIn from '../components/FadeIn';
import PlanBus from '../components/PlanBus';
import { siegesDepart } from '../api/departs';
import { reserver } from '../api/reservations';
import { extraireMessage } from '../api/erreurs';
import { formatDateCourt, formatHeure, formatPrix } from '../format';
import { useLangue } from '../i18n';
import { vibrer } from '../haptics';

type Props = StackScreenProps<'ChoixPlaces'>;

const INSET = 40; // padding horizontal de l'écran (20 + 20)

export default function ChoixPlacesScreen({ route, navigation }: Props) {
  const { t, locale } = useLangue();
  const { departId, passagers, prixUnitaire, compagnie, route: trajet, dateDepart, heureDepart } =
    route.params;

  const [capacite, setCapacite] = useState(0);
  const [occupes, setOccupes] = useState<string[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reservationEnCours, setReservationEnCours] = useState(false);

  const charger = useCallback(() => {
    setChargement(true);
    setErreur(null);
    siegesDepart(departId)
      .then((d) => {
        setCapacite(d.placesTotales);
        setOccupes(d.occupes);
      })
      .catch((e) => setErreur(extraireMessage(e)))
      .finally(() => setChargement(false));
  }, [departId]);

  useEffect(charger, [charger]);

  function basculer(siege: string) {
    setSelection((actuelle) =>
      actuelle.includes(siege)
        ? actuelle.filter((s) => s !== siege)
        : [...actuelle, siege].slice(-passagers),
    );
  }

  async function continuer() {
    if (selection.length !== passagers) return;
    const siegesChoisis = [...selection].sort((a, b) => Number(a) - Number(b));
    setErreur(null);
    setReservationEnCours(true);
    try {
      const reservation = await reserver(departId, passagers, siegesChoisis);
      vibrer.succes();
      navigation.replace('Paiement', {
        reservationId: reservation.id,
        nombrePlaces: reservation.nombrePlaces,
        montantEstime: prixUnitaire * passagers,
        sieges: reservation.sieges?.length ? reservation.sieges : siegesChoisis,
      });
    } catch (e) {
      vibrer.erreur();
      const statut = (e as { response?: { status?: number } }).response?.status;
      setErreur(extraireMessage(e));
      // Siège pris entre-temps : on rafraîchit le plan et on repart de zéro.
      if (statut === 409) {
        setSelection([]);
        charger();
      }
    } finally {
      setReservationEnCours(false);
    }
  }

  const complet = selection.length === passagers;
  const siegesTries = [...selection].sort((a, b) => Number(a) - Number(b));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <Card style={styles.recap} ombre>
          <Text style={styles.route}>{trajet}</Text>
          <Text style={styles.meta}>
            {compagnie} · {formatDateCourt(dateDepart, locale)} · {formatHeure(heureDepart, locale)}
          </Text>
        </Card>

        <Text style={styles.consigne}>
          {passagers === 1 ? t.choixPlaces.choisirPlace : t.choixPlaces.choisirPlaces(passagers)}
        </Text>

        {chargement ? (
          <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
        ) : erreur && capacite === 0 ? (
          <FadeIn style={styles.videBloc}>
            <Text style={styles.vide}>{erreur}</Text>
            <Button titre={t.commun.reessayer} variante="secondaire" pleineLargeur={false} onPress={charger} />
          </FadeIn>
        ) : (
          <FadeIn>
            <PlanBus
              capacite={capacite}
              occupes={occupes}
              selection={selection}
              max={passagers}
              onToggle={basculer}
              insetHorizontal={INSET}
              t={t.planBus}
            />
          </FadeIn>
        )}
      </ScrollView>

      <View style={styles.pied}>
        {erreur && capacite > 0 && <Text style={styles.erreur}>{erreur}</Text>}
        <View style={styles.piedLigne}>
          <View>
            <Text style={styles.piedLabel}>
              {selection.length} / {t.commun.nPlaces(passagers)}
            </Text>
            <Text style={styles.piedSieges} numberOfLines={1}>
              {complet ? t.choixPlaces.sieges(siegesTries.join(', ')) : t.choixPlaces.touchezSiegeLibre}
            </Text>
          </View>
          <Text style={styles.piedPrix}>{formatPrix(prixUnitaire * passagers, locale)}</Text>
        </View>
        <Button
          titre={reservationEnCours ? t.choixPlaces.reservationEnCours : t.choixPlaces.continuer}
          onPress={continuer}
          chargement={reservationEnCours}
          desactive={!complet}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { padding: 20, paddingBottom: 28 },
  recap: { padding: 16, marginBottom: 18 },
  route: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  meta: { fontSize: 13, color: COLORS.gray, marginTop: 3 },
  consigne: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginBottom: 14 },
  videBloc: { marginTop: 30, alignItems: 'center', gap: 16 },
  vide: { textAlign: 'center', color: COLORS.gray, paddingHorizontal: 10 },
  pied: {
    padding: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  piedLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  piedLabel: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  piedSieges: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  piedPrix: { fontSize: 18, fontWeight: '800', color: COLORS.orange },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center' },
});
