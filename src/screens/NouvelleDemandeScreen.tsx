import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '../navigation/types';
import { COLORS, RADIUS, SPACING } from '../theme';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';
import PressableScale from '../components/PressableScale';
import BottomSheet from '../components/BottomSheet';
import { creerDemande } from '../api/support';
import { extraireMessage } from '../api/erreurs';
import { useLangue } from '../i18n';
import { vibrer } from '../haptics';
import type { CategorieSupport } from '../api/types';

type Props = StackScreenProps<'NouvelleDemande'>;

const CATEGORIES: CategorieSupport[] = [
  'reservation',
  'paiement',
  'remboursement',
  'ticket',
  'compte',
  'abonnement',
  'technique',
  'autre',
];

export default function NouvelleDemandeScreen({ route, navigation }: Props) {
  const { t } = useLangue();
  const { reservationId, routeLabel } = route.params ?? {};

  const [categorie, setCategorie] = useState<CategorieSupport | null>(
    reservationId ? 'reservation' : null,
  );
  const [choixCategorie, setChoixCategorie] = useState(false);
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer() {
    setErreur(null);
    if (!categorie) {
      setErreur(t.support.categorieRequise);
      return;
    }
    if (sujet.trim().length < 5) {
      setErreur(t.support.sujetTropCourt);
      return;
    }
    if (!message.trim()) {
      setErreur(t.support.messageRequis);
      return;
    }

    setEnCours(true);
    try {
      const demande = await creerDemande({
        categorie,
        sujet: sujet.trim(),
        message: message.trim(),
        reservationId,
      });
      vibrer.succes();
      navigation.replace('DemandeDetail', { demandeId: demande.id });
    } catch (e) {
      vibrer.erreur();
      setErreur(extraireMessage(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {reservationId && (
          <View style={styles.lienResa}>
            <Ionicons name="link-outline" size={14} color={COLORS.gray} />
            <Text style={styles.lienResaTexte} numberOfLines={1}>
              {t.support.liePourReservation(routeLabel ?? `#${reservationId}`)}
            </Text>
          </View>
        )}

        <Card style={styles.carte}>
          <Text style={styles.label}>{t.support.categorie}</Text>
          <PressableScale style={styles.champCategorie} onPress={() => setChoixCategorie(true)}>
            <Text style={categorie ? styles.champCategorieTexte : styles.champCategoriePlaceholder}>
              {categorie ? t.support.categories[categorie] : t.support.choisirCategorie}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.grayClair} />
          </PressableScale>

          <Field
            label={t.support.sujet}
            icone="chatbox-ellipses-outline"
            value={sujet}
            onChangeText={setSujet}
            placeholder={t.support.sujetPlaceholder}
            maxLength={150}
            returnKeyType="next"
          />

          <Field
            label={t.support.message}
            icone="document-text-outline"
            value={message}
            onChangeText={setMessage}
            placeholder={t.support.messagePlaceholder}
            maxLength={4000}
            multiline
            numberOfLines={5}
            style={styles.champMessage}
            erreur={erreur}
          />
        </Card>

        <Button
          titre={enCours ? t.support.envoiEnCours : t.support.envoyer}
          onPress={envoyer}
          chargement={enCours}
          style={styles.bouton}
        />
      </ScrollView>

      <BottomSheet
        visible={choixCategorie}
        titre={t.support.choisirCategorie}
        onClose={() => setChoixCategorie(false)}
      >
        {CATEGORIES.map((c) => (
          <PressableScale
            key={c}
            style={styles.optionCategorie}
            onPress={() => {
              setCategorie(c);
              setChoixCategorie(false);
            }}
          >
            <Text style={styles.optionCategorieTexte}>{t.support.categories[c]}</Text>
            {categorie === c && <Ionicons name="checkmark" size={18} color={COLORS.orange} />}
          </PressableScale>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { padding: SPACING.xl, paddingBottom: 32 },
  lienResa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORS.orangeWash,
    borderRadius: RADIUS.sm,
  },
  lienResaTexte: { fontSize: 12, color: COLORS.orangeSombre, fontWeight: '700', flexShrink: 1 },
  carte: { padding: 18, gap: 2 },
  label: { fontSize: 13, color: COLORS.gray, marginBottom: 6, fontWeight: '600' },
  champCategorie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 14,
    backgroundColor: COLORS.white,
  },
  champCategorieTexte: { fontSize: 15, color: COLORS.dark, fontWeight: '600' },
  champCategoriePlaceholder: { fontSize: 15, color: COLORS.grayClair },
  champMessage: { minHeight: 110, textAlignVertical: 'top', paddingTop: 10 },
  bouton: { marginTop: 20 },
  optionCategorie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionCategorieTexte: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
});
