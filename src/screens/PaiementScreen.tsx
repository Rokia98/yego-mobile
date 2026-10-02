import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, RADIUS, SPACING } from '../theme';
import Card from '../components/Card';
import Button from '../components/Button';
import Field from '../components/Field';
import FadeIn from '../components/FadeIn';
import PressableScale from '../components/PressableScale';
import LogoPaiement from '../components/LogoPaiement';
import {
  initierPaiement,
  attendrePaiement,
  verifierPaiement,
  verifierPaiementRepete,
  simulerPaiement,
  statutPaiement,
} from '../api/paiements';
import { extraireMessage } from '../api/erreurs';
import { onRetourPaiement } from '../api/events';
import { formatPrix } from '../format';
import { useLangue } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { useProfil } from '../auth/ProfilContext';
import {
  chiffresTelephone,
  estTelephonePayeurValide,
  formatTelephone,
  INDICATIF_TELEPHONE,
  telephonePourApi,
} from '../telephone';
import { vibrer } from '../haptics';
import type { MoyenPaiement, Paiement } from '../api/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paiement'>;

// Doit matcher `app.json` ("scheme": "yego") et APP_DEEP_LINK_PAIEMENT côté API
// (défaut déjà "yego://paiement" — voir GET /jeko/retour/succes|echec).
const LIEN_RETOUR_PAIEMENT = 'yego://paiement';

// null (pas encore su) tant qu'on n'a pas reçu de réponse d'initiation ou
// relu un paiement en cours — 'simulation' = ancien parcours (webhook/`/simuler`,
// toujours le cas quand Jèko n'est pas configuré côté API).
type ModeAttente = 'simulation' | 'redirection' | 'ussd' | null;

