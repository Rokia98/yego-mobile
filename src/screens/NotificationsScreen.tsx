import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '../navigation/types';
import { COLORS, RADIUS } from '../theme';
import Card from '../components/Card';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import BoutonRetour from '../components/BoutonRetour';
import { notifications as notifApi } from '../api/notifications';
import { routerDepuisNotification } from '../navigation/ref';
import { useNotifications } from '../auth/NotificationsContext';
import { extraireMessage } from '../api/erreurs';
import { formatRelatif } from '../format';
import { useLangue } from '../i18n';
import type { Notification } from '../api/types';

type Props = StackScreenProps<'Notifications'>;

const ICONE: Record<string, keyof typeof Ionicons.glyphMap> = {
  'paiement.confirme': 'card',
  'paiement.echoue': 'alert-circle',
  'reservation.confirmee': 'checkmark-circle',
  'reservation.annulee': 'close-circle',
  'remboursement.effectue': 'cash',
  'depart.rappel': 'alarm',
  'depart.demarre': 'bus',
  'depart.arrive': 'flag',
  'depart.retard': 'time',
  'depart.horaire_modifie': 'time',
  'depart.date_modifiee': 'calendar',
  'support.reponse': 'chatbubble-ellipses',
  'support.statut': 'checkmark-done',
};

export default function NotificationsScreen(_props: Props) {
  const { t, locale } = useLangue();
  const { rafraichir: rafraichirCompteur } = useNotifications();
  const [liste, setListe] = useState<Notification[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      setListe(await notifApi.liste());
    } catch (e) {
      setErreur(extraireMessage(e));
    } finally {
      setChargement(false);
      setRafraichit(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function toutMarquer() {
    await notifApi.toutLu().catch(() => {});
    setListe((l) => l.map((n) => ({ ...n, lu: true })));
    rafraichirCompteur();
  }

  async function ouvrir(n: Notification) {
    if (!n.lu) {
      notifApi.marquerLu(n.id).catch(() => {});
      setListe((l) => l.map((x) => (x.id === n.id ? { ...x, lu: true } : x)));
      rafraichirCompteur();
    }
    // Même routage que pour un tap sur une notification push.
    routerDepuisNotification({ type: n.type, ...(n.donnees ?? {}) });
  }

  const auMoinsUnNonLu = liste.some((n) => !n.lu);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.entete}>
        <View style={styles.retour}>
          <BoutonRetour icone="down" />
        </View>
        <Text style={styles.titre}>{t.notifications.titre}</Text>
        <View style={[styles.retour, { alignItems: 'flex-end' }]}>
          {auMoinsUnNonLu && (
            <PressableScale onPress={toutMarquer} hitSlop={8}>
              <Text style={styles.lien}>{t.notifications.toutLu}</Text>
            </PressableScale>
          )}
        </View>
      </View>

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={rafraichit}
              onRefresh={() => {
                setRafraichit(true);
                charger();
              }}
              tintColor={COLORS.orange}
            />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.grayClair} />
              <Text style={styles.videTexte}>{t.notifications.aucuneNotification}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <FadeIn delai={Math.min(index * 45, 270)}>
              <PressableScale onPress={() => ouvrir(item)}>
                <Card style={[styles.carte, !item.lu && styles.carteNonLue]}>
                  <View style={[styles.icone, !item.lu && styles.iconeNonLue]}>
                    <Ionicons
                      name={ICONE[item.type] ?? 'notifications'}
                      size={18}
                      color={item.lu ? COLORS.gray : COLORS.orange}
                    />
                  </View>
                  <View style={styles.corps}>
                    <Text style={styles.notifTitre}>{item.titre}</Text>
                    <Text style={styles.notifCorps}>{item.corps}</Text>
                    <Text style={styles.date}>{formatRelatif(item.dateCreation, locale)}</Text>
                  </View>
                  {!item.lu && <View style={styles.pastille} />}
                </Card>
              </PressableScale>
            </FadeIn>
          )}
        />
      )}
      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  retour: { minWidth: 60, alignItems: 'flex-start', justifyContent: 'center' },
  titre: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  lien: { fontSize: 13, fontWeight: '700', color: COLORS.orange, textAlign: 'right' },
  liste: { padding: 16, gap: 10, flexGrow: 1 },
  vide: { alignItems: 'center', gap: 10, marginTop: 60 },
  videTexte: { color: COLORS.gray, fontSize: 14 },
  carte: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  carteNonLue: { backgroundColor: '#FFFDF9' },
  icone: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeNonLue: { backgroundColor: COLORS.orangeWash },
  corps: { flex: 1, gap: 2 },
  notifTitre: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  notifCorps: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  date: { fontSize: 11, color: COLORS.grayClair, marginTop: 2 },
  pastille: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange, marginTop: 4 },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 12 },
});
