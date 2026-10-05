import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import PressableScale from '../components/PressableScale';
import BoutonRetour from '../components/BoutonRetour';
import { useAuth } from '../auth/AuthContext';
import { useProfil } from '../auth/ProfilContext';
import { useLangue } from '../i18n';
import { modifierProfil } from '../api/utilisateurs';
import { extraireMessage } from '../api/erreurs';
import { formatTelephoneAffichage } from '../telephone';
import { photoProfilPourApi } from '../photoProfil';
import { preferences } from '../storage';
import { vibrer } from '../haptics';
import { COLORS, SPACING } from '../theme';

export default function EditProfilScreen() {
  const { session, changerMotDePasse } = useAuth();
  const { profil, rafraichir } = useProfil();
  const { t } = useLangue();

  const [nom, setNom] = useState(profil?.nom ?? '');
  const [email, setEmail] = useState(profil?.email ?? '');
  const [photoLocale, setPhotoLocale] = useState<string | null>(null);
  const [chargementPhoto, setChargementPhoto] = useState(true);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Changement de mot de passe : flux séparé depuis 0.29.0 (PATCH /auth/mot-de-passe,
  // exige l'ancien mot de passe) — plus une simple case du formulaire profil.
  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);
  const [enCoursMotDePasse, setEnCoursMotDePasse] = useState(false);

  const telephone = formatTelephoneAffichage(profil?.telephone ?? session?.telephone);

  React.useEffect(() => {
    preferences.photoLocale().then((uri) => {
      setPhotoLocale(uri);
      setChargementPhoto(false);
    });
  }, []);

  // Le serveur fait foi une fois la photo synchronisée ; le cache local ne sert
  // que d'aperçu optimiste pendant l'envoi (ou de repli hors-ligne si l'envoi échoue).
  const photoAffichee = profil?.photoUrl ?? photoLocale ?? null;

  async function choisirPhoto(depuisCamera: boolean) {
    const permission = depuisCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('', t.modifierProfil.permissionRefusee);
      return;
    }

    const resultat = depuisCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });

    if (resultat.canceled || !resultat.assets?.[0]) return;
    const uri = resultat.assets[0].uri;

    // Aperçu immédiat pendant la compression + l'envoi.
    setPhotoLocale(uri);
    await preferences.definirPhotoLocale(uri);

    setEnvoiPhoto(true);
    try {
      const photoUrl = await photoProfilPourApi(uri);
      if (!session) throw new Error('no-session');
      await modifierProfil(session.utilisateurId, { photoUrl });
      await rafraichir();
      await preferences.effacerPhotoLocale(); // le serveur fait foi désormais
      setPhotoLocale(null);
      vibrer.succes();
    } catch (e) {
      vibrer.erreur();
      Alert.alert('', extraireMessage(e));
      // on garde l'aperçu local : la photo reste visible même si l'envoi a échoué
    } finally {
      setEnvoiPhoto(false);
    }
  }

  async function retirerPhoto() {
    setPhotoLocale(null);
    await preferences.effacerPhotoLocale();
    if (!profil?.photoUrl || !session) return; // rien à retirer côté serveur
    setEnvoiPhoto(true);
    try {
      await modifierProfil(session.utilisateurId, { photoUrl: null });
      await rafraichir();
      vibrer.succes();
    } catch (e) {
      vibrer.erreur();
      Alert.alert('', extraireMessage(e));
    } finally {
      setEnvoiPhoto(false);
    }
  }

  function ouvrirChoixPhoto() {
    Alert.alert(t.modifierProfil.changerPhoto, undefined, [
      { text: t.modifierProfil.prendrePhoto, onPress: () => choisirPhoto(true) },
      { text: t.modifierProfil.choisirGalerie, onPress: () => choisirPhoto(false) },
      ...(photoAffichee
        ? [{ text: t.modifierProfil.supprimerPhoto, style: 'destructive' as const, onPress: retirerPhoto }]
        : []),
      { text: t.commun.annuler, style: 'cancel' as const },
    ]);
  }

  async function enregistrer() {
    setErreur(null);
    const nomPropre = nom.trim();
    if (nomPropre.length < 2) {
      setErreur(t.modifierProfil.nomRequis);
      return;
    }
    const emailPropre = email.trim();
    if (emailPropre && !/^\S+@\S+\.\S+$/.test(emailPropre)) {
      setErreur(t.modifierProfil.emailInvalide);
      return;
    }

    setEnCours(true);
    try {
      if (!session) throw new Error('no-session');
      await modifierProfil(session.utilisateurId, {
        nom: nomPropre,
        email: emailPropre || undefined,
      });
      await rafraichir();
      vibrer.succes();
      Alert.alert(t.modifierProfil.succesTitre, t.modifierProfil.succesTexte);
    } catch (e) {
      vibrer.erreur();
      setErreur(extraireMessage(e));
    } finally {
      setEnCours(false);
    }
  }

  async function changerLeMotDePasse() {
    setErreurMotDePasse(null);
    if (nouveauMotDePasse.length < 8) {
      setErreurMotDePasse(t.modifierProfil.motDePasseCourt);
      return;
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreurMotDePasse(t.modifierProfil.motDePasseDifferents);
      return;
    }
    setEnCoursMotDePasse(true);
    try {
      await changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
      setMotDePasseActuel('');
      setNouveauMotDePasse('');
      setConfirmationMotDePasse('');
      vibrer.succes();
      Alert.alert(t.modifierProfil.motDePasseChangeTitre, t.modifierProfil.motDePasseChangeTexte);
    } catch (e) {
      vibrer.erreur();
      setErreurMotDePasse(extraireMessage(e));
    } finally {
      setEnCoursMotDePasse(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.entete}>
        <BoutonRetour />
        <Text style={styles.titre}>{t.modifierProfil.titre}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <View style={styles.photoZone}>
          <PressableScale onPress={ouvrirChoixPhoto} disabled={chargementPhoto || envoiPhoto}>
            <Avatar nom={nom || profil?.nom} photoUri={photoAffichee} taille={92} />
            {envoiPhoto ? (
              <View style={styles.voileEnvoi}>
                <ActivityIndicator color={COLORS.white} />
              </View>
            ) : (
              <View style={styles.badgeAppareil}>
                <Ionicons name="camera" size={15} color={COLORS.white} />
              </View>
            )}
          </PressableScale>
          <PressableScale onPress={ouvrirChoixPhoto} hitSlop={8} disabled={envoiPhoto}>
            <Text style={styles.lienPhoto}>{t.modifierProfil.changerPhoto}</Text>
          </PressableScale>
          {photoLocale && !profil?.photoUrl && (
            <Text style={styles.notePhoto}>{t.modifierProfil.photoLocaleNote}</Text>
          )}
        </View>

        <Card style={styles.carte}>
          <Field
            label={t.modifierProfil.nom}
            icone="person-outline"
            value={nom}
            onChangeText={setNom}
            autoCapitalize="words"
            placeholder={t.modifierProfil.nomPlaceholder}
            returnKeyType="next"
          />
          <Field
            label={t.modifierProfil.email}
            icone="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t.modifierProfil.emailPlaceholder}
            erreur={erreur}
            returnKeyType="next"
          />
          <Field
            label={t.modifierProfil.telephone}
            icone="call-outline"
            value={telephone}
            editable={false}
            style={styles.champDesactive}
          />
          <Text style={styles.noteTelephone}>{t.modifierProfil.telephoneNote}</Text>
        </Card>

        <Button
          titre={enCours ? t.commun.enregistrementEnCours : t.commun.enregistrer}
          onPress={enregistrer}
          chargement={enCours}
          style={styles.bouton}
        />

        <Text style={styles.titreSection}>{t.modifierProfil.motDePasseSection}</Text>
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
            value={confirmationMotDePasse}
            onChangeText={setConfirmationMotDePasse}
            secureTextEntry
            autoCapitalize="none"
            erreur={erreurMotDePasse}
            returnKeyType="done"
            onSubmitEditing={changerLeMotDePasse}
          />
        </Card>

        <Button
          titre={enCoursMotDePasse ? t.commun.enregistrementEnCours : t.modifierProfil.changerMotDePasseBouton}
          variante="secondaire"
          onPress={changerLeMotDePasse}
          chargement={enCoursMotDePasse}
          style={styles.bouton}
        />
      </ScrollView>
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
    paddingBottom: 4,
  },
  titre: { fontSize: 17, fontWeight: '800', color: COLORS.dark },
  contenu: { padding: SPACING.xl, paddingBottom: 40 },
  photoZone: { alignItems: 'center', gap: 8, marginBottom: 22 },
  badgeAppareil: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.orange,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voileEnvoi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(44,62,80,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lienPhoto: { color: COLORS.orange, fontWeight: '700', fontSize: 13, marginTop: 6 },
  notePhoto: { color: COLORS.grayClair, fontSize: 11, textAlign: 'center', maxWidth: 220 },
  carte: { padding: 18, gap: 2 },
  titreSection: { fontSize: 13, fontWeight: '700', color: COLORS.gray, marginTop: 28, marginBottom: 10 },
  champDesactive: { color: COLORS.grayClair },
  noteTelephone: { fontSize: 11, color: COLORS.grayClair, marginTop: -8, marginBottom: 14 },
  bouton: { marginTop: 20 },
});
