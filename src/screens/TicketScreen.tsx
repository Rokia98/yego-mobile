import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, RADIUS, SPACING, SHADOW } from '../theme';
import { PinIcon } from '../components/Logo';
import Button from '../components/Button';
import FadeIn from '../components/FadeIn';
import LogoCompagnie from '../components/LogoCompagnie';
import { reservation as chargerReservation } from '../api/reservations';
import { garantirTickets } from '../api/tickets';
import { extraireMessage } from '../api/erreurs';
import { formatDate, formatHeure, formatPrix, montant } from '../format';
import { useLangue } from '../i18n';
import { vibrer } from '../haptics';
import { telechargerBillet } from '../tickets/billetPdf';
import type { Reservation, Ticket } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Ticket'>;

function BadgePaye({ texte }: { texte: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    vibrer.succes();
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }).start();
  }, [anim]);
  return (
    <Animated.View style={[styles.paye, { transform: [{ scale: anim }] }]}>
      <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
      <Text style={styles.payeTexte}>{texte}</Text>
    </Animated.View>
  );
}

export default function TicketScreen({ route, navigation }: Props) {
  const { t, locale } = useLangue();
  const ETAT: Record<Ticket['statut'], { texte: string; couleur: string; fond: string }> = {
    valide: { texte: t.ticket.etats.valide, couleur: COLORS.green, fond: COLORS.greenWash },
    utilise: { texte: t.ticket.etats.utilise, couleur: COLORS.gray, fond: '#ECEFF1' },
    annule: { texte: t.ticket.etats.annule, couleur: COLORS.danger, fond: '#FCEBEA' },
  };
  const { reservationId, nombrePlaces } = route.params;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [telechargement, setTelechargement] = useState(false);
  const qrRefs = useRef<Record<number, { toDataURL: (cb: (data: string) => void) => void } | null>>({});

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const [resa, tks] = await Promise.all([
          chargerReservation(reservationId),
          garantirTickets(reservationId, nombrePlaces),
        ]);
        if (!vivant) return;
        setReservation(resa);
        setTickets(tks);
      } catch (e) {
        if (vivant) setErreur(extraireMessage(e));
      } finally {
        if (vivant) setChargement(false);
      }
    })();
    return () => {
      vivant = false;
    };
  }, [reservationId, nombrePlaces]);

  async function telecharger() {
    if (!reservation || tickets.length === 0) return;
    setTelechargement(true);
    try {
      const qrDataUrls = await Promise.all(
        tickets.map(
          (tk) =>
            new Promise<string>((resolve) => {
              const ref = qrRefs.current[tk.id];
              if (!ref) return resolve('');
              ref.toDataURL((data) => resolve(data));
            }),
        ),
      );
      await telechargerBillet(reservation, tickets, qrDataUrls, t, locale);
      vibrer.succes();
    } catch (e) {
      vibrer.erreur();
      setErreur(extraireMessage(e));
    } finally {
      setTelechargement(false);
    }
  }

  if (chargement) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const trajet = reservation?.depart?.trajet;
  const compagnie = trajet?.compagnie?.nom ?? t.ticket.compagnie;
  const compagnieObj = trajet?.compagnie ?? { nom: compagnie };
  const depart = trajet?.villeDepart?.nom ?? '—';
  const arrivee = trajet?.villeArrivee?.nom ?? '—';
  const dateStr = reservation?.depart ? formatDate(reservation.depart.dateDepart, locale) : '';
  const heureStr = trajet ? formatHeure(trajet.heureDepart, locale) : '';
  const prixUnite = trajet ? montant(trajet.prix) : 0;
  const passager = reservation?.passagerNom ?? t.ticket.voyageur;
  const paiement = reservation?.paiement;
  const frais = paiement?.fraisService != null ? Number(paiement.fraisService) : 0;
  const totalPaye = paiement ? Number(paiement.montant) + frais : null;
  // Pas d'appel dédié ici : le taux se déduit des montants déjà reçus (receipt figé).
  const pourcentFraisAffiche =
    paiement && Number(paiement.montant) > 0 ? Math.round((frais / Number(paiement.montant)) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <BadgePaye texte={t.ticket.paiementConfirme} />
            {totalPaye != null && frais > 0 && (
              <View style={styles.recu}>
                <View style={styles.recuLigne}>
                  <Text style={styles.recuLabel}>{t.paiement.billets}</Text>
                  <Text style={styles.recuValeur}>{formatPrix(Number(paiement!.montant), locale)}</Text>
                </View>
                <View style={styles.recuLigne}>
                  <Text style={styles.recuLabel}>{t.paiement.fraisService(pourcentFraisAffiche)}</Text>
                  <Text style={styles.recuValeur}>{formatPrix(frais, locale)}</Text>
                </View>
                <View style={[styles.recuLigne, styles.recuLigneTotal]}>
                  <Text style={styles.recuLabelTotal}>{t.paiement.total}</Text>
                  <Text style={styles.recuValeurTotal}>{formatPrix(totalPaye, locale)}</Text>
                </View>
              </View>
            )}
            {erreur && <Text style={styles.erreur}>{erreur}</Text>}
          </>
        }
        renderItem={({ item, index }) => {
          const e = ETAT[item.statut];
          return (
            <FadeIn delai={100 + index * 90}>
              <View style={styles.billet}>
                {/* Bandeau compagnie */}
                <View style={styles.bandeau}>
                  <LogoCompagnie compagnie={compagnieObj} taille={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compagnie} numberOfLines={1}>
                      {compagnie}
                    </Text>
                    <Text style={styles.sousBandeau}>{t.ticket.billetElectronique}</Text>
                  </View>
                  <View style={styles.marque}>
                    <PinIcon size={18} />
                    <Text style={styles.marqueTexte}>
                      Y<Text style={{ color: COLORS.orange }}>è</Text>go
                    </Text>
                  </View>
                </View>

                {/* Trajet */}
                <View style={styles.corps}>
                  <View style={styles.trajet}>
                    <View style={styles.trajetCol}>
                      <Text style={styles.trajetLabel}>{t.ticket.depart}</Text>
                      <Text style={styles.ville} numberOfLines={1}>
                        {depart}
                      </Text>
                      <Text style={styles.trajetMeta}>{heureStr}</Text>
                    </View>
                    <View style={styles.trajetMilieu}>
                      <View style={styles.ligneVoyage} />
                      <View style={styles.bulleBus}>
                        <Ionicons name="bus" size={13} color={COLORS.white} />
                      </View>
                      <View style={styles.ligneVoyage} />
                    </View>
                    <View style={[styles.trajetCol, styles.trajetColDroite]}>
                      <Text style={styles.trajetLabel}>{t.ticket.arrivee}</Text>
                      <Text style={styles.ville} numberOfLines={1}>
                        {arrivee}
                      </Text>
                      <Text style={styles.trajetMeta}>{dateStr}</Text>
                    </View>
                  </View>
                </View>

                {/* Perforation */}
                <View style={styles.perfo}>
                  <View style={[styles.encoche, styles.encocheG]} />
                  <View style={styles.pointille} />
                  <View style={[styles.encoche, styles.encocheD]} />
                </View>

                {/* Détails */}
                <View style={styles.corps}>
                  <View style={styles.infos}>
                    <View style={styles.cell}>
                      <Text style={styles.label}>{t.ticket.siege}</Text>
                      <Text style={styles.siege}>{item.siege ?? '—'}</Text>
                    </View>
                    <View style={styles.cell}>
                      <Text style={styles.label}>{t.ticket.passager}</Text>
                      <Text style={styles.valeur} numberOfLines={1}>
                        {passager}
                      </Text>
                    </View>
                    <View style={[styles.cell, styles.cellLast]}>
                      <Text style={styles.label}>{t.ticket.etat}</Text>
                      <View style={[styles.badge, { backgroundColor: e.fond }]}>
                        <Text style={[styles.badgeTexte, { color: e.couleur }]}>{e.texte}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.qrCadre}>
                    <QRCode
                      value={item.codeQr}
                      size={168}
                      color={COLORS.dark}
                      backgroundColor={COLORS.white}
                      getRef={(c) => {
                        qrRefs.current[item.id] = c;
                      }}
                    />
                    <Text style={styles.qrLegende}>{t.ticket.presentezCeCode}</Text>
                  </View>

                  <View style={styles.pied}>
                    <Text style={styles.piedTexte}>{t.ticket.billetNSurN(index + 1, tickets.length)}</Text>
                    <Text style={styles.piedTexte}>{t.paiement.ref(reservationId)}</Text>
                    <Text style={[styles.piedTexte, styles.piedPrix]}>{formatPrix(prixUnite, locale)}</Text>
                  </View>
                </View>
              </View>
            </FadeIn>
          );
        }}
        ListFooterComponent={
          <FadeIn delai={180}>
            <Button
              titre={telechargement ? t.ticket.preparation : t.ticket.telechargerMonBillet}
              icone="download-outline"
              chargement={telechargement}
              onPress={telecharger}
              style={styles.boutonTelecharger}
            />
            <Button
              titre={t.ticket.retourAccueil}
              variante="fantome"
              onPress={() => navigation.popToTop()}
            />
          </FadeIn>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  liste: { padding: SPACING.xl, paddingBottom: SPACING.xl, gap: 18 },

  paye: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.greenWash,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 6,
  },
  payeTexte: { color: COLORS.green, fontWeight: '800', fontSize: 13 },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', marginBottom: 12 },

  recu: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  recuLigne: { flexDirection: 'row', justifyContent: 'space-between' },
  recuLabel: { fontSize: 13, color: COLORS.gray },
  recuValeur: { fontSize: 13, color: COLORS.dark, fontWeight: '600' },
  recuLigneTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, marginTop: 2 },
  recuLabelTotal: { fontSize: 14, color: COLORS.dark, fontWeight: '800' },
  recuValeurTotal: { fontSize: 14, color: COLORS.dark, fontWeight: '800' },

  billet: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW,
  },
  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.dark,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  compagnie: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  sousBandeau: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  marque: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  marqueTexte: { fontSize: 13, fontWeight: '800', color: COLORS.white },

  corps: { paddingHorizontal: 20 },

  trajet: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 20 },
  trajetCol: { flex: 1, gap: 3 },
  trajetColDroite: { alignItems: 'flex-end' },
  trajetLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: COLORS.grayClair,
  },
  ville: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  trajetMeta: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  trajetMilieu: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 18 },
  ligneVoyage: { width: 14, height: 2, backgroundColor: COLORS.border },
  bulleBus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },

  perfo: { flexDirection: 'row', alignItems: 'center' },
  encoche: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.background },
  encocheG: { marginLeft: -10 },
  encocheD: { marginRight: -10 },
  pointille: {
    flex: 1,
    borderTopWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginHorizontal: 6,
  },

  infos: {
    flexDirection: 'row',
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  cellLast: { borderRightWidth: 0 },
  label: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: COLORS.grayClair,
    marginBottom: 5,
  },
  siege: { fontSize: 24, fontWeight: '800', color: COLORS.orange, lineHeight: 26 },
  valeur: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  badgeTexte: { fontSize: 11, fontWeight: '800' },

  qrCadre: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FBFCFD',
  },
  qrLegende: { fontSize: 11, color: COLORS.gray, textAlign: 'center', marginTop: 12 },

  pied: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  piedTexte: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },
  piedPrix: { color: COLORS.dark, fontWeight: '800' },

  boutonTelecharger: { marginTop: 22, marginBottom: 10 },
});
