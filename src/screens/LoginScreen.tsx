import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import Logo from '../components/Logo';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';
import PressableScale from '../components/PressableScale';
import SelecteurLangue from '../components/SelecteurLangue';
import { useAuth } from '../auth/AuthContext';
import { useLangue } from '../i18n';
import { extraireMessage } from '../api/erreurs';
import { vibrer } from '../haptics';
import {
  chiffresTelephone,
  estTelephoneValide,
  formatTelephone,
  INDICATIF_TELEPHONE,
  telephonePourApi,
} from '../telephone';

export default function LoginScreen() {
  const { connexion, inscription } = useAuth();
  const { t } = useLangue();
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const inscriptionMode = mode === 'inscription';

  async function valider() {
    setErreur(null);
    if (!estTelephoneValide(telephone)) {
      setErreur(t.login.telephoneInvalide);
      return;
    }
    const tel = telephonePourApi(telephone);
    setEnCours(true);
    try {
      if (inscriptionMode) {
        await inscription(nom.trim(), tel, motDePasse);
      } else {
        await connexion(tel, motDePasse);
      }
      vibrer.succes();
    } catch (e) {
      vibrer.erreur();
      setErreur(extraireMessage(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.contenu}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Logo size={40} />
            <SelecteurLangue compact />
          </View>

          <Text style={styles.titre}>
            {inscriptionMode ? t.login.titreInscription : t.login.titreConnexion}
          </Text>
          <Text style={styles.sousTitre}>
            {inscriptionMode ? t.login.sousTitreInscription : t.login.sousTitreConnexion}
          </Text>

          <Card style={styles.card} ombre>
            {inscriptionMode && (
              <Field
                label={t.login.nomComplet}
                icone="person-outline"
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
                placeholder={t.login.nomPlaceholder}
                returnKeyType="next"
              />
            )}

            <Field
              label={t.login.telephone}
              icone="call-outline"
              avant={<Text style={styles.indicatif}>{INDICATIF_TELEPHONE}</Text>}
              value={formatTelephone(telephone)}
              onChangeText={(txt) => setTelephone(chiffresTelephone(txt))}
              keyboardType="number-pad"
              placeholder="07 01 23 45 67"
              maxLength={14}
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoCapitalize="none"
              returnKeyType="next"
            />

            <Field
              label={t.login.motDePasse}
              icone="lock-closed-outline"
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry={!visible}
              placeholder={t.login.motDePassePlaceholder}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={valider}
              erreur={erreur}
              apres={
                <PressableScale onPress={() => setVisible((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={visible ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={COLORS.gray}
                  />
                </PressableScale>
              }
            />

            <Button
              titre={inscriptionMode ? t.login.boutonInscription : t.login.boutonConnexion}
              onPress={valider}
              chargement={enCours}
              style={styles.bouton}
            />
          </Card>

          <PressableScale
            style={styles.bascule}
            hitSlop={10}
            onPress={() => {
              setErreur(null);
              setMode(inscriptionMode ? 'connexion' : 'inscription');
            }}
          >
            <Text style={styles.basculeTexte}>
              {inscriptionMode ? t.login.dejaCompte : t.login.pasDeCompte}{' '}
              <Text style={styles.basculeFort}>
                {inscriptionMode ? t.login.boutonConnexion : t.login.boutonInscription}
              </Text>
            </Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  contenu: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 24,
  },
  titre: { fontSize: 26, fontWeight: '800', color: COLORS.dark },
  sousTitre: { fontSize: 14, color: COLORS.gray, marginTop: 4, marginBottom: 22 },
  card: { padding: 18, gap: 2 },
  bouton: { marginTop: 8 },
  indicatif: { fontSize: 15, fontWeight: '700', color: COLORS.gray },
  bascule: { marginTop: 22, alignItems: 'center' },
  basculeTexte: { color: COLORS.gray, fontSize: 14 },
  basculeFort: { color: COLORS.orange, fontWeight: '700' },
});
