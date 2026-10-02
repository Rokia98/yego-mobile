import React, { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '../navigation/types';
import { COLORS, RADIUS, SHADOW } from '../theme';
import Card from '../components/Card';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import BoutonRetour from '../components/BoutonRetour';
import { listerDemandes } from '../api/support';
import { extraireMessage } from '../api/erreurs';
import { useLangue } from '../i18n';
import { formatRelatif } from '../format';
import type { CategorieSupport, DemandeSupport, StatutSupport } from '../api/types';

type Props = StackScreenProps<'Support'>;

const ICONE_CATEGORIE: Record<CategorieSupport, keyof typeof Ionicons.glyphMap> = {
  reservation: 'bus-outline',
  paiement: 'card-outline',
  remboursement: 'cash-outline',
  ticket: 'ticket-outline',
  compte: 'person-outline',
  abonnement: 'repeat-outline',
  technique: 'construct-outline',
  autre: 'help-circle-outline',
};

const COULEUR_STATUT: Record<StatutSupport, { couleur: string; fond: string }> = {
  ouverte: { couleur: COLORS.orange, fond: COLORS.orangeWash },
  en_cours: { couleur: '#2980B9', fond: '#E8F1FA' },
  resolue: { couleur: COLORS.green, fond: COLORS.greenWash },
  fermee: { couleur: COLORS.gray, fond: '#ECEFF1' },
};

export default function SupportScreen({ navigation }: Props) {
  const { t, locale } = useLangue();
  const [demandes, setDemandes] = useState<DemandeSupport[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichit, setRafraichit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(async (mode: 'initial' | 'refresh' | 'silencieux' = 'initial') => {
    if (mode === 'refresh') setRafraichit(true);
    else if (mode === 'initial') setChargement(true);
    setErreur(null);
    try {
      setDemandes(await listerDemandes());
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.entete}>
        <View style={styles.zoneLaterale}>
          <BoutonRetour />
        </View>
        <Text style={styles.titre} numberOfLines={1}>
          {t.support.titreListe}
        </Text>
        <View style={[styles.zoneLaterale, styles.zoneLateraleDroite]}>
          <PressableScale
            onPress={() => navigation.navigate('NouvelleDemande', {})}
            hitSlop={8}
            style={styles.boutonAjouter}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </PressableScale>
        </View>
      </View>

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={demandes}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={styles.liste}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={rafraichit} onRefresh={() => charger('refresh')} tintColor={COLORS.orange} />
          }
          ListEmptyComponent={
            <View style={styles.vide}>
              <Ionicons name="chatbubbles-outline" size={40} color={COLORS.grayClair} />
              <Text style={styles.videTexte}>{t.support.aucuneDemande}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const s = COULEUR_STATUT[item.statut];
            return (
              <FadeIn delai={Math.min(index * 50, 300)}>
                <PressableScale onPress={() => navigation.navigate('DemandeDetail', { demandeId: item.id })}>
                  <Card style={styles.carte}>
                    <View style={styles.iconeCategorie}>
                      <Ionicons name={ICONE_CATEGORIE[item.categorie]} size={17} color={COLORS.orange} />
                    </View>
                    <View style={styles.corps}>
                      <Text style={styles.sujet} numberOfLines={1}>
                        {item.sujet}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {t.support.categories[item.categorie]} · {formatRelatif(item.dernierMessageA, locale)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: s.fond }]}>
                      <Text style={[styles.badgeTexte, { color: s.couleur }]}>{t.support.statuts[item.statut]}</Text>
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
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  // Zones latérales de largeur égale : le titre reste centré quel que soit
  // ce qu'elles contiennent (bouton retour absent, etc.).
  zoneLaterale: { width: 46, alignItems: 'flex-start', justifyContent: 'center' },
  zoneLateraleDroite: { alignItems: 'flex-end' },
  titre: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: COLORS.dark },
  boutonAjouter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.orange,
    ...SHADOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liste: { padding: 16, gap: 10, flexGrow: 1 },
  vide: { alignItems: 'center', gap: 10, marginTop: 60 },
  videTexte: { color: COLORS.gray, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  carte: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconeCategorie: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corps: { flex: 1, gap: 2 },
  sujet: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  meta: { fontSize: 12, color: COLORS.gray },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill },
  badgeTexte: { fontSize: 11, fontWeight: '700' },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 12 },
});
