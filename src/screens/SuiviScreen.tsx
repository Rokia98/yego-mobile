import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AxiosError } from 'axios';
import type { StackScreenProps } from '../navigation/types';
import { COLORS, RADIUS, SHADOW } from '../theme';
import BoutonRetour from '../components/BoutonRetour';
import CarteVehicule, { type Coord } from '../components/CarteVehicule';
import PulseDot from '../components/PulseDot';
import { suiviDepart, suiviHistorique } from '../api/departs';
import { extraireMessage } from '../api/erreurs';
import { arreterNotificationSuivi, majNotificationSuivi } from '../notifications/suiviLive';
import { formatHeure, formatRelatif, type Locale } from '../format';
import { useLangue } from '../i18n';
import type { Dictionnaire } from '../i18n/dictionnaires';
import type { PointSuivi, SuiviDepart } from '../api/types';

type Props = StackScreenProps<'Suivi'>;

const INTERVALLE_MS = 12_000;

const versCoord = (p: { latitude: number; longitude: number }): Coord => ({
  latitude: p.latitude,
  longitude: p.longitude,
});

export default function SuiviScreen({ route }: Props) {
  const { t, locale } = useLangue();
  const { departId, route: libelle } = route.params;

  const [suivi, setSuivi] = useState<SuiviDepart | null>(null);
  const [trace, setTrace] = useState<PointSuivi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const dernierMesureA = useRef<string | null>(null);

  const chargerTrace = useCallback(async () => {
    const curseur = dernierMesureA.current;
    try {
      const points = await suiviHistorique(departId, {
        depuis: curseur ?? undefined,
        limite: 500,
      });
      // `?depuis` est une borne `gte` : on écarte le point pivot déjà connu.
      const nouveaux = curseur ? points.filter((p) => p.mesureA > curseur) : points;
      if (nouveaux.length === 0) return;
      dernierMesureA.current = nouveaux[nouveaux.length - 1].mesureA;
      setTrace((prev) => (curseur && prev.length ? [...prev, ...nouveaux] : nouveaux));
    } catch {
      // trace non bloquante
    }
  }, [departId]);

  const charger = useCallback(
    async (initial: boolean) => {
      try {
        const s = await suiviDepart(departId);
        setSuivi(s);
        setErreur(null);
        if (initial || s.statut === 'en_route' || s.statut === 'arrive') {
          await chargerTrace();
        }
      } catch (e) {
        const statut = (e as AxiosError).response?.status;
        setErreur(
          statut === 403
            ? extraireMessage(e) // message serveur, reste en français (voir limitations i18n)
            : statut === 404
              ? t.suivi.departIntrouvable
              : extraireMessage(e),
        );
      } finally {
        if (initial) setChargement(false);
      }
    },
    [departId, chargerTrace, t],
  );

  useEffect(() => {
    charger(true);
  }, [charger]);

  // Polling tant que le véhicule roule.
  useEffect(() => {
    if (suivi?.statut !== 'en_route') return;
    const id = setInterval(() => charger(false), INTERVALLE_MS);
    return () => clearInterval(id);
  }, [suivi?.statut, charger]);

  // Notification persistante « trajet en cours » : visible quand l'utilisateur
  // quitte l'app pendant qu'il suit le véhicule. Retirée à l'arrivée ou en
  // quittant l'écran (l'utilisateur est alors de retour dans l'app).
  useEffect(() => {
    if (!suivi) return;
    if (suivi.statut === 'en_route') {
      const d = suivi.derniere;
      const ligne =
        d && !d.fraiche
          ? t.suivi.signalPerduDetail(formatRelatif(d.mesureA, locale))
          : suivi.eta
            ? t.suivi.notifLibelleEnRoute(formatHeure(suivi.eta.arriveeEstimee, locale), Math.round(suivi.eta.distanceKm))
            : t.suivi.enRoute;
      majNotificationSuivi({
        titre: t.suivi.notifTitre(libelle ?? t.suivi.trajetParDefaut),
        departId,
        ligne,
        nomCanal: t.suivi.canalNotification,
      });
    } else {
      arreterNotificationSuivi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suivi, libelle, departId, locale]);

  useEffect(() => () => void arreterNotificationSuivi(), []);

  const vehicule = suivi?.derniere ? versCoord(suivi.derniere) : null;
  const destination = suivi?.destination ? versCoord(suivi.destination) : null;

  return (
    <View style={styles.container}>
      <CarteVehicule
        vehicule={vehicule}
        cap={suivi?.derniere?.cap ?? null}
        fraiche={suivi?.derniere?.fraiche ?? true}
        destination={destination}
        trace={trace.map(versCoord)}
        paddingBas={260}
      />

      <SafeAreaView style={styles.hautZone} edges={['top']} pointerEvents="box-none">
        <View style={styles.retour}>
          <BoutonRetour ton="sombre" />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.basZone} edges={['bottom']} pointerEvents="box-none">
        <View style={styles.fiche}>
          {chargement ? (
            <View style={styles.centre}>
              <ActivityIndicator color={COLORS.orange} />
              <Text style={styles.sous}>{t.suivi.chargementSuivi}</Text>
            </View>
          ) : erreur ? (
            <View style={styles.centre}>
              <Ionicons name="alert-circle-outline" size={26} color={COLORS.danger} />
              <Text style={styles.erreur}>{erreur}</Text>
            </View>
          ) : (
            <ContenuFiche suivi={suivi} libelle={libelle} t={t} locale={locale} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function ContenuFiche({
  suivi,
  libelle,
  t,
  locale,
}: {
  suivi: SuiviDepart | null;
  libelle?: string;
  t: Dictionnaire;
  locale: Locale;
}) {
  if (!suivi) return null;
  const { statut, derniere, eta, retard, destination } = suivi;

  const enRoute = statut === 'en_route';
  const signalPerdu = enRoute && derniere != null && !derniere.fraiche;
  const enDirect = enRoute && derniere != null && derniere.fraiche;

  const titre = signalPerdu
    ? t.suivi.signalPerdu
    : statut === 'planifie'
      ? t.suivi.pasEncoreParti
      : statut === 'arrive'
        ? t.suivi.arriveDestination
        : statut === 'annule'
          ? t.suivi.departAnnule
          : t.suivi.enRoute;

  const icone =
    statut === 'arrive'
      ? 'flag'
      : statut === 'planifie'
        ? 'time-outline'
        : signalPerdu
          ? 'cloud-offline-outline'
          : 'navigate';

  return (
    <>
      <View style={styles.ficheHaut}>
        <View
          style={[
            styles.ficheIcone,
            retard && styles.ficheIconeRetard,
            signalPerdu && styles.ficheIconeGris,
          ]}
        >
          <Ionicons
            name={icone}
            size={18}
            color={retard ? COLORS.danger : signalPerdu ? COLORS.gray : COLORS.orange}
          />
        </View>
        <View style={styles.ficheTitreZone}>
          <Text style={styles.titre} numberOfLines={1}>
            {titre}
          </Text>
          {libelle ? (
            <Text style={styles.sous} numberOfLines={1}>
              {libelle}
            </Text>
          ) : null}
        </View>
        {enDirect && (
          <View style={styles.chipDirect}>
            <PulseDot couleur={COLORS.green} taille={6} />
            <Text style={styles.chipDirectTexte}>{t.suivi.enDirect}</Text>
          </View>
        )}
        {signalPerdu && (
          <View style={[styles.chipDirect, styles.chipGris]}>
            <Text style={[styles.chipDirectTexte, { color: COLORS.gray }]}>{t.suivi.horsLigne}</Text>
          </View>
        )}
      </View>

      {enRoute && eta && (
        <View style={styles.stats}>
          <Stat valeur={`${eta.minutesRestantes}`} unite="min" label={t.suivi.tempsRestant} fort />
          <View style={styles.statSep} />
          <Stat valeur={formatHeure(eta.arriveeEstimee, locale)} label={t.suivi.arriveePrevue} />
          <View style={styles.statSep} />
          <Stat valeur={`${Math.round(eta.distanceKm)}`} unite="km" label={t.suivi.distance} />
        </View>
      )}

      {retard && eta ? (
        <View style={styles.bandeauRetard}>
          <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
          <Text style={styles.bandeauRetardTexte}>{t.suivi.retardEstime(eta.retardMinutes)}</Text>
        </View>
      ) : null}

      {statut === 'planifie' ? (
        <Text style={styles.sous}>{t.suivi.suiviDemarrera(destination?.ville)}</Text>
      ) : null}

      {enRoute && derniere ? (
        <View style={styles.detailLive}>
          <Ionicons name={derniere.fraiche ? 'bus' : 'cloud-offline-outline'} size={13} color={COLORS.gray} />
          <Text style={styles.detailLiveTexte} numberOfLines={1}>
            {derniere.vitesse != null && derniere.fraiche
              ? `${Math.round(derniere.vitesse)} km/h · `
              : ''}
            {derniere.fraiche
              ? t.suivi.positionAJour(formatRelatif(derniere.mesureA, locale))
              : t.suivi.dernierePosition(formatRelatif(derniere.mesureA, locale))}
          </Text>
        </View>
      ) : null}

      {statut === 'arrive' ? <Text style={styles.sous}>{t.suivi.arriveeMerci}</Text> : null}
    </>
  );
}

function Stat({
  valeur,
  unite,
  label,
  fort,
}: {
  valeur: string;
  unite?: string;
  label: string;
  fort?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={[styles.statValeur, fort && styles.statValeurFort]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {valeur}
        {unite ? <Text style={styles.statUnite}> {unite}</Text> : null}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hautZone: { position: 'absolute', top: 0, left: 0, right: 0 },
  retour: { padding: 12 },
  basZone: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fiche: {
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    ...SHADOW,
  },
  centre: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  ficheHaut: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ficheTitreZone: { flex: 1, gap: 1 },
  ficheIcone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.orangeWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ficheIconeRetard: { backgroundColor: '#FCEBEA' },
  ficheIconeGris: { backgroundColor: COLORS.background },
  titre: { fontSize: 17, fontWeight: '800', color: COLORS.dark },
  sous: { fontSize: 13, color: COLORS.gray, lineHeight: 18 },
  erreur: { fontSize: 14, color: COLORS.danger, textAlign: 'center', fontWeight: '600' },

  chipDirect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.greenWash,
    borderRadius: RADIUS.pill,
    paddingLeft: 5,
    paddingRight: 9,
    paddingVertical: 4,
  },
  chipGris: { backgroundColor: COLORS.background },
  chipDirectTexte: { fontSize: 10.5, fontWeight: '800', color: COLORS.green, letterSpacing: 0.4 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  statSep: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: COLORS.border, marginVertical: 6 },
  statValeur: { fontSize: 17, fontWeight: '800', color: COLORS.dark },
  statValeurFort: { fontSize: 22, color: COLORS.orange },
  statUnite: { fontSize: 12, fontWeight: '700', color: COLORS.gray },
  statLabel: { fontSize: 10.5, color: COLORS.grayClair, textAlign: 'center' },

  bandeauRetard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FCEBEA',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bandeauRetardTexte: { fontSize: 12.5, color: COLORS.danger, fontWeight: '700' },

  detailLive: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLiveTexte: { fontSize: 12, color: COLORS.gray, flex: 1 },
});
