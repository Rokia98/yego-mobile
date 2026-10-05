import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';
import { useAuth } from '../auth/AuthContext';
import { useLangue } from '../i18n';
import { extraireMessage } from '../api/erreurs';
import { vibrer } from '../haptics';
import { COLORS } from '../theme';

// Affiché à la place de tout le reste de l'app (AppNavigator) tant que le
// compte a un mot de passe temporaire (`motDePasseRequis` dans AuthContext —
// claim JWT `pwTmp`, ou 403 { code: 'MOT_DE_PASSE_A_CHANGER' } rencontré en
// cours de session). Concerne surtout les agents dont le compte a été créé
// par leur gestionnaire. Aucune navigation possible avant d'en choisir un
// nouveau — seule échappatoire : se déconnecter.
export default function MotDePasseObligatoireScreen() {
  const { changerMotDePasse, deconnexion } = useAuth();
  const { t } = useLangue();

  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setErreur(null);
    if (nouveauMotDePasse.length < 8) {
      setErreur(t.modifierProfil.motDePasseCourt);
      return;
    }
    if (nouveauMotDePasse !== confirmation) {
      setErreur(t.modifierProfil.motDePasseDifferents);
      return;
    }
    setEnCours(true);
    try {
      await changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
      vibrer.succes();
      // Pas d'Alert ici : la bascule vers l'app normale (AppNavigator) suffit.
    } catch (e) {
      vibrer.erreur();
      setErreur(extraireMessage(e));
    } finally {
      setEnCours(false);
    }
  }

  function confirmerDeconnexion() {
    Alert.alert(t.profil.deconnexionTitre, t.profil.deconnexionTexte, [
      { text: t.commun.annuler, style: 'cancel' },
      { text: t.profil.seDeconnecter, style: 'destructive', onPress: () => deconnexion() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Logo size={34} />
        <View style={styles.icone}>
          <Ionicons name="key-outline" size={28} color={COLORS.orange} />
        </View>
        <Text style={styles.titre}>{t.motDePasseObligatoire.titre}</Text>
        <Text style={styles.texte}>{t.motDePasseObligatoire.texte}</Text>

        <Card style={styles.carte}>
          <Field
            label={t.modifierProfil.motDePasseActuel}
            icone="lock-closed-outline"
            value={motDePasseActuel}
            onChangeText={setMotDePasseActuel}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
          />
          <Field
            label={t.modifierProfil.nouveauMotDePasse}
            icone="lock-closed-outline"
            value={nouveauMotDePasse}
            onChangeText={setNouveauMotDePasse}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
          />
          <Field
            label={t.modifierProfil.confirmerMotDePasse}
            icone="lock-closed-outline"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            erreur={erreur}
            returnKeyType="done"
            onSubmitEditing={valider}
          />
        </Card>

        <Button
          titre={enCours ? t.commun.enregistrementEnCours : t.motDePasseObligatoire.bouton}
          onPress={valider}
          chargement={enCours}
          style={styles.bouton}
        />
        <Button
          titre={t.profil.seDeconnecter}
          variante="fantome"
          pleineLargeur={false}
          onPress={confirmerDeconnexion}
          style={styles.boutonDeconnexion}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { flexGrow: 1, alignItems: 'center', padding: 32, paddingTop: 48, gap: 10 },
  icone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  titre: { fontSize: 19, fontWeight: '800', color: COLORS.dark, textAlign: 'center' },
  texte: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 10 },
  carte: { alignSelf: 'stretch', padding: 18, gap: 2 },
  bouton: { alignSelf: 'stretch', marginTop: 16 },
  boutonDeconnexion: { marginTop: 4 },
});