export default function PaiementScreen({ route, navigation }: Props) {
  const { t, locale } = useLangue();
  const { session } = useAuth();
  const { profil } = useProfil();
  const MOYENS: { id: MoyenPaiement; nom: string; detail: string }[] = (
    ['orange_money', 'mtn_money', 'moov_money', 'wave', 'djamo'] as const
  ).map((id) => ({ id, ...t.paiement.moyens[id] }));
  const { reservationId, nombrePlaces, montantEstime, sieges } = route.params;

  const [moyen, setMoyen] = useState<MoyenPaiement | null>(null);
  const [telephonePayeur, setTelephonePayeur] = useState(() =>
    chiffresTelephone((profil?.telephone ?? session?.telephone ?? '').replace(/^\+?225/, '')),
  );
  const [etat, setEtat] = useState<'chargement' | 'choix' | 'attente'>('chargement');
  const [modeAttente, setModeAttente] = useState<ModeAttente>(null);
  const [urlOperateur, setUrlOperateur] = useState<string | null>(null);
  const [verificationManuelle, setVerificationManuelle] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const signal = useRef({ annule: false });

  useEffect(() => {
    const courant = signal.current;
    return () => {
      courant.annule = true;
    };
  }, []);

  function demarrerDepuisPaiement(p: Paiement) {
    if (p.jekoReference) {
      setModeAttente(p.actionRequise === 'redirection' ? 'redirection' : 'ussd');
      setUrlOperateur(p.urlPaiement ?? null);
      setEtat('attente');
      suivreParVerification();
    } else {
      setModeAttente('simulation');
      setEtat('attente');
      suivrePaiement();
    }
  }

  // La réservation peut déjà porter un paiement (reprise depuis « Mes trajets »).
  useEffect(() => {
    let vivant = true;
    statutPaiement(reservationId)
      .then((p) => {
        if (!vivant) return;
        if (p.statut === 'paye') {
          navigation.replace('Ticket', { reservationId, nombrePlaces });
        } else if (p.statut === 'en_attente') {
          demarrerDepuisPaiement(p);
        } else {
          if (p.statut === 'echoue') setErreur(t.paiement.paiementPrecedentEchoue);
          setEtat('choix');
        }
      })
      .catch(() => {
        if (vivant) setEtat('choix'); // 404 = aucun paiement encore, cas normal
      });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retour depuis la page opérateur via deep link : vérification immédiate,
  // en plus du polling déjà en cours (filet de sécurité s'il est raté/indisponible).
  useEffect(
    () =>
      onRetourPaiement((idRetour) => {
        if (idRetour !== reservationId || signal.current.annule) return;
        verifierPaiement(reservationId)
          .then((p) => {
            if (signal.current.annule) return;
            if (p.statut === 'paye') {
              vibrer.succes();
              navigation.replace('Ticket', { reservationId, nombrePlaces });
            }
          })
          .catch(() => {});
      }),
    [reservationId, nombrePlaces, navigation],
  );

  // --- Parcours simulation (GET passif, webhook/`/simuler`) -------------------
  async function suivrePaiement() {
    setErreur(null);
    try {
      await attendrePaiement(reservationId, { signal: signal.current });
      vibrer.succes();
      navigation.replace('Ticket', { reservationId, nombrePlaces });
    } catch (e) {
      const m = (e as Error).message;
      if (m === 'paiement-annule') return;
      vibrer.erreur();
      setErreur(
        m === 'paiement-timeout'
          ? t.paiement.paiementNonConfirme
          : m === 'paiement-echoue'
            ? t.paiement.paiementEchoueReessayez
            : extraireMessage(e),
      );
      setEtat('choix');
    }
  }

  // --- Parcours Jèko (interroge réellement l'opérateur) -----------------------
  async function suivreParVerification() {
    setErreur(null);
    try {
      await verifierPaiementRepete(reservationId, { signal: signal.current });
      vibrer.succes();
      navigation.replace('Ticket', { reservationId, nombrePlaces });
    } catch (e) {
      const m = (e as Error).message;
      if (m === 'paiement-annule') return;
      if (m === 'paiement-timeout') return; // reste en attente, bouton "Vérifier maintenant"
      vibrer.erreur();
      setErreur(m === 'paiement-echoue' ? t.paiement.paiementEchoueReessayez : extraireMessage(e));
      setEtat('choix');
    }
  }

  async function verifierMaintenant() {
    setVerificationManuelle(true);
    try {
      const p = await verifierPaiement(reservationId);
      if (p.statut === 'paye') {
        vibrer.succes();
        navigation.replace('Ticket', { reservationId, nombrePlaces });
      } else if (p.statut === 'echoue') {
        vibrer.erreur();
        setErreur(t.paiement.paiementEchoueReessayez);
        setEtat('choix');
      }
      // sinon toujours en_attente : le polling de fond continue tout seul
    } catch (e) {
      setErreur(extraireMessage(e));
    } finally {
      setVerificationManuelle(false);
    }
  }

  async function ouvrirPageOperateur(url: string) {
    try {
      // openAuthSessionAsync (ASWebAuthenticationSession / Custom Tabs) ferme la
      // session toute seule dès que l'API relaie l'opérateur vers yego://paiement
      // (redirection 302 côté serveur — voir jeko/retour/succes|echec). On ignore
      // le contenu du retour (statut indicatif) : seul /verifier fait foi.
      await WebBrowser.openAuthSessionAsync(url, LIEN_RETOUR_PAIEMENT);
    } catch {
      // session indisponible : l'utilisateur peut rouvrir via le bouton
    }
    if (signal.current.annule) return;
    // Un retour de l'opérateur n'est pas une preuve de paiement, mais autant
    // vérifier tout de suite à la fermeture plutôt qu'attendre le prochain tick.
    verifierPaiement(reservationId)
      .then((p) => {
        if (!signal.current.annule && p.statut === 'paye') {
          vibrer.succes();
          navigation.replace('Ticket', { reservationId, nombrePlaces });
        }
      })
      .catch(() => {});
  }

  // DEV : force le résultat sans opérateur réel ; le polling en cours prend le relais.
  // N'a de sens qu'en simulation — indisponible côté API quand Jèko est actif.
  const [simulation, setSimulation] = useState(false);
  async function simuler(resultat: 'succes' | 'echec') {
    setSimulation(true);
    try {
      await simulerPaiement(reservationId, resultat);
    } catch (e) {
      setErreur(extraireMessage(e));
    } finally {
      setSimulation(false);
    }
  }

  async function payer() {
    if (!moyen) return;
    if (!estTelephonePayeurValide(telephonePayeur)) {
      setErreur(t.paiement.numeroPayeurInvalide);
      return;
    }
    setErreur(null);
    setEtat('attente');
    try {
      // POST /paiements est idempotent : réutilise le paiement existant
      // ('en_attente' ou 'echoue' relancé avec le même moyen+numéro), crée sinon.
      const reponse = await initierPaiement(reservationId, moyen, telephonePourApi(telephonePayeur));
      if (reponse.jekoReference) {
        const mode: ModeAttente = reponse.actionRequise === 'redirection' ? 'redirection' : 'ussd';
        setModeAttente(mode);
        setUrlOperateur(reponse.urlPaiement ?? null);
        if (mode === 'redirection' && reponse.urlPaiement) {
          ouvrirPageOperateur(reponse.urlPaiement);
        }
        suivreParVerification();
      } else {
        setModeAttente('simulation');
        suivrePaiement();
      }
    } catch (e) {
      vibrer.erreur();
      const statutHttp = (e as { response?: { status?: number } }).response?.status;
      setErreur(
        statutHttp === 502
          ? t.paiement.operateurRefuse
          : statutHttp === 503
            ? t.paiement.serviceIndisponible
            : extraireMessage(e),
      );
      setEtat('choix');
    }
  }

  const telephonePayeurAffiche = formatTelephone(telephonePayeur);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
        <Card style={styles.recap} ombre>
          <Text style={styles.recapLabel}>{t.paiement.montantAPayer}</Text>
          <Text style={styles.recapMontant}>{formatPrix(montantEstime, locale)}</Text>
          <View style={styles.recapMeta}>
            <View style={styles.recapChip}>
              <Ionicons name="person-outline" size={13} color={COLORS.gray} />
              <Text style={styles.recapChipTexte}>{t.commun.nPlaces(nombrePlaces)}</Text>
            </View>
            {sieges && sieges.length > 0 && (
              <View style={styles.recapChip}>
                <Ionicons name="bus-outline" size={13} color={COLORS.gray} />
                <Text style={styles.recapChipTexte}>
                  {t.commun.nSieges(sieges.length)} {sieges.join(', ')}
                </Text>
              </View>
            )}
            <View style={styles.recapChip}>
              <Ionicons name="pricetag-outline" size={13} color={COLORS.gray} />
              <Text style={styles.recapChipTexte}>{t.paiement.ref(reservationId)}</Text>
            </View>
          </View>
        </Card>

        {etat === 'chargement' ? (
          <ActivityIndicator color={COLORS.orange} style={{ marginTop: 40 }} />
        ) : etat === 'attente' ? (
          <FadeIn style={styles.attente}>
            <ActivityIndicator color={COLORS.orange} size="large" />
            <Text style={styles.attenteTexte}>
              {modeAttente === 'ussd'
                ? t.paiement.attenteUssd(telephonePayeurAffiche)
                : modeAttente === 'redirection'
                  ? t.paiement.attenteRedirection
                  : t.paiement.validezSurTelephone}
            </Text>

            {modeAttente === 'redirection' && urlOperateur && (
              <Button
                titre={t.paiement.ouvrirLaPage}
                variante="secondaire"
                pleineLargeur={false}
                onPress={() => ouvrirPageOperateur(urlOperateur)}
              />
            )}

            {modeAttente === 'simulation' ? (
              <Button
                titre={t.paiement.jaiDejaPaye}
                variante="secondaire"
                pleineLargeur={false}
                onPress={suivrePaiement}
              />
            ) : (
              <Button
                titre={verificationManuelle ? t.paiement.verificationEnCours : t.paiement.verifierMaintenant}
                variante="secondaire"
                pleineLargeur={false}
                chargement={verificationManuelle}
                onPress={verifierMaintenant}
              />
            )}

            {__DEV__ && modeAttente === 'simulation' && (
              <View style={styles.devBloc}>
                <Text style={styles.devLabel}>{t.paiement.simulationDev}</Text>
                <View style={styles.devBoutons}>
                  <Button
                    titre={t.paiement.paiementReussi}
                    taille="md"
                    chargement={simulation}
                    onPress={() => simuler('succes')}
                    style={styles.devBouton}
                  />
                  <Button
                    titre={t.paiement.echec}
                    taille="md"
                    variante="secondaire"
                    onPress={() => simuler('echec')}
                    style={styles.devBouton}
                  />
                </View>
              </View>
            )}
          </FadeIn>
        ) : (
          <>
            <Text style={styles.titre}>{t.paiement.moyenDePaiement}</Text>
            <Card style={styles.liste}>
              {MOYENS.map((m, i) => {
                const actif = moyen === m.id;
                return (
                  <PressableScale
                    key={m.id}
                    onPress={() => {
                      vibrer.selection();
                      setMoyen(m.id);
                    }}
                    echelle={0.99}
                    style={[
                      styles.moyen,
                      i > 0 && styles.moyenBordure,
                      actif && styles.moyenSelectionne,
                    ]}
                  >
                    <View style={styles.logoTuile}>
                      <LogoPaiement moyen={m.id} taille={34} />
                    </View>
                    <View style={styles.moyenCorps}>
                      <Text style={styles.moyenNom}>{m.nom}</Text>
                      <Text style={styles.moyenDetail}>{m.detail}</Text>
                    </View>
                    <View style={[styles.radio, actif && styles.radioPlein]}>
                      {actif && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                    </View>
                  </PressableScale>
                );
              })}
            </Card>

            {moyen && (
              <Field
                label={t.paiement.numeroQuiPaie}
                icone="call-outline"
                avant={<Text style={styles.indicatif}>{INDICATIF_TELEPHONE}</Text>}
                value={formatTelephone(telephonePayeur)}
                onChangeText={(txt) => setTelephonePayeur(chiffresTelephone(txt))}
                keyboardType="number-pad"
                maxLength={14}
                style={styles.champTelephone}
              />
            )}

            {erreur && (
              <View style={styles.erreurBloc}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={styles.erreur}>{erreur}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {etat === 'choix' && (
        <View style={styles.pied}>
          <Button
            titre={t.paiement.payer(formatPrix(montantEstime, locale))}
            icone="lock-closed"
            onPress={payer}
            desactive={!moyen}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contenu: { padding: SPACING.xl, paddingBottom: SPACING.xl },

  recap: { alignItems: 'center', marginBottom: 24, padding: 22 },
  recapLabel: { fontSize: 13, color: COLORS.gray },
  recapMontant: { fontSize: 30, fontWeight: '800', color: COLORS.dark, marginVertical: 6 },
  recapMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  recapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recapChipTexte: { fontSize: 12, color: COLORS.gray, fontWeight: '600' },

  titre: { fontSize: 16, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  liste: { padding: 0, overflow: 'hidden' },
  moyen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  moyenBordure: { borderTopWidth: 1, borderTopColor: COLORS.border },
  moyenSelectionne: { backgroundColor: COLORS.orangeWash },
  logoTuile: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moyenCorps: { flex: 1 },
  moyenNom: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  moyenDetail: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPlein: { borderColor: COLORS.orange, backgroundColor: COLORS.orange },

  indicatif: { fontSize: 15, fontWeight: '700', color: COLORS.gray },
  champTelephone: { marginTop: 16 },

  erreurBloc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#FCEBEA',
  },
  erreur: { color: COLORS.danger, fontSize: 13, flex: 1 },

  attente: { alignItems: 'center', paddingTop: 40, gap: 22 },
  attenteTexte: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  devBloc: {
    alignSelf: 'stretch',
    marginTop: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 10,
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.grayClair,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  devBoutons: { flexDirection: 'row', gap: 10 },
  devBouton: { flex: 1 },

  pied: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
