import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AgentValiderStackParamList } from '../../navigation/AgentValiderNavigator';
import { COLORS, RADIUS } from '../../theme';
import HeroHeader from '../../components/HeroHeader';
import Card from '../../components/Card';
import FadeIn from '../../components/FadeIn';
import PressableScale from '../../components/PressableScale';
import { departsCompagnie } from '../../api/departs';
import { extraireMessage } from '../../api/erreurs';
import { formatDateCourt, formatHeure, versYmd, ajouterJours } from '../../format';
import { useLangue } from '../../i18n';
import { useProfil } from '../../auth/ProfilContext';
import { vibrer } from '../../haptics';
import type { DepartResultat } from '../../api/types';

type Props = NativeStackScreenProps<AgentValiderStackParamList, 'SelectionDepart'>;

// Premier écran de l'onglet "Valider" : l'agent choisit le départ en cours
// d'embarquement avant de scanner (0.29.1, recommandé par l'API) — ce choix
// devient le `?departId=` envoyé à chaque validation, pour empêcher un
// voyageur de monter dans le mauvais car. Hier + aujourd'hui, pour couvrir
// les cars de nuit embarqués après minuit (même règle que le contrôle de
// date côté serveur).
export default function SelectionDepartScreen({ navigation }: Props) {
  const { t, locale } = useLangue();
  const { profil } = useProfil();
  const [departs, setDeparts] = useState<DepartResultat[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(
    async (mode: 'initial' | 'refresh' | 'silencieux' = 'initial') => {
      if (!profil?.compagnieId) return;
      if (mode === 'refresh') setRafraichit(true);
      else if (mode === 'initial') setChargement(true);
      setErreur(null);
      try {
        const aujourdhui = versYmd(new Date());
        const hier = ajouterJours(aujourdhui, -1);
        const liste = await departsCompagnie(profil.compagnieId, hier, aujourdhui);
        setDeparts(liste.filter((d) => d.statut === 'planifie' || d.statut === 'en_route'));
      } catch (e) {
        setErreur(extraireMessage(e));
      } finally {
        setChargement(false);
        setRafraichit(false);
      }
    },
    [profil?.compagnieId],
  );

  useFocusEffect(
    useCallback(() => {
      charger(dejaCharge.current ? 'silencieux' : 'initial');
      dejaCharge.current = true;
    }, [charger]),
  );

  function choisir(d: DepartResultat) {
    vibrer.selection();
    navigation.navigate('Scan', {
      departId: d.id,
      routeLabel: `${d.trajet.villeDepart.nom} → ${d.trajet.villeArrivee.nom}`,
    });
  }

  const nb = departs.length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <HeroHeader
        titre={t.agent.selectionDepartTitre}
        sousTitre={chargement ? undefined : nb > 0 ? t.agent.selectionDepartSousTitre(nb) : t.agent.aucunDepart}
      />

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={departs}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={rafraichit} onRefresh={() => charger('refresh')} tintColor={COLORS.orange} />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <Ionicons name="bus-outline" size={40} color={COLORS.grayClair} />
              <Text style={styles.videTitre}>{t.agent.aucunDepart}</Text>
              <Text style={styles.videTexte}>{t.agent.aucunDepartTexte}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <FadeIn delai={Math.min(index * 50, 300)}>
              <PressableScale onPress={() => choisir(item)}>
                <Card style={styles.carte}>
                  <View style={styles.corps}>
                    <Text style={styles.route} numberOfLines={1}>
                      {item.trajet.villeDepart.nom} → {item.trajet.villeArrivee.nom}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {formatDateCourt(item.dateDepart, locale)} · {formatHeure(item.trajet.heureDepart, locale)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: item.statut === 'en_route' ? COLORS.orangeWash : '#ECEFF1' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeTexte,
                        { color: item.statut === 'en_route' ? COLORS.orangeSombre : COLORS.gray },
                      ]}
                    >
                      {item.statut === 'en_route' ? t.suivi.enRoute : t.suivi.pasEncoreParti}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.grayClair} />
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
  liste: { padding: 16, gap: 10, flexGrow: 1 },
  vide: { alignItems: 'center', gap: 8, marginTop: 60, paddingHorizontal: 30 },
  videTitre: { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginTop: 6 },
  videTexte: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 19 },
  carte: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  corps: { flex: 1, gap: 2 },
  route: { fontSize: 15, fontWeight: '800', color: COLORS.dark },
  meta: { fontSize: 12, color: COLORS.gray },
  badge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTexte: { fontSize: 11, fontWeight: '800' },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 12 },
});
