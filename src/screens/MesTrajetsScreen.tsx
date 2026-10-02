import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { TabScreenProps } from '../navigation/types';
import { COLORS, RADIUS } from '../theme';
import HeroHeader from '../components/HeroHeader';
import Card from '../components/Card';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import { mesReservations, annuler } from '../api/reservations';
import { remboursementDeReservation } from '../api/remboursements';
import { tableVilles } from '../api/villes';
import { extraireMessage } from '../api/erreurs';
import { formatDate, formatHeure, formatPrix, montant } from '../format';
import { useLangue } from '../i18n';
import type { Dictionnaire } from '../i18n/dictionnaires';
import { vibrer } from '../haptics';
import type { Remboursement, Reservation } from '../api/types';

type Props = TabScreenProps<'MesTrajets'>;

// Le badge reflète l'état RÉEL : pour une réservation confirmée, ce qui compte
// pour le voyageur c'est où en est le paiement.
function badge(r: Reservation, t: Dictionnaire): { texte: string; couleur: string; fond: string } {
  if (r.statut === 'annulee') return { texte: t.mesTrajets.annulee, couleur: COLORS.gray, fond: '#ECEFF1' };
  if (r.statut === 'expiree') return { texte: t.mesTrajets.expiree, couleur: COLORS.gray, fond: '#ECEFF1' };
  switch (r.paiement?.statut) {
    case 'paye':
      return { texte: t.mesTrajets.payee, couleur: COLORS.green, fond: COLORS.greenWash };
    case 'echoue':
      return { texte: t.mesTrajets.paiementEchoue, couleur: COLORS.danger, fond: '#FCEBEA' };
    default:
      return { texte: t.mesTrajets.aPayer, couleur: COLORS.orange, fond: COLORS.orangeWash };
  }
}

