import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../theme';
import HeroHeader from '../../components/HeroHeader';
import Card from '../../components/Card';
import FadeIn from '../../components/FadeIn';
import { billetsScannes } from '../../api/tickets';
import { extraireMessage } from '../../api/erreurs';
import { formatDateCourt, formatHeure, formatRelatif } from '../../format';
import { useLangue } from '../../i18n';
import type { Dictionnaire } from '../../i18n/dictionnaires';
import type { BilletScanne, ResultatScan } from '../../api/types';

function styleResultat(
  resultat: ResultatScan | null,
  t: Dictionnaire,
): { texte: string; couleur: string; fond: string; icone: keyof typeof Ionicons.glyphMap } {
  switch (resultat) {
    case 'valide':
      return { texte: t.agent.resultats.valide, couleur: COLORS.green, fond: COLORS.greenWash, icone: 'checkmark' };
    case 'deja_utilise':
      return { texte: t.agent.resultats.deja_utilise, couleur: COLORS.orangeSombre, fond: COLORS.orangeWash, icone: 'refresh' };
    case 'annule':
      return { texte: t.agent.resultats.annule, couleur: COLORS.gray, fond: '#ECEFF1', icone: 'close' };
    case 'introuvable':
      return { texte: t.agent.resultats.introuvable, couleur: COLORS.danger, fond: '#FCEBEA', icone: 'help' };
    case 'refuse_hors_compagnie':
      return { texte: t.agent.resultats.refuse_hors_compagnie, couleur: COLORS.danger, fond: '#FCEBEA', icone: 'ban' };
    default:
      return { texte: t.agent.resultats.scan, couleur: COLORS.gray, fond: '#ECEFF1', icone: 'ellipse' };
  }
}

export default function HistoriqueScansScreen() {
  const { t, locale } = useLangue();
  const [liste, setListe] = useState<BilletScanne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(async (mode: 'initial' | 'refresh' | 'silencieux' = 'initial') => {
    if (mode === 'refresh') setRafraichit(true);
    else if (mode === 'initial') setChargement(true);
    setErreur(null);
    try {
      setListe(await billetsScannes());
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

  const nb = liste.length;
  const nbValides = liste.filter((s) => s.resultat === 'valide').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <HeroHeader
        titre={t.agent.historiqueTitre}
        sousTitre={chargement ? undefined : nb > 0 ? t.agent.nValidesNScans(nbValides, nb) : t.agent.aucunScan}
      />

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(s, i) => `${s.ticketId ?? 'x'}-${s.date}-${i}`}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={rafraichit} onRefresh={() => charger('refresh')} tintColor={COLORS.orange} />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <View style={styles.videIcone}>
                <Ionicons name="qr-code-outline" size={32} color={COLORS.grayClair} />
              </View>
              <Text style={styles.videTitre}>{t.agent.aucunBilletScanne}</Text>
              <Text style={styles.videTexte}>{t.agent.aucunBilletScanneTexte}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const r = styleResultat(item.resultat, t);
            const tr = item.reservation?.depart?.trajet;
            return (
              <FadeIn delai={Math.min(index * 40, 240)}>
                <Card style={styles.carte}>
                  <View style={[styles.pastille, { backgroundColor: r.couleur }]}>
                    <Ionicons name={r.icone} size={16} color={COLORS.white} />
                  </View>
                  <View style={styles.corps}>
                    <Text style={styles.route} numberOfLines={1}>
                      {tr ? `${tr.villeDepart.nom} → ${tr.villeArrivee.nom}` : t.agent.codeInconnu}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.reservation?.depart
                        ? `${formatDateCourt(item.reservation.depart.dateDepart, locale)} · ${formatHeure(tr!.heureDepart, locale)}`
                        : `QR ${(item.codeQr ?? '').slice(0, 8)}…`}
                      {item.siege ? ` · ${t.ticket.siege.toLowerCase()} ${item.siege}` : ''}
                    </Text>
                    <Text style={styles.quand}>{t.agent.scanne(formatRelatif(item.date, locale))}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: r.fond }]}>
                    <Text style={[styles.badgeTexte, { color: r.couleur }]}>{r.texte}</Text>
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
  liste: { padding: 16, gap: 10, flexGrow: 1 },

  vide: { alignItems: 'center', gap: 8, marginTop: 60, paddingHorizontal: 30 },
  videIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  videTitre: { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  videTexte: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 19 },

  carte: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pastille: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corps: { flex: 1, gap: 2 },
  route: { fontSize: 15, fontWeight: '800', color: COLORS.dark },
  meta: { fontSize: 12, color: COLORS.gray },
  quand: { fontSize: 11, color: COLORS.grayClair, marginTop: 1 },
  badge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTexte: { fontSize: 11, fontWeight: '800' },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 12 },
});
