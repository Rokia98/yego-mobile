import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '../navigation/types';
import { COLORS, RADIUS, SHADOW } from '../theme';
import BoutonRetour from '../components/BoutonRetour';
import PressableScale from '../components/PressableScale';
import { demande, fermerDemande, repondre } from '../api/support';
import { extraireMessage } from '../api/erreurs';
import { useAuth } from '../auth/AuthContext';
import { useLangue } from '../i18n';
import { formatRelatif } from '../format';
import { vibrer } from '../haptics';
import type { DemandeSupportDetail, MessageSupport } from '../api/types';

type Props = StackScreenProps<'DemandeDetail'>;

const COULEUR_STATUT: Record<string, { couleur: string; fond: string }> = {
  ouverte: { couleur: COLORS.orange, fond: COLORS.orangeWash },
  en_cours: { couleur: '#2980B9', fond: '#E8F1FA' },
  resolue: { couleur: COLORS.green, fond: COLORS.greenWash },
  fermee: { couleur: COLORS.gray, fond: '#ECEFF1' },
};

export default function DemandeDetailScreen({ route }: Props) {
  const { demandeId } = route.params;
  const { session } = useAuth();
  const { t, locale } = useLangue();

  const [donnees, setDonnees] = useState<DemandeSupportDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponse, setReponse] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const listeRef = useRef<FlatList>(null);
  const dejaCharge = useRef(false);

  const charger = useCallback(
    async (initial: boolean) => {
      try {
        setDonnees(await demande(demandeId));
        setErreur(null);
      } catch (e) {
        setErreur(extraireMessage(e));
      } finally {
        if (initial) setChargement(false);
      }
    },
    [demandeId],
  );

  useFocusEffect(
    useCallback(() => {
      charger(!dejaCharge.current);
      dejaCharge.current = true;
    }, [charger]),
  );

  async function envoyerReponse() {
    const contenu = reponse.trim();
    if (!contenu || !donnees) return;
    setEnvoiEnCours(true);
    try {
      const msg = await repondre(donnees.id, contenu);
      setReponse('');
      setDonnees((d) =>
        d
          ? {
              ...d,
              messages: [...d.messages, msg],
              statut: d.statut === 'resolue' ? 'ouverte' : d.statut,
            }
          : d,
      );
      setTimeout(() => listeRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      vibrer.erreur();
      Alert.alert('', extraireMessage(e));
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function confirmerFermeture() {
    if (!donnees) return;
    Alert.alert(t.support.fermerConfirmTitre, t.support.fermerConfirmTexte, [
      { text: t.commun.annuler, style: 'cancel' },
      {
        text: t.support.fermerLaDemande,
        style: 'destructive',
        onPress: async () => {
          try {
            await fermerDemande(donnees.id);
            setDonnees((d) => (d ? { ...d, statut: 'fermee' } : d));
          } catch (e) {
            Alert.alert('', extraireMessage(e));
          }
        },
      },
    ]);
  }

  const fermee = donnees?.statut === 'fermee';
  const s = donnees ? COULEUR_STATUT[donnees.statut] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.entete}>
        <BoutonRetour />
        <View style={styles.enteteCorps}>
          <Text style={styles.titre} numberOfLines={1}>
            {donnees?.sujet ?? '…'}
          </Text>
          {s && donnees && (
            <View style={[styles.badge, { backgroundColor: s.fond }]}>
              <Text style={[styles.badgeTexte, { color: s.couleur }]}>{t.support.statuts[donnees.statut]}</Text>
            </View>
          )}
        </View>
        {donnees && !fermee ? (
          <PressableScale onPress={confirmerFermeture} hitSlop={8} style={styles.boutonFermer}>
            <Ionicons name="checkmark-done-outline" size={20} color={COLORS.gray} />
          </PressableScale>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {chargement ? (
        <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
      ) : erreur && !donnees ? (
        <Text style={styles.erreur}>{erreur}</Text>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <FlatList
            ref={listeRef}
            data={donnees?.messages ?? []}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.liste}
            onContentSizeChange={() => listeRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => <Bulle message={item} moi={item.auteur?.id === session?.utilisateurId} locale={locale} />}
          />

          {fermee ? (
            <Text style={styles.infoFermee}>{t.support.demandeFermeeInfo}</Text>
          ) : (
            <View style={styles.pied}>
              <TextInput
                style={styles.input}
                value={reponse}
                onChangeText={setReponse}
                placeholder={t.support.reponsePlaceholder}
                placeholderTextColor={COLORS.grayClair}
                multiline
                maxLength={4000}
              />
              <PressableScale
                onPress={envoyerReponse}
                disabled={!reponse.trim() || envoiEnCours}
                style={[styles.boutonEnvoyer, (!reponse.trim() || envoiEnCours) && styles.boutonEnvoyerDesactive]}
              >
                {envoiEnCours ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={17} color={COLORS.white} />
                )}
              </PressableScale>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Bulle({ message, moi, locale }: { message: MessageSupport; moi: boolean; locale: Parameters<typeof formatRelatif>[1] }) {
  return (
    <View style={[styles.bulleZone, moi && styles.bulleZoneMoi]}>
      {!moi && (
        <Text style={styles.auteur} numberOfLines={1}>
          {message.auteur?.nom ?? 'Yègo'}
        </Text>
      )}
      <View style={[styles.bulle, moi && styles.bulleMoi]}>
        <Text style={[styles.bulleTexte, moi && styles.bulleTexteMoi]}>{message.contenu}</Text>
      </View>
      <Text style={styles.date}>{formatRelatif(message.dateCreation, locale)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  entete: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  enteteCorps: { flex: 1, alignItems: 'center', gap: 4 },
  titre: { fontSize: 15, fontWeight: '800', color: COLORS.dark, textAlign: 'center' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.pill },
  badgeTexte: { fontSize: 11, fontWeight: '700' },
  boutonFermer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  erreur: { color: COLORS.danger, fontSize: 13, textAlign: 'center', padding: 20 },

  liste: { padding: 16, gap: 12, flexGrow: 1 },
  bulleZone: { maxWidth: '82%', alignSelf: 'flex-start' },
  bulleZoneMoi: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  auteur: { fontSize: 11, color: COLORS.gray, fontWeight: '700', marginBottom: 3, marginLeft: 4 },
  bulle: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SHADOW,
  },
  bulleMoi: {
    backgroundColor: COLORS.orange,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: 4,
  },
  bulleTexte: { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  bulleTexteMoi: { color: COLORS.white },
  date: { fontSize: 10, color: COLORS.grayClair, marginTop: 4, marginHorizontal: 4 },

  infoFermee: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 12,
    padding: 14,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pied: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  boutonEnvoyer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonEnvoyerDesactive: { backgroundColor: COLORS.grayClair },
});