// Statut courant du remboursement d'une réservation annulée — l'alerte à
// l'annulation ne montre qu'un instantané ('en_attente'), la suite du cycle
// (transfert en cours, réussi, échoué) se joue en arrière-plan côté API.
function LigneRemboursement({
  reservationId,
  t,
}: {
  reservationId: number;
  t: Dictionnaire;
}) {
  const [remb, setRemb] = useState<Remboursement | null>(null);

  useEffect(() => {
    let vivant = true;
    remboursementDeReservation(reservationId)
      .then((r) => vivant && setRemb(r))
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [reservationId]);

  if (!remb) return null;

  const infos = {
    en_attente: { texte: t.mesTrajets.remboursementEnAttente, couleur: COLORS.orange },
    en_cours: { texte: t.mesTrajets.remboursementEnCours, couleur: COLORS.orange },
    rembourse: { texte: t.mesTrajets.remboursementEffectue, couleur: COLORS.green },
    echoue: { texte: t.mesTrajets.remboursementEchoue, couleur: COLORS.danger },
  }[remb.statut];

  return (
    <View style={styles.ligne}>
      <Ionicons name="cash-outline" size={14} color={infos.couleur} />
      <Text style={[styles.ligneTexte, { color: infos.couleur, fontWeight: '700' }]} numberOfLines={1}>
        {infos.texte}
        {remb.statut === 'echoue' && remb.motifEchec ? ` · ${remb.motifEchec}` : ''}
      </Text>
    </View>
  );
}

export default function MesTrajetsScreen({ navigation }: Props) {
  const { t, locale } = useLangue();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [nomVille, setNomVille] = useState<(id: number | undefined) => string>(() => () => '—');
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [annulationId, setAnnulationId] = useState<number | null>(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(async (mode: 'initial' | 'refresh' | 'silencieux' = 'initial') => {
    if (mode === 'refresh') setRafraichit(true);
    else if (mode === 'initial') setChargement(true);
    setErreur(null);
    try {
      const [liste, resolveur] = await Promise.all([mesReservations(), tableVilles()]);
      setReservations(liste);
      setNomVille(() => resolveur);
    } catch (e) {
      setErreur(extraireMessage(e));
    } finally {
      setChargement(false);
      setRafraichit(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger(dejaCharge.current ? 'silencieux' : 'initial');
      dejaCharge.current = true;
    }, [charger]),
  );

  function route(r: Reservation): string {
    const trajet = r.depart?.trajet;
    const d = trajet?.villeDepart?.nom ?? nomVille(trajet?.villeDepartId);
    const a = trajet?.villeArrivee?.nom ?? nomVille(trajet?.villeArriveeId);
    return `${d} → ${a}`;
  }

  function demanderAnnulation(r: Reservation) {
    Alert.alert(
      t.mesTrajets.confirmerAnnulationTitre,
      t.mesTrajets.confirmerAnnulationTexte,
      [
        { text: t.commun.retour, style: 'cancel' },
        { text: t.commun.annuler, style: 'destructive', onPress: () => lancerAnnulation(r.id) },
      ],
    );
  }

  async function lancerAnnulation(id: number) {
    setAnnulationId(id);
    setErreur(null);
    try {
      const res = await annuler(id);
      vibrer.succes();
      setReservations((l) => l.map((r) => (r.id === id ? res : r)));
      if (res.remboursement) {
        Alert.alert(
          t.mesTrajets.annulationEnregistreeTitre,
          t.mesTrajets.annulationEnregistreeTexte(
            formatPrix(res.remboursement.montantRembourse, locale),
            formatPrix(res.remboursement.fraisRetenus, locale),
          ),
        );
      }
    } catch (e) {
      vibrer.erreur();
      setErreur(extraireMessage(e));
    } finally {
      setAnnulationId(null);
    }
  }

  const nb = reservations.length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <HeroHeader
        titre={t.mesTrajets.titre}
        sousTitre={chargement ? undefined : nb > 0 ? t.commun.nReservations(nb) : t.mesTrajets.aucuneReservation}
      />

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={rafraichit} onRefresh={() => charger('refresh')} tintColor={COLORS.orange} />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <Ionicons name="bus-outline" size={40} color={COLORS.grayClair} />
              <Text style={styles.videTexte}>{t.mesTrajets.aucunTrajet}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const b = badge(item, t);
            const paye = item.paiement?.statut === 'paye';
            const aPayer = item.statut === 'confirmee' && !paye;
            const trajet = item.depart?.trajet;
            const prixTotal = trajet ? montant(trajet.prix) * item.nombrePlaces : 0;
            // Le suivi n'est proposé que pour une réservation encore valide
            // (jamais pour une réservation annulée ou expirée).
            const peutSuivre =
              item.statut === 'confirmee' &&
              (item.depart?.statut === 'en_route' || item.depart?.statut === 'arrive');
            // L'API refuse l'annulation (400) une fois le départ parti (en_route/arrive)
            // ou un ticket déjà scanné à l'embarquement — on épargne l'aller-retour
            // pour le cas détectable ici (le départ parti).
            const peutAnnuler = item.statut === 'confirmee' && item.depart?.statut !== 'en_route' && item.depart?.statut !== 'arrive';
            return (
              <FadeIn delai={Math.min(index * 55, 300)}>
                <Card style={styles.carte}>
                  <View style={styles.carteHaut}>
                    <Text style={styles.route} numberOfLines={1}>
                      {route(item)}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: b.fond }]}>
                      <Text style={[styles.badgeTexte, { color: b.couleur }]}>{b.texte}</Text>
                    </View>
                  </View>

                  {item.depart && (
                    <View style={styles.ligne}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
                      <Text style={styles.ligneTexte} numberOfLines={1}>
                        {formatDate(item.depart.dateDepart, locale)}
                        {trajet ? ` · ${formatHeure(trajet.heureDepart, locale)}` : ''}
                      </Text>
                    </View>
                  )}
                  <View style={styles.ligne}>
                    <Ionicons name="people-outline" size={14} color={COLORS.gray} />
                    <Text style={styles.ligneTexte} numberOfLines={1}>
                      {t.commun.nPlaces(item.nombrePlaces)}
                      {item.sieges?.length ? ` · ${t.commun.nSieges(item.sieges.length)} ${item.sieges.join(', ')}` : ''}
                      {trajet ? ` · ${formatPrix(prixTotal, locale)}` : ''}
                    </Text>
                  </View>

                  {item.statut === 'annulee' && <LigneRemboursement reservationId={item.id} t={t} />}

                  <View style={styles.actions}>
                    <View style={styles.actionsPrimaires}>
                      {peutSuivre && (
                        <PressableScale
                          onPress={() =>
                            navigation.navigate('Suivi', {
                              departId: item.depart!.id,
                              route: route(item),
                            })
                          }
                          style={styles.actionPrimaire}
                        >
                          <Ionicons
                            name={
                              item.depart!.statut === 'arrive' ? 'flag-outline' : 'navigate-outline'
                            }
                            size={15}
                            color={COLORS.white}
                          />
                          <Text style={styles.actionPrimaireTexte} numberOfLines={1}>
                            {item.depart!.statut === 'arrive' ? t.mesTrajets.voirLeTrajet : t.mesTrajets.suivreLeVehicule}
                          </Text>
                        </PressableScale>
                      )}
                      {paye && (
                        <PressableScale
                          onPress={() =>
                            navigation.navigate('Ticket', {
                              reservationId: item.id,
                              nombrePlaces: item.nombrePlaces,
                            })
                          }
                          style={styles.actionPrimaire}
                        >
                          <Ionicons name="qr-code-outline" size={15} color={COLORS.white} />
                          <Text style={styles.actionPrimaireTexte} numberOfLines={1}>
                            {t.mesTrajets.voirLeTicket}
                          </Text>
                        </PressableScale>
                      )}
                      {aPayer && (
                        <PressableScale
                          onPress={() =>
                            navigation.navigate('Paiement', {
                              reservationId: item.id,
                              nombrePlaces: item.nombrePlaces,
                              montantEstime: prixTotal,
                              sieges: item.sieges,
                            })
                          }
                          style={styles.actionPrimaire}
                        >
                          <Ionicons name="card-outline" size={15} color={COLORS.white} />
                          <Text style={styles.actionPrimaireTexte} numberOfLines={1}>
                            {item.paiement?.statut === 'echoue' ? t.mesTrajets.reessayerLePaiement : t.mesTrajets.payer}
                          </Text>
                        </PressableScale>
                      )}
                    </View>
                    <View style={styles.actionsSecondaires}>
                      {peutAnnuler && (
                        <PressableScale
                          onPress={() => demanderAnnulation(item)}
                          disabled={annulationId === item.id}
                          style={styles.actionSecondaire}
                        >
                          <Text style={styles.actionSecondaireTexte}>
                            {annulationId === item.id ? t.mesTrajets.annulationEnCours : t.mesTrajets.annulerLaReservation}
                          </Text>
                        </PressableScale>
                      )}
                      <PressableScale
                        onPress={() =>
                          navigation.navigate('NouvelleDemande', {
                            reservationId: item.id,
                            routeLabel: route(item),
                          })
                        }
                        style={styles.actionSecondaire}
                      >
                        <Text style={styles.actionSignalerTexte}>{t.support.signalerUnProbleme}</Text>
                      </PressableScale>
                    </View>
                  </View>
                </Card>
              </FadeIn>
            );
          }}
        />
      )}
      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  liste: { padding: 16, gap: 12, flexGrow: 1 },
  vide: { alignItems: 'center', gap: 10, marginTop: 60 },
  videTexte: { color: COLORS.gray, fontSize: 14 },
  carte: { gap: 6 },
  carteHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  route: { fontSize: 16, fontWeight: '800', color: COLORS.dark, flexShrink: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.pill },
  badgeTexte: { fontSize: 11, fontWeight: '700' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ligneTexte: { fontSize: 13, color: COLORS.gray, flex: 1 },
  actions: { marginTop: 12, gap: 4 },
  actionsPrimaires: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionPrimaire: {
    flexGrow: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  actionPrimaireTexte: { color: COLORS.white, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  actionsSecondaires: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionSecondaire: { alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 8 },
  actionSignalerTexte: { color: COLORS.gray, fontWeight: '600', fontSize: 13 },
  actionSecondaireTexte: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 12 },
});
