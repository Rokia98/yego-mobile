import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, RADIUS, SPACING } from '../theme';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import SelecteurLangue from '../components/SelecteurLangue';
import { useAuth } from '../auth/AuthContext';
import { useProfil } from '../auth/ProfilContext';
import { useLangue } from '../i18n';
import { formatTelephoneAffichage } from '../telephone';
import { preferences } from '../storage';
import { compteursSupport } from '../api/support';
import type { Role } from '../api/types';

function moisAnnee(iso: string | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const s = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfilScreen() {
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const insets = useSafeAreaInsets();
  const { session, deconnexion } = useAuth();
  const { profil } = useProfil();
  const { t, locale } = useLangue();
  const [photoLocale, setPhotoLocale] = useState<string | null>(null);
  const [demandesActives, setDemandesActives] = useState(0);

  useEffect(() => {
    preferences.photoLocale().then(setPhotoLocale);
  }, []);

  const nom = profil?.nom ?? t.roles.user;
  const telephone = formatTelephoneAffichage(profil?.telephone ?? session?.telephone);
  const email = profil?.email ?? null;
  const role: Role = profil?.role ?? session?.role ?? 'user';
  const estAgent = role === 'agent';

  useEffect(() => {
    if (estAgent) return;
    compteursSupport()
      .then((c) => setDemandesActives(c.ouverte + c.en_cours))
      .catch(() => {}); // badge non bloquant
  }, [estAgent]);
  const version = Constants.expoConfig?.version ?? '0.1.0';
  const photoUri = profil?.photoUrl ?? photoLocale ?? null;

  function confirmerDeconnexion() {
    Alert.alert(t.profil.deconnexionTitre, t.profil.deconnexionTexte, [
      { text: t.commun.annuler, style: 'cancel' },
      { text: t.profil.seDeconnecter, style: 'destructive', onPress: () => deconnexion() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <View style={[styles.bande, { paddingTop: insets.top + 14 }]}>
          <PressableScale
            onPress={() => navigation.navigate('Notifications')}
            haptique
            style={styles.cloche}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
          </PressableScale>

          <PressableScale onPress={() => navigation.navigate('ModifierProfil')}>
            <View style={styles.avatarRing}>
              <Avatar nom={nom} photoUri={photoUri} taille={78} ton="sombre" />
              <View style={styles.badgeCrayon}>
                <Ionicons name="pencil" size={12} color={COLORS.white} />
              </View>
            </View>
          </PressableScale>
          <Text style={styles.nom} numberOfLines={1}>
            {nom}
          </Text>
          <Text style={styles.tel}>{telephone}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={estAgent ? 'briefcase' : 'person'}
              size={12}
              color={COLORS.white}
            />
            <Text style={styles.roleTexte}>{t.roles[role]}</Text>
          </View>
        </View>

        <View style={styles.corps}>
          <FadeIn delai={40}>
            <Card style={styles.menu}>
              <Rangee
                icone="create-outline"
                texte={t.profil.modifierProfil}
                onPress={() => navigation.navigate('ModifierProfil')}
              />
            </Card>
          </FadeIn>

          <FadeIn delai={60}>
            <Text style={styles.sectionTitre}>{t.profil.informations}</Text>
            <Card style={styles.infoCard}>
              <Info icone="call-outline" label={t.profil.telephone} valeur={telephone} />
              <View style={styles.sepInfo} />
              <Info
                icone="mail-outline"
                label={t.profil.email}
                valeur={email ?? t.profil.nonRenseigne}
                estompe={!email}
              />
              <View style={styles.sepInfo} />
              <Info icone="ribbon-outline" label={t.profil.role} valeur={t.roles[role]} />
              <View style={styles.sepInfo} />
              <Info
                icone="calendar-outline"
                label={t.profil.membreDepuis}
                valeur={moisAnnee(profil?.dateCreation, locale)}
              />
            </Card>
          </FadeIn>

          {!estAgent && (
            <FadeIn delai={110}>
              <Text style={styles.sectionTitre}>{t.profil.mesVoyages}</Text>
              <Card style={styles.menu}>
                <Rangee icone="bus-outline" texte={t.profil.mesTrajets} onPress={() => navigation.navigate('MesTrajets')} />
                <View style={styles.sep} />
                <Rangee icone="ticket-outline" texte={t.profil.mesBillets} onPress={() => navigation.navigate('Tickets')} />
              </Card>
            </FadeIn>
          )}

          <FadeIn delai={140}>
            <Text style={styles.sectionTitre}>{t.profil.langue}</Text>
            <Card style={styles.langueCard}>
              <SelecteurLangue />
            </Card>
          </FadeIn>

          <FadeIn delai={160}>
            <Text style={styles.sectionTitre}>{t.profil.assistance}</Text>
            <Card style={styles.menu}>
              <Rangee
                icone="notifications-outline"
                texte={t.profil.notifications}
                onPress={() => navigation.navigate('Notifications')}
              />
              {!estAgent && (
                <>
                  <View style={styles.sep} />
                  <Rangee
                    icone="chatbubbles-outline"
                    texte={t.support.titreListe}
                    badge={demandesActives}
                    onPress={() => navigation.navigate('Support')}
                  />
                </>
              )}
              <View style={styles.sep} />
              <Rangee
                icone="help-circle-outline"
                texte={t.profil.aide}
                onPress={() => Alert.alert(t.profil.aide, t.profil.aideTexte)}
              />
              <View style={styles.sep} />
              <Rangee
                icone="information-circle-outline"
                texte={t.profil.aPropos}
                onPress={() => Alert.alert('Yègo', t.profil.aProposTexte(version))}
              />
            </Card>
          </FadeIn>

          <FadeIn delai={210}>
            <Button
              titre={t.profil.seDeconnecter}
              icone="log-out-outline"
              variante="secondaire"
              onPress={confirmerDeconnexion}
              style={styles.deconnexion}
            />
            <Text style={styles.version}>{t.profil.version(version)}</Text>
          </FadeIn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({
  icone,
  label,
  valeur,
  estompe,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  label: string;
  valeur: string;
  estompe?: boolean;
}) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcone}>
        <Ionicons name={icone} size={16} color={COLORS.orange} />
      </View>
      <View style={styles.infoCorps}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValeur, estompe && styles.infoEstompe]} numberOfLines={1}>
          {valeur}
        </Text>
      </View>
    </View>
  );
}

function Rangee({
  icone,
  texte,
  badge,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  texte: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.rangee} onPress={onPress} echelle={0.98}>
      <View style={styles.rangeeIcone}>
        <Ionicons name={icone} size={18} color={COLORS.dark} />
      </View>
      <Text style={styles.rangeeTexte}>{texte}</Text>
      {!!badge && (
        <View style={styles.rangeeBadge}>
          <Text style={styles.rangeeBadgeTexte}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={COLORS.grayClair} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { paddingBottom: 36 },

  bande: {
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  cloche: {
    position: 'absolute',
    right: 16,
    top: 0,
    marginTop: 14,
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  badgeCrayon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: { fontSize: 21, fontWeight: '800', color: COLORS.white, marginTop: 12 },
  tel: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  roleTexte: { fontSize: 12, fontWeight: '800', color: COLORS.white },

  corps: { paddingHorizontal: SPACING.xl, marginTop: 20 },
  sectionTitre: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
  },

  infoCard: { padding: 4 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  infoIcone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCorps: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValeur: { fontSize: 15, fontWeight: '700', color: COLORS.dark, marginTop: 2 },
  infoEstompe: { color: COLORS.grayClair, fontWeight: '600' },
  sepInfo: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },

  menu: { padding: 4 },
  rangee: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13 },
  rangeeIcone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeeTexte: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.dark },
  rangeeBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  rangeeBadgeTexte: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  sep: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },

  langueCard: { padding: 4 },

  deconnexion: { marginTop: 24 },
  version: { textAlign: 'center', color: COLORS.grayClair, fontSize: 12, marginTop: 16 },
});
