import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import type { TabScreenProps } from '../navigation/types';
import { COLORS, RADIUS } from '../theme';
import HeroHeader from '../components/HeroHeader';
import Card from '../components/Card';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import { mesReservations } from '../api/reservations';
import { tableVilles } from '../api/villes';
import { extraireMessage } from '../api/erreurs';
import { formatDate, formatHeure } from '../format';
import { useLangue } from '../i18n';
import type { Reservation } from '../api/types';

type Props = TabScreenProps<'Tickets'>;

export default function TicketsScreen({ navigation }: Props) {
  const { t, locale } = useLangue();
  const [avecTickets, setAvecTickets] = useState<Reservation[]>([]);
  const [nomVille, setNomVille] = useState<(id: number | undefined) => string>(() => () => '—');
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(async (mode: 'initial' | 'refresh' | 'silencieux' = 'initial') => {
    if (mode === 'refresh') setRafraichit(true);
    else if (mode === 'initial') setChargement(true);
    setErreur(null);
    try {
      const [liste, resolveur] = await Promise.all([mesReservations(0, 50), tableVilles()]);
      setAvecTickets(liste.filter((r) => (r.tickets?.length ?? 0) > 0));
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

  const nb = avecTickets.length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <HeroHeader
        titre={t.tickets.titre}
        sousTitre={chargement ? undefined : nb > 0 ? t.tickets.nTrajetsAvecBillet(nb) : t.tickets.aucunBillet}
      />

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={avecTickets}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={rafraichit} onRefresh={() => charger('refresh')} tintColor={COLORS.orange} />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <Ionicons name="ticket-outline" size={40} color={COLORS.grayClair} />
              <Text style={styles.videTexte}>{t.tickets.aucunBilletTexte}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const trajet = item.depart?.trajet;
            const premier = item.tickets?.[0];
            return (
              <FadeIn delai={Math.min(index * 60, 300)}>
                <PressableScale
                  onPress={() =>
                    navigation.navigate('Ticket', {
                      reservationId: item.id,
                      nombrePlaces: item.nombrePlaces,
                    })
                  }
                >
                  <Card style={styles.billet} ombre>
                    <View style={styles.billetGauche}>
                      <Text style={styles.route}>{route(item)}</Text>
                      {item.depart && (
                        <Text style={styles.meta}>
                          {formatDate(item.depart.dateDepart, locale)}
                          {trajet ? ` · ${formatHeure(trajet.heureDepart, locale)}` : ''}
                        </Text>
                      )}
                      <View style={styles.pastilleNb}>
                        <Ionicons name="ticket" size={13} color={COLORS.orange} />
                        <Text style={styles.pastilleNbTexte}>
                          {t.commun.nBillets(item.tickets?.length ?? 0)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.billetSep} />
                    <View style={styles.qr}>
                      {premier ? (
                        <QRCode value={premier.codeQr} size={64} color={COLORS.dark} backgroundColor={COLORS.white} />
                      ) : null}
                    </View>
                  </Card>
                </PressableScale>
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
  billet: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  billetGauche: { flex: 1, gap: 5 },
  route: { fontSize: 15, fontWeight: '800', color: COLORS.dark },
  meta: { fontSize: 12, color: COLORS.gray },
  pastilleNb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.orangeWash,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 2,
  },
  pastilleNbTexte: { fontSize: 11, fontWeight: '700', color: COLORS.orangeSombre },
  billetSep: {
    width: 1,
    alignSelf: 'stretch',
    borderLeftWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginHorizontal: 14,
  },
  qr: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 12 },
});
